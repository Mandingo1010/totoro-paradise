import type {
    ApiEndpoint,
    HttpTransaction,
    FreeRunApiSpec,
    RequestSchema,
    ValidationRule,
    EncryptionInfo
} from '../types/reverseEngineering/NetworkTypes.d.ts';

/**
 * ApiEndpointDiscovery - 用于自动识别和分类API端点的算法类
 * 专门用于发现龙猫校园自由跑相关的API端点
 */
export default class ApiEndpointDiscovery {
    private freeRunKeywords = [
        'freerun', 'free-run', 'free_run',
        'platform/recreord/freeRun', // 基于现有代码结构
        'recreord', 'record', 'exercise'
    ];

    private commonApiPatterns = [
        /\/api\/.*freerun/i,
        /\/totoro\/.*freerun/i,
        /\/platform\/recreord\/freeRun/i,
        /\/run\/.*free/i,
        /\/exercise.*free/i
    ];

    /**
     * 自动识别自由跑相关的API端点
     * @param transactions - HTTP事务数组
     * @param baseUrl - 基础URL过滤器（可选）
     * @returns 识别出的自由跑API端点
     */
    identifyFreeRunEndpoints(transactions: HttpTransaction[], baseUrl?: string): ApiEndpoint[] {
        const endpoints: ApiEndpoint[] = [];
        const endpointMap = new Map<string, ApiEndpoint>();

        transactions.forEach(transaction => {
            const { request, response } = transaction;

            // 基础URL过滤
            if (baseUrl && !request.url.includes(baseUrl)) {
                return;
            }

            // 检查是否为自由跑相关端点
            if (this.isFreeRunRelated(request.url, request.body)) {
                const url = new URL(request.url);
                const path = url.pathname;
                const method = request.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
                const endpointKey = `${method}:${path}`;

                if (endpointMap.has(endpointKey)) {
                    const endpoint = endpointMap.get(endpointKey)!;
                    endpoint.frequency += 1;
                    // 更新示例数据（保留最新的）
                    endpoint.sampleRequest = this.parseSampleData(request.body);
                    if (response) {
                        endpoint.sampleResponse = this.parseSampleData(response.body);
                    }
                } else {
                    const endpoint: ApiEndpoint = {
                        path,
                        method,
                        description: this.generateEndpointDescription(path, method),
                        frequency: 1,
                        sampleRequest: this.parseSampleData(request.body),
                        sampleResponse: response ? this.parseSampleData(response.body) : undefined
                    };
                    endpointMap.set(endpointKey, endpoint);
                }
            }
        });

        return Array.from(endpointMap.values()).sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * 检查URL或请求体是否与自由跑相关
     * @param url - 请求URL
     * @param body - 请求体
     * @returns 是否为自由跑相关
     */
    private isFreeRunRelated(url: string, body: string): boolean {
        // 检查URL模式
        const urlMatch = this.commonApiPatterns.some(pattern => pattern.test(url));
        if (urlMatch) return true;

        // 检查URL中的关键词
        const urlKeywordMatch = this.freeRunKeywords.some(keyword =>
            url.toLowerCase().includes(keyword.toLowerCase())
        );
        if (urlKeywordMatch) return true;

        // 检查请求体中的关键词
        if (body) {
            try {
                const bodyObj = JSON.parse(body);
                const bodyStr = JSON.stringify(bodyObj).toLowerCase();
                const bodyKeywordMatch = this.freeRunKeywords.some(keyword =>
                    bodyStr.includes(keyword.toLowerCase())
                );
                if (bodyKeywordMatch) return true;

                // 检查特定字段组合（自由跑特有的字段）
                if (this.hasFreeRunFields(bodyObj)) return true;
            } catch {
                // 非JSON数据，检查字符串内容
                const bodyKeywordMatch = this.freeRunKeywords.some(keyword =>
                    body.toLowerCase().includes(keyword.toLowerCase())
                );
                if (bodyKeywordMatch) return true;
            }
        }

        return false;
    }

    /**
     * 检查对象是否包含自由跑特有的字段组合
     * @param obj - 要检查的对象
     * @returns 是否包含自由跑字段
     */
    private hasFreeRunFields(obj: any): boolean {
        if (!obj || typeof obj !== 'object') return false;

        // 自由跑特有的字段组合
        const freeRunFieldSets = [
            ['distance', 'duration', 'avgSpeed'], // 基本自由跑字段
            ['runType', 'freeRun'], // 运行类型标识
            ['customDistance', 'customTime'], // 自定义参数
            ['exerciseType', 'freeMode'] // 运动类型
        ];

        return freeRunFieldSets.some(fieldSet =>
            fieldSet.every(field =>
                obj.hasOwnProperty(field) ||
                Object.keys(obj).some(key => key.toLowerCase().includes(field.toLowerCase()))
            )
        );
    }

    /**
     * 生成端点描述
     * @param path - API路径
     * @param method - HTTP方法
     * @returns 端点描述
     */
    private generateEndpointDescription(path: string, method: string): string {
        const pathSegments = path.split('/').filter(segment => segment.length > 0);
        const lastSegment = pathSegments[pathSegments.length - 1] || 'unknown';

        const actionMap: Record<string, string> = {
            'GET': '获取',
            'POST': '提交',
            'PUT': '更新',
            'DELETE': '删除'
        };

        const resourceMap: Record<string, string> = {
            'submit': '自由跑数据',
            'freerun': '自由跑记录',
            'records': '跑步记录',
            'detail': '详细信息',
            'query': '查询结果'
        };

        const action = actionMap[method] || method;
        const resource = resourceMap[lastSegment.toLowerCase()] || lastSegment;

        return `${action}${resource}`;
    }

    /**
     * 对端点进行分类和验证
     * @param endpoints - 发现的端点列表
     * @returns 分类后的端点信息
     */
    classifyAndValidateEndpoints(endpoints: ApiEndpoint[]): {
        submit: ApiEndpoint[];
        query: ApiEndpoint[];
        detail: ApiEndpoint[];
        other: ApiEndpoint[];
    } {
        const classification = {
            submit: [] as ApiEndpoint[],
            query: [] as ApiEndpoint[],
            detail: [] as ApiEndpoint[],
            other: [] as ApiEndpoint[]
        };

        endpoints.forEach(endpoint => {
            const path = endpoint.path.toLowerCase();
            const method = endpoint.method;

            if (method === 'POST' && (path.includes('submit') || path.includes('create') || path.includes('add'))) {
                classification.submit.push(endpoint);
            } else if (method === 'GET' && (path.includes('records') || path.includes('list') || path.includes('query'))) {
                classification.query.push(endpoint);
            } else if (method === 'GET' && (path.includes('detail') || path.includes('info') || path.match(/\/\d+$/))) {
                classification.detail.push(endpoint);
            } else {
                classification.other.push(endpoint);
            }
        });

        return classification;
    }

    /**
     * 生成API规格文档
     * @param endpoints - 端点列表
     * @param baseUrl - 基础URL
     * @returns API规格文档
     */
    generateApiSpecification(endpoints: ApiEndpoint[], baseUrl: string): FreeRunApiSpec {
        const classified = this.classifyAndValidateEndpoints(endpoints);

        // 选择最可能的端点
        const submitEndpoint = classified.submit[0] || classified.other.find(ep => ep.method === 'POST');
        const queryEndpoint = classified.query[0] || classified.other.find(ep => ep.method === 'GET');
        const detailEndpoint = classified.detail[0] || classified.other.find(ep => ep.path.includes('detail'));

        const spec: FreeRunApiSpec = {
            endpoints: {
                submit: submitEndpoint ? `${baseUrl}${submitEndpoint.path}` : '',
                query: queryEndpoint ? `${baseUrl}${queryEndpoint.path}` : '',
                detail: detailEndpoint ? `${baseUrl}${detailEndpoint.path}` : ''
            },
            requestFormat: this.analyzeRequestFormat(endpoints),
            responseFormat: this.analyzeResponseFormat(endpoints),
            encryption: this.detectEncryptionInfo(endpoints)
        };

        return spec;
    }

    /**
     * 分析请求格式
     * @param endpoints - 端点列表
     * @returns 请求格式规范
     */
    private analyzeRequestFormat(endpoints: ApiEndpoint[]): RequestSchema {
        const allFields = new Set<string>();
        const fieldTypes: Record<string, string> = {};
        const fieldFrequency: Record<string, number> = {};

        endpoints.forEach(endpoint => {
            if (endpoint.sampleRequest && typeof endpoint.sampleRequest === 'object') {
                Object.keys(endpoint.sampleRequest).forEach(field => {
                    allFields.add(field);
                    fieldFrequency[field] = (fieldFrequency[field] || 0) + 1;

                    const value = endpoint.sampleRequest[field];
                    if (!fieldTypes[field]) {
                        fieldTypes[field] = typeof value;
                    }
                });
            }
        });

        const totalSamples = endpoints.filter(ep => ep.sampleRequest).length;
        const requiredThreshold = totalSamples * 0.8; // 80%的样本中都出现的字段认为是必需的

        const requiredFields = Object.keys(fieldFrequency).filter(
            field => fieldFrequency[field] >= requiredThreshold
        );
        const optionalFields = Array.from(allFields).filter(
            field => !requiredFields.includes(field)
        );

        const validation: Record<string, ValidationRule> = {};
        Object.keys(fieldTypes).forEach(field => {
            validation[field] = {
                type: fieldTypes[field] as any,
                required: requiredFields.includes(field)
            };
        });

        return {
            requiredFields,
            optionalFields,
            fieldTypes,
            validation
        };
    }

    /**
     * 分析响应格式
     * @param endpoints - 端点列表
     * @returns 响应格式规范
     */
    private analyzeResponseFormat(endpoints: ApiEndpoint[]): RequestSchema {
        // 类似于请求格式分析，但针对响应数据
        const allFields = new Set<string>();
        const fieldTypes: Record<string, string> = {};
        const fieldFrequency: Record<string, number> = {};

        endpoints.forEach(endpoint => {
            if (endpoint.sampleResponse && typeof endpoint.sampleResponse === 'object') {
                Object.keys(endpoint.sampleResponse).forEach(field => {
                    allFields.add(field);
                    fieldFrequency[field] = (fieldFrequency[field] || 0) + 1;

                    const value = endpoint.sampleResponse[field];
                    if (!fieldTypes[field]) {
                        fieldTypes[field] = typeof value;
                    }
                });
            }
        });

        const totalSamples = endpoints.filter(ep => ep.sampleResponse).length;
        const requiredThreshold = totalSamples * 0.7; // 70%的样本中都出现的字段

        const requiredFields = Object.keys(fieldFrequency).filter(
            field => fieldFrequency[field] >= requiredThreshold
        );
        const optionalFields = Array.from(allFields).filter(
            field => !requiredFields.includes(field)
        );

        const validation: Record<string, ValidationRule> = {};
        Object.keys(fieldTypes).forEach(field => {
            validation[field] = {
                type: fieldTypes[field] as any,
                required: requiredFields.includes(field)
            };
        });

        return {
            requiredFields,
            optionalFields,
            fieldTypes,
            validation
        };
    }

    /**
     * 检测加密信息
     * @param endpoints - 端点列表
     * @returns 加密信息
     */
    private detectEncryptionInfo(endpoints: ApiEndpoint[]): EncryptionInfo {
        // 基于现有项目的RSA加密实现
        // 这里返回默认的加密配置，实际项目中需要通过分析请求头和数据格式来确定
        return {
            algorithm: 'RSA',
            keySize: 2048,
            padding: 'PKCS1',
            // 实际的密钥需要从现有项目中获取或通过逆向工程确定
        };
    }

    /**
     * 解析示例数据
     * @param data - 原始数据
     * @returns 解析后的数据
     */
    private parseSampleData(data: string): any {
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }

    /**
     * 验证端点的有效性
     * @param endpoint - 要验证的端点
     * @returns 验证结果
     */
    validateEndpoint(endpoint: ApiEndpoint): {
        isValid: boolean;
        issues: string[];
        confidence: number;
    } {
        const issues: string[] = [];
        let confidence = 100;

        // 检查基本信息
        if (!endpoint.path || endpoint.path === '/') {
            issues.push('端点路径无效');
            confidence -= 30;
        }

        if (!['GET', 'POST', 'PUT', 'DELETE'].includes(endpoint.method)) {
            issues.push('HTTP方法无效');
            confidence -= 20;
        }

        // 检查频率（低频率可能是误识别）
        if (endpoint.frequency < 2) {
            issues.push('端点调用频率过低，可能是误识别');
            confidence -= 15;
        }

        // 检查示例数据
        if (!endpoint.sampleRequest && endpoint.method === 'POST') {
            issues.push('POST端点缺少请求示例');
            confidence -= 10;
        }

        if (!endpoint.sampleResponse) {
            issues.push('缺少响应示例');
            confidence -= 10;
        }

        return {
            isValid: issues.length === 0,
            issues,
            confidence: Math.max(0, confidence)
        };
    }
}