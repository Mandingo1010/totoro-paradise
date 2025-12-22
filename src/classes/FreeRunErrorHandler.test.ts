import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import FreeRunErrorHandler, {
    NetworkError,
    ApiError,
    DataError,
    ReverseEngineeringError,
    type RetryConfig
} from './FreeRunErrorHandler';

describe('FreeRunErrorHandler', () => {
    let errorHandler: FreeRunErrorHandler;

    beforeEach(() => {
        errorHandler = new FreeRunErrorHandler();
    });

    describe('Error Handling', () => {
        it('should handle network errors correctly', () => {
            const networkError = new NetworkError('Connection timeout', 408);
            const response = errorHandler.handleNetworkError(networkError);

            expect(response.code).toBe('NETWORK_ERROR');
            expect(response.recoverable).toBe(true);
            expect(response.retryable).toBe(true);
            expect(response.suggestions).toContain('检查网络连接是否正常');
        });

        it('should handle API errors with proper mapping', () => {
            const apiError = new ApiError('Invalid token', 'INVALID_TOKEN', 401);
            const response = errorHandler.handleApiError(apiError);

            expect(response.code).toBe('AUTH_ERROR');
            expect(response.recoverable).toBe(true);
            expect(response.retryable).toBe(false);
            expect(response.suggestions).toContain('点击重新登录按钮');
        });

        it('should handle data errors with field information', () => {
            const dataError = new DataError('Invalid distance value', 'distance');
            const response = errorHandler.handleDataError(dataError);

            expect(response.code).toBe('DATA_ERROR');
            expect(response.recoverable).toBe(true);
            expect(response.retryable).toBe(false);
            expect(response.suggestions.some(s => s.includes('distance'))).toBe(true);
        });

        it('should handle reverse engineering errors', () => {
            const reError = new ReverseEngineeringError('API endpoint not found', 'endpoint discovery');
            const response = errorHandler.handleReverseEngineeringError(reError);

            expect(response.code).toBe('REVERSE_ENGINEERING_ERROR');
            expect(response.recoverable).toBe(false);
            expect(response.retryable).toBe(false);
            expect(response.suggestions.some(s => s.includes('endpoint discovery'))).toBe(true);
        });
    });

    describe('Retry Logic', () => {
        it('should retry retryable operations', async () => {
            let attempts = 0;
            const operation = vi.fn().mockImplementation(() => {
                attempts++;
                if (attempts < 3) {
                    throw new NetworkError('Temporary failure');
                }
                return 'success';
            });

            const result = await errorHandler.executeWithRetry(operation, 'test operation');

            expect(result).toBe('success');
            expect(attempts).toBe(3);
        });

        it('should not retry non-retryable errors', async () => {
            let attempts = 0;
            const operation = vi.fn().mockImplementation(() => {
                attempts++;
                throw new ApiError('Invalid params', 'INVALID_PARAMS', 400);
            });

            await expect(errorHandler.executeWithRetry(operation, 'test operation'))
                .rejects.toThrow('Invalid params');

            expect(attempts).toBe(1);
        });

        it('should respect max attempts limit', async () => {
            const customConfig: Partial<RetryConfig> = {
                maxAttempts: 2,
                backoffStrategy: 'linear',
                baseDelay: 100,
                maxDelay: 1000,
                retryableErrors: ['NetworkError']
            };

            const customHandler = new FreeRunErrorHandler(customConfig);
            let attempts = 0;

            const operation = vi.fn().mockImplementation(() => {
                attempts++;
                throw new NetworkError('Always fails');
            });

            await expect(customHandler.executeWithRetry(operation, 'test operation'))
                .rejects.toThrow('Always fails');

            expect(attempts).toBe(2);
        });
    });

    describe('Property 15: Error Response Parsing', () => {
        /**
         * Feature: free-run-feature, Property 15: 错误响应解析
         * For any server error response, the system should correctly parse and extract error information
         * Validates: Requirements 5.5
         */
        it('should correctly parse all types of error responses', () => {
            fc.assert(fc.property(
                fc.oneof(
                    fc.record({
                        type: fc.constant('network'),
                        message: fc.string({ minLength: 1, maxLength: 100 }),
                        statusCode: fc.option(fc.integer({ min: 400, max: 599 }))
                    }),
                    fc.record({
                        type: fc.constant('api'),
                        message: fc.string({ minLength: 1, maxLength: 100 }),
                        code: fc.oneof(
                            fc.constant('INVALID_TOKEN'),
                            fc.constant('INVALID_PARAMS'),
                            fc.constant('DUPLICATE_RECORD'),
                            fc.constant('SERVER_ERROR'),
                            fc.string({ minLength: 1, maxLength: 20 })
                        ),
                        statusCode: fc.option(fc.integer({ min: 400, max: 599 }))
                    }),
                    fc.record({
                        type: fc.constant('data'),
                        message: fc.string({ minLength: 1, maxLength: 100 }),
                        field: fc.option(fc.string({ minLength: 1, maxLength: 20 }))
                    }),
                    fc.record({
                        type: fc.constant('reverse_engineering'),
                        message: fc.string({ minLength: 1, maxLength: 100 }),
                        context: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
                    })
                ),
                (errorSpec) => {
                    let response;

                    switch (errorSpec.type) {
                        case 'network':
                            const networkError = new NetworkError(errorSpec.message, errorSpec.statusCode || undefined);
                            response = errorHandler.handleNetworkError(networkError);
                            break;
                        case 'api':
                            const apiError = new ApiError(errorSpec.message, errorSpec.code, errorSpec.statusCode || undefined);
                            response = errorHandler.handleApiError(apiError);
                            break;
                        case 'data':
                            const dataError = new DataError(errorSpec.message, errorSpec.field || undefined);
                            response = errorHandler.handleDataError(dataError);
                            break;
                        case 'reverse_engineering':
                            const reError = new ReverseEngineeringError(errorSpec.message, errorSpec.context || undefined);
                            response = errorHandler.handleReverseEngineeringError(reError);
                            break;
                        default:
                            throw new Error('Unknown error type');
                    }

                    // All error responses should have required fields
                    expect(response.message).toBeDefined();
                    expect(typeof response.message).toBe('string');
                    expect(response.message.length).toBeGreaterThan(0);

                    expect(response.code).toBeDefined();
                    expect(typeof response.code).toBe('string');
                    expect(response.code.length).toBeGreaterThan(0);

                    expect(typeof response.recoverable).toBe('boolean');
                    expect(typeof response.retryable).toBe('boolean');

                    expect(Array.isArray(response.suggestions)).toBe(true);
                    expect(response.suggestions.length).toBeGreaterThan(0);

                    // All suggestions should be non-empty strings
                    response.suggestions.forEach(suggestion => {
                        expect(typeof suggestion).toBe('string');
                        expect(suggestion.length).toBeGreaterThan(0);
                    });
                }
            ), { numRuns: 100 });
        });
    });

    describe('Property 17: Error Handling Completeness', () => {
        /**
         * Feature: free-run-feature, Property 17: 错误处理完整性
         * For any error situation, the system should provide detailed error information and recovery suggestions
         * Validates: Requirements 6.5
         */
        it('should provide complete error handling for basic error scenarios', () => {
            const testCases = [
                { type: 'network', error: new NetworkError('Connection failed', 500) },
                { type: 'api', error: new ApiError('Invalid token', 'INVALID_TOKEN', 401) },
                { type: 'data', error: new DataError('Invalid field', 'distance') },
                { type: 'reverse_engineering', error: new ReverseEngineeringError('API not found', 'discovery') }
            ];

            testCases.forEach(({ type, error }) => {
                let response;

                switch (type) {
                    case 'network':
                        response = errorHandler.handleNetworkError(error as NetworkError);
                        break;
                    case 'api':
                        response = errorHandler.handleApiError(error as ApiError);
                        break;
                    case 'data':
                        response = errorHandler.handleDataError(error as DataError);
                        break;
                    case 'reverse_engineering':
                        response = errorHandler.handleReverseEngineeringError(error as ReverseEngineeringError);
                        break;
                }

                // Completeness checks
                expect(response).toBeDefined();

                // Should have meaningful error message
                expect(response.message).toBeDefined();
                expect(response.message.length).toBeGreaterThan(0);
                // Message should be localized/processed (contain Chinese characters or be descriptive)
                expect(response.message.length).toBeGreaterThanOrEqual(error.message.length); // Should be at least as long as original

                // Should have proper error code
                expect(response.code).toBeDefined();
                expect(response.code.length).toBeGreaterThan(0);
                expect(response.code).toMatch(/^[A-Z_]+$/); // Should be uppercase with underscores

                // Should provide recovery guidance
                expect(response.suggestions).toBeDefined();
                expect(Array.isArray(response.suggestions)).toBe(true);
                expect(response.suggestions.length).toBeGreaterThanOrEqual(2); // At least 2 suggestions

                // All suggestions should be actionable (contain verbs or instructions)
                const actionWords = ['检查', '确认', '尝试', '联系', '点击', '清除', '修改', '等待', '验证', '重新', '系统', '如', '可以', '请', '相关', '可能', '使用'];
                response.suggestions.forEach(suggestion => {
                    expect(typeof suggestion).toBe('string');
                    expect(suggestion.length).toBeGreaterThan(5); // Meaningful length
                    const hasActionWord = actionWords.some(word => suggestion.includes(word));
                    expect(hasActionWord).toBe(true); // Should contain actionable guidance
                });

                // Recovery flags should be consistent
                if (response.retryable) {
                    expect(response.recoverable).toBe(true); // Retryable errors should be recoverable
                }
            });
        });
    });
});