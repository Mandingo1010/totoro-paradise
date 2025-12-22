import { describe, it, expect, beforeEach } from 'vitest'
import NetworkTrafficAnalyzer from './NetworkTrafficAnalyzer'
import type { NetworkRequest, NetworkResponse, HttpTransaction } from '../types/reverseEngineering/NetworkTypes.d.ts'

describe('NetworkTrafficAnalyzer', () => {
    let analyzer: NetworkTrafficAnalyzer

    beforeEach(() => {
        analyzer = new NetworkTrafficAnalyzer()
    })

    describe('PCAP文件解析功能', () => {
        it('应该能够解析有效的HAR格式数据', async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/freerun/submit',
                                headers: [
                                    { name: 'Content-Type', value: 'application/json' },
                                    { name: 'Authorization', value: 'Bearer token123' }
                                ],
                                postData: {
                                    text: '{"distance": 5.0, "time": 1800}'
                                }
                            },
                            response: {
                                status: 200,
                                headers: [
                                    { name: 'Content-Type', value: 'application/json' }
                                ],
                                content: {
                                    text: '{"success": true, "recordId": "12345"}'
                                }
                            }
                        }
                    ]
                }
            }

            const result = await analyzer.parsePcapFile(JSON.stringify(mockHarData))

            expect(result.totalRequests).toBe(1)
            expect(result.totalResponses).toBe(1)
            expect(result.transactions).toHaveLength(1)
            expect(result.transactions[0].request.method).toBe('POST')
            expect(result.transactions[0].request.url).toBe('https://api.example.com/freerun/submit')
            expect(result.transactions[0].response?.status).toBe(200)
        })

        it('应该处理空的HAR数据', async () => {
            const emptyHarData = {
                log: {
                    entries: []
                }
            }

            const result = await analyzer.parsePcapFile(JSON.stringify(emptyHarData))

            expect(result.totalRequests).toBe(0)
            expect(result.totalResponses).toBe(0)
            expect(result.transactions).toHaveLength(0)
        })

        it('应该拒绝无效的JSON数据', async () => {
            const invalidData = 'invalid json data'

            await expect(analyzer.parsePcapFile(invalidData)).rejects.toThrow('Invalid HAR format')
        })

        it('应该拒绝二进制PCAP数据（暂未实现）', async () => {
            const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04])

            await expect(analyzer.parsePcapFile(binaryData)).rejects.toThrow('Binary PCAP parsing not implemented yet')
        })
    })

    describe('HTTP请求提取准确性', () => {
        beforeEach(async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/freerun/submit',
                                headers: [{ name: 'Content-Type', value: 'application/json' }],
                                postData: { text: '{"test": "data"}' }
                            },
                            response: {
                                status: 200,
                                headers: [{ name: 'Content-Type', value: 'application/json' }],
                                content: { text: '{"success": true}' }
                            }
                        },
                        {
                            startedDateTime: '2024-01-01T10:01:00.000Z',
                            time: 150,
                            request: {
                                method: 'GET',
                                url: 'https://api.example.com/sunrun/records',
                                headers: [{ name: 'Authorization', value: 'Bearer token' }],
                                postData: { text: '' }
                            },
                            response: {
                                status: 200,
                                headers: [{ name: 'Content-Type', value: 'application/json' }],
                                content: { text: '{"records": []}' }
                            }
                        }
                    ]
                }
            }

            await analyzer.parsePcapFile(JSON.stringify(mockHarData))
        })

        it('应该提取所有HTTP请求', () => {
            const requests = analyzer.extractHttpRequests()

            expect(requests).toHaveLength(2)
            expect(requests[0].method).toBe('POST')
            expect(requests[0].url).toBe('https://api.example.com/freerun/submit')
            expect(requests[1].method).toBe('GET')
            expect(requests[1].url).toBe('https://api.example.com/sunrun/records')
        })

        it('应该根据URL过滤请求', () => {
            const freerunRequests = analyzer.extractHttpRequests('freerun')

            expect(freerunRequests).toHaveLength(1)
            expect(freerunRequests[0].url).toContain('freerun')
        })

        it('应该提取所有HTTP响应', () => {
            const responses = analyzer.extractHttpResponses()

            expect(responses).toHaveLength(2)
            expect(responses[0].status).toBe(200)
            expect(responses[1].status).toBe(200)
        })

        it('应该根据URL过滤响应', () => {
            const sunrunResponses = analyzer.extractHttpResponses('sunrun')

            expect(sunrunResponses).toHaveLength(1)
            expect(sunrunResponses[0].body).toContain('records')
        })
    })

    describe('数据结构化存储', () => {
        it('应该正确存储和检索事务数据', async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/test',
                                headers: [],
                                postData: { text: '{}' }
                            },
                            response: {
                                status: 200,
                                headers: [],
                                content: { text: '{}' }
                            }
                        }
                    ]
                }
            }

            await analyzer.parsePcapFile(JSON.stringify(mockHarData))
            const transactions = analyzer.getTransactions()

            expect(transactions).toHaveLength(1)
            expect(transactions[0].request.url).toBe('https://api.example.com/test')
            expect(transactions[0].response?.status).toBe(200)
            expect(transactions[0].duration).toBe(100)
        })

        it('应该能够发现API端点', async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/freerun/submit',
                                headers: [],
                                postData: { text: '{"distance": 5}' }
                            },
                            response: {
                                status: 200,
                                headers: [],
                                content: { text: '{"success": true}' }
                            }
                        },
                        {
                            startedDateTime: '2024-01-01T10:01:00.000Z',
                            time: 80,
                            request: {
                                method: 'GET',
                                url: 'https://api.example.com/freerun/records',
                                headers: [],
                                postData: { text: '' }
                            },
                            response: {
                                status: 200,
                                headers: [],
                                content: { text: '{"records": []}' }
                            }
                        }
                    ]
                }
            }

            await analyzer.parsePcapFile(JSON.stringify(mockHarData))
            const endpoints = analyzer.discoverApiEndpoints('api.example.com')

            expect(endpoints).toHaveLength(2)
            expect(endpoints.some(ep => ep.path === '/freerun/submit' && ep.method === 'POST')).toBe(true)
            expect(endpoints.some(ep => ep.path === '/freerun/records' && ep.method === 'GET')).toBe(true)
        })

        it('应该正确计算端点频率', async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/freerun/submit',
                                headers: [],
                                postData: { text: '{}' }
                            },
                            response: { status: 200, headers: [], content: { text: '{}' } }
                        },
                        {
                            startedDateTime: '2024-01-01T10:01:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/freerun/submit',
                                headers: [],
                                postData: { text: '{}' }
                            },
                            response: { status: 200, headers: [], content: { text: '{}' } }
                        }
                    ]
                }
            }

            await analyzer.parsePcapFile(JSON.stringify(mockHarData))
            const endpoints = analyzer.discoverApiEndpoints()

            expect(endpoints).toHaveLength(1)
            expect(endpoints[0].frequency).toBe(2)
        })

        it('应该能够存储分析结果', async () => {
            const testData = { test: 'data', number: 123 }

            // 这个测试主要验证方法不会抛出错误
            await expect(analyzer.storeAnalysisResult('test.json', testData)).resolves.not.toThrow()
        })

        it('应该提供正确的统计信息', async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'POST',
                                url: 'https://api.example.com/test1',
                                headers: [],
                                postData: { text: '{}' }
                            },
                            response: {
                                status: 200,
                                headers: [],
                                content: { text: '{}' }
                            }
                        },
                        {
                            startedDateTime: '2024-01-01T10:01:00.000Z',
                            time: 100,
                            request: {
                                method: 'GET',
                                url: 'https://api.example.com/test2',
                                headers: [],
                                postData: { text: '' }
                            },
                            response: {
                                status: 404,
                                headers: [],
                                content: { text: '{}' }
                            }
                        }
                    ]
                }
            }

            await analyzer.parsePcapFile(JSON.stringify(mockHarData))
            const stats = analyzer.getStatistics()

            expect(stats.totalTransactions).toBe(2)
            expect(stats.completedTransactions).toBe(2)
            expect(stats.uniqueEndpoints).toBe(2)
            expect(stats.completionRate).toBe(100)
        })
    })

    describe('工具方法', () => {
        it('应该能够清除所有数据', async () => {
            const mockHarData = {
                log: {
                    entries: [
                        {
                            startedDateTime: '2024-01-01T10:00:00.000Z',
                            time: 100,
                            request: {
                                method: 'GET',
                                url: 'https://api.example.com/test',
                                headers: [],
                                postData: { text: '' }
                            },
                            response: {
                                status: 200,
                                headers: [],
                                content: { text: '{}' }
                            }
                        }
                    ]
                }
            }

            await analyzer.parsePcapFile(JSON.stringify(mockHarData))
            expect(analyzer.getTransactions()).toHaveLength(1)

            analyzer.clear()
            expect(analyzer.getTransactions()).toHaveLength(0)
            expect(analyzer.getStatistics().totalTransactions).toBe(0)
        })
    })
})