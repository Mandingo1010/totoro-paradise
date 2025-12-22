export interface ErrorResponse {
    message: string;
    code: string;
    recoverable: boolean;
    retryable: boolean;
    suggestions: string[];
}

export interface RetryConfig {
    maxAttempts: number;
    backoffStrategy: 'linear' | 'exponential';
    baseDelay: number;
    maxDelay: number;
    retryableErrors: string[];
}

export class NetworkError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class ApiError extends Error {
    constructor(message: string, public code: string, public statusCode?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

export class DataError extends Error {
    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'DataError';
    }
}

export class ReverseEngineeringError extends Error {
    constructor(message: string, public context?: string) {
        super(message);
        this.name = 'ReverseEngineeringError';
    }
}

export default class FreeRunErrorHandler {
    private defaultRetryConfig: RetryConfig = {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        baseDelay: 1000,
        maxDelay: 10000,
        retryableErrors: ['NetworkError', 'TIMEOUT', 'CONNECTION_REFUSED', 'SERVER_ERROR']
    };

    constructor(retryConfig: Partial<RetryConfig> = {}) {
        this.retryConfig = { ...this.defaultRetryConfig, ...retryConfig };
    }

    handleNetworkError(error: NetworkError): ErrorResponse {
        const isRetryable = this.isRetryableError(error);

        return {
            message: `网络连接失败: ${error.message}`,
            code: 'NETWORK_ERROR',
            recoverable: true,
            retryable: isRetryable,
            suggestions: [
                '检查网络连接是否正常',
                '确认服务器地址是否正确',
                isRetryable ? '系统将自动重试' : '请稍后手动重试',
                '如问题持续存在，请联系技术支持'
            ]
        };
    }

    handleApiError(error: ApiError): ErrorResponse {
        const errorMappings: Record<string, ErrorResponse> = {
            'INVALID_TOKEN': {
                message: '登录凭证已过期，请重新登录',
                code: 'AUTH_ERROR',
                recoverable: true,
                retryable: false,
                suggestions: [
                    '点击重新登录按钮',
                    '确认账号密码是否正确',
                    '清除浏览器缓存后重试'
                ]
            },
            'INVALID_PARAMS': {
                message: '提交的跑步数据格式不正确',
                code: 'VALIDATION_ERROR',
                recoverable: true,
                retryable: false,
                suggestions: [
                    '检查距离是否在0.5-20公里范围内',
                    '确认速度是否在3-25公里/小时范围内',
                    '验证时间设置是否合理',
                    '尝试使用预设模板重新设置参数'
                ]
            },
            'DUPLICATE_RECORD': {
                message: '相同时间段已存在跑步记录',
                code: 'DUPLICATE_ERROR',
                recoverable: true,
                retryable: false,
                suggestions: [
                    '修改开始时间避免重复',
                    '检查是否已经提交过相同记录',
                    '等待一段时间后重新提交'
                ]
            },
            'SERVER_ERROR': {
                message: '服务器内部错误，请稍后重试',
                code: 'SERVER_ERROR',
                recoverable: true,
                retryable: true,
                suggestions: [
                    '系统将自动重试',
                    '如问题持续存在，请联系管理员',
                    '可以尝试使用其他功能'
                ]
            }
        };

        return errorMappings[error.code] || {
            message: `API调用失败: ${error.message}`,
            code: error.code,
            recoverable: false,
            retryable: this.isRetryableError(error),
            suggestions: [
                '请检查网络连接',
                '确认输入参数是否正确',
                '联系技术支持获取帮助'
            ]
        };
    }

    handleDataError(error: DataError): ErrorResponse {
        return {
            message: `数据处理错误: ${error.message}`,
            code: 'DATA_ERROR',
            recoverable: true,
            retryable: false,
            suggestions: [
                error.field ? `请检查${error.field}字段的值` : '请检查输入数据格式',
                '确认所有必填字段都已填写',
                '尝试重新生成数据',
                '使用预设模板可以避免数据格式问题'
            ]
        };
    }

    handleReverseEngineeringError(error: ReverseEngineeringError): ErrorResponse {
        return {
            message: `API逆向工程失败: ${error.message}`,
            code: 'REVERSE_ENGINEERING_ERROR',
            recoverable: false,
            retryable: false,
            suggestions: [
                '检查目标应用版本是否发生变化',
                '验证网络抓包配置是否正确',
                '确认API端点是否仍然有效',
                '可能需要重新进行逆向工程分析',
                error.context ? `相关上下文: ${error.context}` : '请查看详细日志获取更多信息'
            ]
        };
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        context: string = 'operation'
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                // Don't retry on the last attempt
                if (attempt === this.retryConfig.maxAttempts) {
                    break;
                }

                // Check if error is retryable
                if (!this.isRetryableError(lastError)) {
                    break;
                }

                // Calculate delay
                const delay = this.calculateDelay(attempt);

                console.warn(`${context} failed (attempt ${attempt}/${this.retryConfig.maxAttempts}): ${lastError.message}. Retrying in ${delay}ms...`);

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // If we get here, all retries failed
        throw lastError!;
    }

    private isRetryableError(error: Error): boolean {
        // Check by error type
        if (error instanceof NetworkError) {
            // Network errors are retryable if:
            // - No status code (connection issues)
            // - Status code >= 500 (server errors)
            // - Status code 408 (timeout)
            // - Status code 429 (rate limiting)
            if (!error.statusCode) return true;
            return error.statusCode >= 500 || error.statusCode === 408 || error.statusCode === 429;
        }

        if (error instanceof ApiError) {
            return this.retryConfig.retryableErrors.includes(error.code) ||
                (error.statusCode ? error.statusCode >= 500 : false);
        }

        // Check by error name
        return this.retryConfig.retryableErrors.includes(error.name);
    }

    private calculateDelay(attempt: number): number {
        let delay: number;

        if (this.retryConfig.backoffStrategy === 'exponential') {
            delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
        } else {
            delay = this.retryConfig.baseDelay * attempt;
        }

        // Add jitter to avoid thundering herd
        const jitter = Math.random() * 0.1 * delay;
        delay += jitter;

        return Math.min(delay, this.retryConfig.maxDelay);
    }

    // Helper method to wrap API calls with error handling
    async handleApiCall<T>(
        apiCall: () => Promise<T>,
        context: string = 'API call'
    ): Promise<T> {
        try {
            return await this.executeWithRetry(apiCall, context);
        } catch (error) {
            // Transform and re-throw with proper error handling
            if (error instanceof Error) {
                if (error.message.includes('fetch')) {
                    throw new NetworkError(error.message);
                } else if (error.message.includes('400') || error.message.includes('401')) {
                    throw new ApiError(error.message, 'CLIENT_ERROR', 400);
                } else if (error.message.includes('500')) {
                    throw new ApiError(error.message, 'SERVER_ERROR', 500);
                }
            }
            throw error;
        }
    }
}