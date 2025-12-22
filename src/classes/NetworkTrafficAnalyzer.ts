import type {
    NetworkRequest,
    NetworkResponse,
    HttpTransaction,
    PcapAnalysisResult,
    ApiEndpoint
} from '../types/reverseEngineering/NetworkTypes.d.ts';
import { v4 as uuidv4 } from 'uuid';

/**
 * NetworkTrafficAnalyzer - 用于分析网络流量和提取HTTP请求/响应的类
 * 主要用于逆向工程龙猫校园自由跑API
 */
export default class NetworkTrafficAnalyzer {
    private transactions: Map<string, HttpTransaction> = new Map();
    private endpoints: Map<string, ApiEndpoint> = new Map();

    /**
     * 解析PCAP文件内容（模拟实现，实际需要专门的PCAP解析库）
     * @param pcapData - PCAP文件的二进制数据或文本表示
     * @returns 解析结果
     */
    async parsePcapFile(pcapData: string | Buffer): Promise<PcapAnalysisResult> {
        // 注意：这是一个简化的实现，实际项目中需要使用专门的PCAP解析库
        // 如 node-pcap 或 pcap-parser

        const transactions: HttpTransaction[] = [];
        let totalRequests = 0;
        let totalResponses = 0;
        let startTime = Date.now();
        let endTime = Date.now();

        try {
            // 如果是字符串，假设是HAR格式或简化的JSON格式
            if (typeof pcapData === 'string') {
                const data = this.parseHarFormat(pcapData);
                transactions.push(...data.transactions);
                totalRequests = data.totalRequests;
                totalResponses = data.totalResponses;
                startTime = data.timeRange.start;
                endTime = data.timeRange.end;
            } else {
                // 对于二进制PCAP数据，这里需要实际的PCAP解析逻辑
                throw new Error('Binary PCAP parsing not implemented yet. Please use HAR format.');
            }

            // 存储事务到内部映射
            transactions.forEach(transaction => {
                this.transactions.set(transaction.request.id, transaction);
            });

        } catch (error) {
            console.error('Error parsing PCAP data:', error);
            throw new Error(`Failed to parse PCAP data: ${error.message}`);
        }

        return {
            transactions,
            totalRequests,
            totalResponses,
            timeRange: { start: startTime, end: endTime }
        };
    }

    /**
     * 解析HAR格式数据（HTTP Archive）
     * @param harData - HAR格式的JSON字符串
     * @returns 解析结果
     */
    private parseHarFormat(harData: string): PcapAnalysisResult {
        try {
            const har = JSON.parse(harData);
            const entries = har.log?.entries || [];

            const transactions: HttpTransaction[] = [];
            let startTime = Infinity;
            let endTime = 0;

            entries.forEach((entry: any) => {
                const requestId = uuidv4();
                const requestTime = new Date(entry.startedDateTime).getTime();

                startTime = Math.min(startTime, requestTime);
                endTime = Math.max(endTime, requestTime);

                const request: NetworkRequest = {
                    id: requestId,
                    url: entry.request.url,
                    method: entry.request.method,
                    headers: this.parseHeaders(entry.request.headers),
                    body: entry.request.postData?.text || '',
                    timestamp: requestTime
                };

                const response: NetworkResponse = {
                    status: entry.response.status,
                    headers: this.parseHeaders(entry.response.headers),
                    body: entry.response.content?.text || '',
                    timestamp: requestTime + entry.time,
                    requestId
                };

                transactions.push({
                    request,
                    response,
                    duration: entry.time
                });
            });

            return {
                transactions,
                totalRequests: transactions.length,
                totalResponses: transactions.filter(t => t.response).length,
                timeRange: { start: startTime, end: endTime }
            };
        } catch (error) {
            throw new Error(`Invalid HAR format: ${error.message}`);
        }
    }

