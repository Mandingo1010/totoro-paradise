import { describe, it, expect, beforeEach } from 'vitest';
import RequestFormatAnalyzer from './RequestFormatAnalyzer';
import type { NetworkRequest } from '../types/reverseEngineering/NetworkTypes.d.ts';

describe('RequestFormatAnalyzer', () => {
    let analyzer: RequestFormatAnalyzer;

    beforeEach(() => {
        analyzer = new RequestFormatAnalyzer();
    });

    describe('Basic functionality', () => {
        it('should create analyzer instance', () => {
            expect(analyzer).toBeDefined();
            expect(analyzer.getAllFields()).toHaveLength(0);
        });

        it('should analyze simple request', () => {
            const request: NetworkRequest = {
                id: 'test-1',
                url: 'https://api.example.com/freerun',
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    stuNumber: '12345',
                    distance: '5.0',
                    duration: '1800'
                }),
                timestamp: Date.now()
            };

            analyzer.addRequest(request);
            const fields = analyzer.getAllFields();

            expect(fields).toContain('stuNumber');
            expect(fields).toContain('distance');
            expect(fields).toContain('duration');
        });

        it('should generate schema from analyzed requests', () => {
            const requests: NetworkRequest[] = [
                {
                    id: 'test-1',
                    url: 'https://api.example.com/freerun',
                    method: 'POST',
                    headers: {},
                    body: JSON.stringify({
                        stuNumber: '12345',
                        distance: '5.0',
                        required: 'always'
                    }),
                    timestamp: Date.now()
                },
                {
                    id: 'test-2',
                    url: 'https://api.example.com/freerun',
                    method: 'POST',
                    headers: {},
                    body: JSON.stringify({
                        stuNumber: '67890',
                        distance: '10.0',
                        required: 'always',
                        optional: 'sometimes'
                    }),
                    timestamp: Date.now()
                }
            ];

            analyzer.addRequests(requests);
            const schema = analyzer.generateSchema(0.8);

            expect(schema.requiredFields).toContain('stuNumber');
            expect(schema.requiredFields).toContain('distance');
            expect(schema.requiredFields).toContain('required');
            expect(schema.optionalFields).toContain('optional');
        });

        it('should handle non-JSON request bodies', () => {
            const request: NetworkRequest = {
                id: 'test-1',
                url: 'https://api.example.com/freerun',
                method: 'POST',
                headers: {},
                body: 'invalid json',
                timestamp: Date.now()
            };

            analyzer.addRequest(request);
            const fields = analyzer.getAllFields();

            expect(fields).toHaveLength(0);
        });

        it('should provide analysis summary', () => {
            const request: NetworkRequest = {
                id: 'test-1',
                url: 'https://api.example.com/freerun',
                method: 'POST',
                headers: {},
                body: JSON.stringify({
                    stuNumber: '12345',
                    email: 'test@example.com'
                }),
                timestamp: Date.now()
            };

            analyzer.addRequest(request);
            const summary = analyzer.getSummary();

            expect(summary.totalRequests).toBe(1);
            expect(summary.totalFields).toBe(2);
            expect(summary.fieldFrequency['stuNumber']).toBe(1);
            expect(summary.commonPatterns['email']).toBe(1);
        });
    });
});