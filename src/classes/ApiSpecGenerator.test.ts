import { describe, it, expect, beforeEach } from 'vitest';
import ApiSpecGenerator from './ApiSpecGenerator';
import type { ApiEndpoint, EncryptionInfo } from '../types/reverseEngineering/NetworkTypes.d.ts';

describe('ApiSpecGenerator', () => {
    let generator: ApiSpecGenerator;

    beforeEach(() => {
        generator = new ApiSpecGenerator();
    });

    describe('Basic functionality', () => {
        it('should create generator instance', () => {
            expect(generator).toBeDefined();
            expect(generator.getCurrentSpec()).toBeNull();
        });

        it('should generate API specification', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/freerun/submit',
                    method: 'POST',
                    description: 'Submit free run data',
                    frequency: 10,
                    sampleRequest: {
                        stuNumber: '12345',
                        distance: '5.0'
                    },
                    sampleResponse: {
                        success: true,
                        recordId: 'rec-123'
                    }
                },
                {
                    path: '/api/freerun/records',
                    method: 'GET',
                    description: 'Get free run records',
                    frequency: 5,
                    sampleResponse: {
                        records: []
                    }
                }
            ];

            const encryptionInfo: EncryptionInfo = {
                algorithm: 'RSA',
                keySize: 2048,
                padding: 'PKCS1'
            };

            const spec = generator.generateApiSpec(endpoints, 'https://api.example.com', encryptionInfo);

            expect(spec.endpoints.submit).toBe('https://api.example.com/api/freerun/submit');
            expect(spec.endpoints.query).toBe('https://api.example.com/api/freerun/records');
            expect(spec.requestFormat.requiredFields.length).toBeGreaterThanOrEqual(0);
            expect(spec.responseFormat.requiredFields.length).toBeGreaterThanOrEqual(0);
            expect(spec.encryption.algorithm).toBe('RSA');
        });

        it('should validate API specification', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/freerun/submit',
                    method: 'POST',
                    description: 'Submit free run data',
                    frequency: 1,
                    sampleRequest: { data: 'test' },
                    sampleResponse: { success: true }
                }
            ];

            const encryptionInfo: EncryptionInfo = {
                algorithm: 'RSA',
                keySize: 2048,
                padding: 'PKCS1'
            };

            const spec = generator.generateApiSpec(endpoints, 'https://api.example.com', encryptionInfo);
            const validation = generator.validateApiSpec(spec);

            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(validation.score).toBeGreaterThan(0);
        });

        it('should generate TypeScript interfaces', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/freerun/submit',
                    method: 'POST',
                    description: 'Submit free run data',
                    frequency: 1,
                    sampleRequest: {
                        stuNumber: '12345',
                        distance: '5.0'
                    },
                    sampleResponse: {
                        success: true,
                        recordId: 'rec-123'
                    }
                }
            ];

            const encryptionInfo: EncryptionInfo = {
                algorithm: 'RSA',
                keySize: 2048,
                padding: 'PKCS1'
            };

            const spec = generator.generateApiSpec(endpoints, 'https://api.example.com', encryptionInfo);
            const interfaces = generator.generateTypeScriptInterfaces(spec);

            expect(interfaces).toContain('export interface FreeRunRequest');
            expect(interfaces).toContain('export interface FreeRunResponse');
            expect(interfaces).toContain('stuNumber: string');
            expect(interfaces).toContain('success: boolean');
        });

        it('should export documentation in different formats', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/freerun/submit',
                    method: 'POST',
                    description: 'Submit free run data',
                    frequency: 1,
                    sampleRequest: { data: 'test' },
                    sampleResponse: { success: true }
                }
            ];

            const encryptionInfo: EncryptionInfo = {
                algorithm: 'RSA',
                keySize: 2048,
                padding: 'PKCS1'
            };

            const spec = generator.generateApiSpec(endpoints, 'https://api.example.com', encryptionInfo);

            const markdown = generator.exportDocumentation('markdown');
            const json = generator.exportDocumentation('json');
            const typescript = generator.exportDocumentation('typescript');

            expect(markdown).toContain('# Free Run API Specification');
            expect(JSON.parse(json)).toEqual(spec);
            expect(typescript).toContain('export interface');
        });

        it('should maintain generation history', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/test',
                    method: 'POST',
                    description: 'Test endpoint',
                    frequency: 1,
                    sampleRequest: { test: 'data' }
                }
            ];

            const encryptionInfo: EncryptionInfo = {
                algorithm: 'RSA',
                keySize: 2048,
                padding: 'PKCS1'
            };

            generator.generateApiSpec(endpoints, 'https://api.example.com', encryptionInfo);

            const history = generator.getGenerationHistory();
            expect(history).toHaveLength(1);
            expect(history[0].type).toBe('generate');
            expect(history[0].endpointCount).toBe(1);
        });
    });
});