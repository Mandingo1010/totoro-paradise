import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import ApiEndpointDiscovery from './ApiEndpointDiscovery'
import type { HttpTransaction, ApiEndpoint } from '../types/reverseEngineering/NetworkTypes.d.ts'
import { v4 as uuidv4 } from 'uuid'

describe('ApiEndpointDiscovery', () => {
    let discovery: ApiEndpointDiscovery

    beforeEach(() => {
        discovery = new ApiEndpointDiscovery()
    })

    describe('单元测试', () => {
        it('应该识别明显的自由跑端点', () => {
            const transactions: HttpTransaction[] = [
                {
                    request: {
                        id: uuidv4(),
                        url: 'https://api.example.com/totoro/platform/recreord/freeRun',
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: '{"distance": 5.0, "duration": 1800}',
                        timestamp: Date.now()
                    },
                    response: {
                        status: 200,
                        headers: { 'content-type': 'application/json' },
                        body: '{"success": true, "recordId": "12345"}',
                        timestamp: Date.now(),
                        requestId: uuidv4()
                    }
                }
            ]

            const endpoints = discovery.identifyFreeRunEndpoints(transactions)

            expect(endpoints).toHaveLength(1)
            expect(endpoints[0].path).toBe('/totoro/platform/recreord/freeRun')
            expect(endpoints[0].method).toBe('POST')
            expect(endpoints[0].frequency).toBe(1)
        })

        it('应该正确分类端点', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/freerun/submit',
                    method: 'POST',
                    description: '提交自由跑数据',
                    frequency: 5
                },
                {
                    path: '/api/freerun/records',
                    method: 'GET',
                    description: '获取跑步记录',
                    frequency: 3
                },
                {
                    path: '/api/freerun/detail/123',
                    method: 'GET',
                    description: '获取详细信息',
                    frequency: 2
                }
            ]

            const classified = discovery.classifyAndValidateEndpoints(endpoints)

            expect(classified.submit).toHaveLength(1)
            expect(classified.query).toHaveLength(1)
            expect(classified.detail).toHaveLength(1)
            expect(classified.other).toHaveLength(0)
        })

        it('应该生成完整的API规格', () => {
            const endpoints: ApiEndpoint[] = [
                {
                    path: '/api/freerun/submit',
                    method: 'POST',
                    description: '提交自由跑数据',
                    frequency: 1,
                    sampleRequest: { distance: 5.0, duration: 1800, avgSpeed: 10.0 },
                    sampleResponse: { success: true, recordId: '12345' }
                }
            ]

            const spec = discovery.generateApiSpecification(endpoints, 'https://api.example.com')

            expect(spec.endpoints.submit).toBe('https://api.example.com/api/freerun/submit')
            expect(spec.requestFormat.requiredFields).toContain('distance')
            expect(spec.requestFormat.requiredFields).toContain('duration')
            expect(spec.responseFormat.requiredFields).toContain('success')
        })

        it('应该验证端点有效性', () => {
            const validEndpoint: ApiEndpoint = {
                path: '/api/freerun/submit',
                method: 'POST',
                description: '提交自由跑数据',
                frequency: 5,
                sampleRequest: { distance: 5.0 },
                sampleResponse: { success: true }
            }

            const validation = discovery.validateEndpoint(validEndpoint)

            expect(validation.isValid).toBe(true)
            expect(validation.confidence).toBeGreaterThan(80)
            expect(validation.issues).toHaveLength(0)
        })

        it('应该识别无效端点', () => {
            const invalidEndpoint: ApiEndpoint = {
                path: '/',
                method: 'INVALID' as any,
                description: '无效端点',
                frequency: 1
            }

            const validation = discovery.validateEndpoint(invalidEndpoint)

            expect(validation.isValid).toBe(false)
            expect(validation.confidence).toBeLessThan(50)
            expect(validation.issues.length).toBeGreaterThan(0)
        })
    })

    describe('属性测试', () => {
        /**
         * **Feature: free-run-feature, Property 18: API端点识别准确性**
         * 
         * 对于任何包含自由跑关键词的HTTP事务，API发现算法应该能够正确识别它们为自由跑相关端点
         * **验证: 需求 0.1**
         */
        it('Property 18: API端点识别准确性', () => {
            fc.assert(
                fc.property(
                    // 生成包含自由跑关键词的URL和请求体
                    fc.record({
                        baseUrl: fc.constantFrom(
                            'https://api.example.com',
                            'https://totoro.university.edu',
                            'https://campus.app.com'
                        ),
                        pathSegment: fc.constantFrom(
                            '/api/freerun/submit',
                            '/totoro/platform/recreord/freeRun',
                            '/api/exercise/free-run',
                            '/run/freemode',
                            '/api/recreord/freerun'
                        ),
                        method: fc.constantFrom('GET', 'POST', 'PUT'),
                        freeRunData: fc.record({
                            distance: fc.float({ min: 0.5, max: 20.0, noNaN: true }),
                            duration: fc.integer({ min: 300, max: 7200 }),
                            avgSpeed: fc.float({ min: 3.0, max: 25.0, noNaN: true }),
                            runType: fc.constantFrom('1', 'freerun', 'free'),
                            exerciseType: fc.constantFrom('freeRun', 'customRun')
                        })
                    }),
                    ({ baseUrl, pathSegment, method, freeRunData }) => {
                        // 构造包含自由跑特征的HTTP事务
                        const transaction: HttpTransaction = {
                            request: {
                                id: uuidv4(),
                                url: baseUrl + pathSegment,
                                method,
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify(freeRunData),
                                timestamp: Date.now()
                            },
                            response: {
                                status: 200,
                                headers: { 'content-type': 'application/json' },
                                body: '{"success": true}',
                                timestamp: Date.now(),
                                requestId: uuidv4()
                            }
                        }

                        // 执行端点识别
                        const endpoints = discovery.identifyFreeRunEndpoints([transaction])

                        // 验证：应该识别出至少一个自由跑端点
                        expect(endpoints.length).toBeGreaterThanOrEqual(1)

                        // 验证：识别出的端点应该包含正确的路径和方法
                        const identifiedEndpoint = endpoints.find(ep =>
                            ep.path === pathSegment && ep.method === method
                        )
                        expect(identifiedEndpoint).toBeDefined()

                        // 验证：端点应该有合理的频率
                        expect(identifiedEndpoint!.frequency).toBeGreaterThan(0)

                        // 验证：应该正确解析示例数据
                        if (method === 'POST') {
                            expect(identifiedEndpoint!.sampleRequest).toBeDefined()
                            expect(identifiedEndpoint!.sampleRequest).toMatchObject(freeRunData)
                        }
                    }
                ),
                { numRuns: 100 }
            )
        })

        /**
         * 属性测试：非自由跑端点不应该被误识别
         */
        it('应该正确排除非自由跑端点', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        baseUrl: fc.constantFrom(
                            'https://api.example.com',
                            'https://other.service.com'
                        ),
                        pathSegment: fc.constantFrom(
                            '/api/user/login',
                            '/api/news/list',
                            '/api/course/schedule',
                            '/api/library/books',
                            '/api/sunrun/submit' // 阳光跑，不是自由跑
                        ),
                        method: fc.constantFrom('GET', 'POST'),
                        normalData: fc.record({
                            username: fc.string({ minLength: 3, maxLength: 20 }),
                            password: fc.string({ minLength: 6, maxLength: 30 }),
                            type: fc.constantFrom('login', 'register', 'update')
                        })
                    }),
                    ({ baseUrl, pathSegment, method, normalData }) => {
                        const transaction: HttpTransaction = {
                            request: {
                                id: uuidv4(),
                                url: baseUrl + pathSegment,
                                method,
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify(normalData),
                                timestamp: Date.now()
                            }
                        }

                        const endpoints = discovery.identifyFreeRunEndpoints([transaction])

                        // 验证：不应该识别出任何自由跑端点
                        expect(endpoints).toHaveLength(0)
                    }
                ),
                { numRuns: 50 }
            )
        })

        /**
         * 属性测试：端点分类的一致性
         */
        it('端点分类应该保持一致性', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            path: fc.constantFrom(
                                '/api/freerun/submit',
                                '/api/freerun/create',
                                '/api/freerun/records',
                                '/api/freerun/list',
                                '/api/freerun/detail/123',
                                '/api/freerun/info'
                            ),
                            method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
                            frequency: fc.integer({ min: 1, max: 10 })
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    (endpointData) => {
                        const endpoints: ApiEndpoint[] = endpointData.map(data => ({
                            ...data,
                            description: `${data.method} ${data.path}`
                        }))

                        const classified = discovery.classifyAndValidateEndpoints(endpoints)

                        // 验证：所有端点都应该被分类
                        const totalClassified = classified.submit.length +
                            classified.query.length +
                            classified.detail.length +
                            classified.other.length
                        expect(totalClassified).toBe(endpoints.length)

                        // 验证：POST方法的submit端点应该在submit分类中
                        classified.submit.forEach(endpoint => {
                            expect(endpoint.method).toBe('POST')
                            expect(
                                endpoint.path.includes('submit') ||
                                endpoint.path.includes('create') ||
                                endpoint.path.includes('add')
                            ).toBe(true)
                        })

                        // 验证：GET方法的查询端点应该在query分类中
                        classified.query.forEach(endpoint => {
                            expect(endpoint.method).toBe('GET')
                            expect(
                                endpoint.path.includes('records') ||
                                endpoint.path.includes('list') ||
                                endpoint.path.includes('query')
                            ).toBe(true)
                        })
                    }
                ),
                { numRuns: 100 }
            )
        })

        /**
         * 属性测试：API规格生成的完整性
         */
        it('API规格生成应该包含所有必要信息', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            path: fc.constantFrom(
                                '/api/freerun/submit',
                                '/api/freerun/records',
                                '/api/freerun/detail'
                            ),
                            method: fc.constantFrom('GET', 'POST'),
                            sampleRequest: fc.record({
                                distance: fc.float({ min: 0.5, max: 20 }),
                                duration: fc.integer({ min: 300, max: 7200 }),
                                commonField: fc.string()
                            }),
                            sampleResponse: fc.record({
                                success: fc.boolean(),
                                message: fc.string(),
                                commonResponseField: fc.string()
                            })
                        }),
                        { minLength: 1, maxLength: 5 }
                    ),
                    (endpointData) => {
                        const endpoints: ApiEndpoint[] = endpointData.map((data, index) => ({
                            ...data,
                            description: `Endpoint ${index}`,
                            frequency: 1
                        }))

                        const baseUrl = 'https://api.example.com'
                        const spec = discovery.generateApiSpecification(endpoints, baseUrl)

                        // 验证：规格应该包含端点信息
                        expect(spec.endpoints).toBeDefined()
                        expect(typeof spec.endpoints.submit).toBe('string')
                        expect(typeof spec.endpoints.query).toBe('string')
                        expect(typeof spec.endpoints.detail).toBe('string')

                        // 验证：请求格式应该包含字段信息
                        expect(spec.requestFormat).toBeDefined()
                        expect(Array.isArray(spec.requestFormat.requiredFields)).toBe(true)
                        expect(Array.isArray(spec.requestFormat.optionalFields)).toBe(true)
                        expect(typeof spec.requestFormat.fieldTypes).toBe('object')

                        // 验证：响应格式应该包含字段信息
                        expect(spec.responseFormat).toBeDefined()
                        expect(Array.isArray(spec.responseFormat.requiredFields)).toBe(true)
                        expect(Array.isArray(spec.responseFormat.optionalFields)).toBe(true)

                        // 验证：加密信息应该存在
                        expect(spec.encryption).toBeDefined()
                        expect(spec.encryption.algorithm).toBeDefined()
                        expect(spec.encryption.keySize).toBeGreaterThan(0)
                    }
                ),
                { numRuns: 100 }
            )
        })
    })
})