    /**
     * 解析HTTP头部数组为对象
     * @param headers - HAR格式的头部数组
     * @returns 头部对象
     */
    private parseHeaders(headers: Array<{ name: string, value: string }>): Record<string, string> {
        const result: Record<string, string> = {};
        headers.forEach(header => {
            result[header.name.toLowerCase()] = header.value;
        });
        return result;
    }

    /**
     * 提取HTTP请求数据
     * @param filterUrl - 可选的URL过滤器
     * @returns HTTP请求数组
     */
    extractHttpRequests(filterUrl?: string): NetworkRequest[] {
        const requests: NetworkRequest[] = [];

        this.transactions.forEach(transaction => {
            if (!filterUrl || transaction.request.url.includes(filterUrl)) {
                requests.push(transaction.request);
            }
        });

        return requests;
    }

    /**
     * 提取HTTP响应数据
     * @param filterUrl - 可选的URL过滤器
     * @returns HTTP响应数组
     */
    extractHttpResponses(filterUrl?: string): NetworkResponse[] {
        const responses: NetworkResponse[] = [];

        this.transactions.forEach(transaction => {
            if (transaction.response && (!filterUrl || transaction.request.url.includes(filterUrl))) {
                responses.push(transaction.response);
            }
        });

        return responses;
    }

    /**
     * 获取所有HTTP事务
     * @param filterUrl - 可选的URL过滤器
     * @returns HTTP事务数组
     */
    getTransactions(filterUrl?: string): HttpTransaction[] {
        const transactions: HttpTransaction[] = [];

        this.transactions.forEach(transaction => {
            if (!filterUrl || transaction.request.url.includes(filterUrl)) {
                transactions.push(transaction);
            }
        });

        return transactions;
    }

    /**
     * 分析和识别API端点
     * @param baseUrl - 基础URL过滤器
     * @returns 发现的API端点
     */
    discoverApiEndpoints(baseUrl?: string): ApiEndpoint[] {
        const endpointMap = new Map<string, ApiEndpoint>();

        this.transactions.forEach(transaction => {
            const { request } = transaction;

            if (baseUrl && !request.url.includes(baseUrl)) {
                return;
            }

            // 提取路径和方法作为端点标识
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
            const endpointKey = `${method}:${path}`;

            if (endpointMap.has(endpointKey)) {
                const endpoint = endpointMap.get(endpointKey)!;
                endpoint.frequency += 1;
            } else {
                const endpoint: ApiEndpoint = {
                    path,
                    method,
                    description: `${method} ${path}`,
                    frequency: 1,
                    sampleRequest: this.parseSampleData(request.body),
                    sampleResponse: transaction.response ? this.parseSampleData(transaction.response.body) : undefined
                };
                endpointMap.set(endpointKey, endpoint);
            }
        });

        return Array.from(endpointMap.values()).sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * 解析示例数据
     * @param data - 原始数据字符串
     * @returns 解析后的数据对象
     */
    private parseSampleData(data: string): any {
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            // 如果不是JSON，返回原始字符串
            return data;
        }
    }

    /**
     * 存储分析结果到结构化格式
     * @param filename - 输出文件名
     * @param data - 要存储的数据
     */
    async storeAnalysisResult(filename: string, data: any): Promise<void> {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            // 在实际实现中，这里应该写入文件系统
            // 现在只是模拟存储
            console.log(`Storing analysis result to ${filename}:`, jsonData.substring(0, 200) + '...');
        } catch (error) {
            throw new Error(`Failed to store analysis result: ${error.message}`);
        }
    }

    /**
     * 清除所有存储的数据
     */
    clear(): void {
        this.transactions.clear();
        this.endpoints.clear();
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const totalTransactions = this.transactions.size;
        const completedTransactions = Array.from(this.transactions.values()).filter(t => t.response).length;
        const uniqueEndpoints = this.discoverApiEndpoints().length;

        return {
            totalTransactions,
            completedTransactions,
            uniqueEndpoints,
            completionRate: totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0
        };
    }
}