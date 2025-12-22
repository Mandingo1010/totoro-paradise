import type {
    ApiEndpoint,
    FreeRunApiSpec,
    RequestSchema,
    EncryptionInfo
} from '../types/reverseEngineering/NetworkTypes.d.ts';

/**
 * ApiSpecGenerator - 用于自动生成API文档的类
 * 创建TypeScript接口定义，添加API规格验证和更新机制
 */
export default class ApiSpecGenerator {
    private apiSpec: FreeRunApiSpec | null = null;
    private generationHistory: GenerationRecord[] = [];

    /**
     * 生成完整的API规格文档
     * @param endpoints - API端点列表
     * @param baseUrl - 基础URL
     * @param encryptionInfo - 加密信息
     * @returns 生成的API规格
     */
    generateApiSpec(
        endpoints: ApiEndpoint[],
        baseUrl: string,
        encryptionInfo: EncryptionInfo
    ): FreeRunApiSpec {
        const classified = this.classifyEndpoints(endpoints);

        const spec: FreeRunApiSpec = {
            endpoints: {
                submit: this.selectBestEndpoint(classified.submit, baseUrl),
                query: this.selectBestEndpoint(classified.query, baseUrl),
                detail: this.selectBestEndpoint(classified.detail, baseUrl)
            },
            requestFormat: this.generateRequestSchema(endpoints),
            responseFormat: this.generateResponseSchema(endpoints),
            encryption: encryptionInfo
        };

        this.apiSpec = spec;
        this.recordGeneration(spec, endpoints.length);

        return spec;
    }

    /**
     * 对端点进行分类
     * @param endpoints - 端点列表
     * @returns 分类后的端点
     */
    private classifyEndpoints(endpoints: ApiEndpoint[]): ClassifiedEndpoints {
        const classification: ClassifiedEndpoints = {
            submit: [],
            query: [],
            detail: [],
            other: []
        };

        endpoints.forEach(endpoint => {
            const path = endpoint.path.toLowerCase();
            const method = endpoint.method;

            if (method === 'POST' && this.isSubmitEndpoint(path)) {
                classification.submit.push(endpoint);
            } else if (method === 'GET' && this.isQueryEndpoint(path)) {
                classification.query.push(endpoint);
            } else if (method === 'GET' && this.isDetailEndpoint(path)) {
                classification.detail.push(endpoint);
            } else {
                classification.other.push(endpoint);
            }
        });

        return classification;
    }

    /**
     * 判断是否为提交端点
     * @param path - 端点路径
     * @returns 是否为提交端点
     */
    private isSubmitEndpoint(path: string): boolean {
        const submitKeywords = ['submit', 'create', 'add', 'freerun', 'recreord'];
        return submitKeywords.some(keyword => path.includes(keyword));
    }

    /**
     * 判断是否为查询端点
     * @param path - 端点路径
     * @returns 是否为查询端点
     */
    private isQueryEndpoint(path: string): boolean {
        const queryKeywords = ['list', 'query', 'search', 'records', 'history'];
        return queryKeywords.some(keyword => path.includes(keyword));
    }

    /**
     * 判断是否为详情端点
     * @param path - 端点路径
     * @returns 是否为详情端点
     */
    private isDetailEndpoint(path: string): boolean {
        const detailKeywords = ['detail', 'info', 'get'];
        return detailKeywords.some(keyword => path.includes(keyword)) || /\/\d+$/.test(path);
    }

    /**
     * 选择最佳端点
     * @param endpoints - 候选端点列表
     * @param baseUrl - 基础URL
     * @returns 最佳端点URL
     */
    private selectBestEndpoint(endpoints: ApiEndpoint[], baseUrl: string): string {
        if (endpoints.length === 0) return '';

        // 按频率排序，选择使用最频繁的端点
        const sorted = endpoints.sort((a, b) => b.frequency - a.frequency);
        return `${baseUrl}${sorted[0].path}`;
    }

    /**
     * 生成请求格式规范
     * @param endpoints - 端点列表
     * @returns 请求格式规范
     */
    private generateRequestSchema(endpoints: ApiEndpoint[]): RequestSchema {
        const allFields = new Set<string>();
        const fieldTypes: Record<string, string> = {};
        const fieldFrequency: Record<string, number> = {};

        endpoints.forEach(endpoint => {
            if (endpoint.sampleRequest && typeof endpoint.sampleRequest === 'object') {
                this.extractSchemaFields(endpoint.sampleRequest, '', allFields, fieldTypes, fieldFrequency);
            }
        });

        return this.buildSchema(allFields, fieldTypes, fieldFrequency, endpoints.length);
    }

    /**
     * 生成响应格式规范
     * @param endpoints - 端点列表
     * @returns 响应格式规范
     */
    private generateResponseSchema(endpoints: ApiEndpoint[]): RequestSchema {
        const allFields = new Set<string>();
        const fieldTypes: Record<string, string> = {};
        const fieldFrequency: Record<string, number> = {};

        endpoints.forEach(endpoint => {
            if (endpoint.sampleResponse && typeof endpoint.sampleResponse === 'object') {
                this.extractSchemaFields(endpoint.sampleResponse, '', allFields, fieldTypes, fieldFrequency);
            }
        });

        return this.buildSchema(allFields, fieldTypes, fieldFrequency, endpoints.length, 0.6);
    }

    /**
     * 提取格式规范字段
     * @param obj - 对象
     * @param prefix - 前缀
     * @param allFields - 所有字段集合
     * @param fieldTypes - 字段类型映射
     * @param fieldFrequency - 字段频率映射
     */
    private extractSchemaFields(
        obj: any,
        prefix: string,
        allFields: Set<string>,
        fieldTypes: Record<string, string>,
        fieldFrequency: Record<string, number>
    ): void {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            const type = this.inferType(value);

            allFields.add(fullKey);
            fieldFrequency[fullKey] = (fieldFrequency[fullKey] || 0) + 1;

            if (!fieldTypes[fullKey]) {
                fieldTypes[fullKey] = type;
            }

            // 递归处理嵌套对象
            if (type === 'object') {
                this.extractSchemaFields(value, fullKey, allFields, fieldTypes, fieldFrequency);
            }
        });
    }

    /**
     * 构建格式规范
     * @param allFields - 所有字段
     * @param fieldTypes - 字段类型
     * @param fieldFrequency - 字段频率
     * @param totalSamples - 总样本数
     * @param requiredThreshold - 必需字段阈值
     * @returns 格式规范
     */
    private buildSchema(
        allFields: Set<string>,
        fieldTypes: Record<string, string>,
        fieldFrequency: Record<string, number>,
        totalSamples: number,
        requiredThreshold: number = 0.8
    ): RequestSchema {
        const requiredFields: string[] = [];
        const optionalFields: string[] = [];
        const validation: Record<string, any> = {};

        Array.from(allFields).forEach(field => {
            const frequency = fieldFrequency[field] / totalSamples;
            const isRequired = frequency >= requiredThreshold;

            if (isRequired) {
                requiredFields.push(field);
            } else {
                optionalFields.push(field);
            }

            validation[field] = {
                type: fieldTypes[field],
                required: isRequired
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
     * 推断类型
     * @param value - 值
     * @returns 类型字符串
     */
    private inferType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    /**
     * 生成TypeScript接口定义
     * @param spec - API规格
     * @returns TypeScript接口代码
     */
    generateTypeScriptInterfaces(spec?: FreeRunApiSpec): string {
        const apiSpec = spec || this.apiSpec;
        if (!apiSpec) {
            throw new Error('No API specification available. Generate spec first.');
        }

        const interfaces: string[] = [];

        // 生成请求接口
        interfaces.push(this.generateRequestInterface(apiSpec.requestFormat));

        // 生成响应接口
        interfaces.push(this.generateResponseInterface(apiSpec.responseFormat));

        // 生成端点配置接口
        interfaces.push(this.generateEndpointsInterface(apiSpec.endpoints));

        // 生成加密配置接口
        interfaces.push(this.generateEncryptionInterface(apiSpec.encryption));

        // 生成完整的API规格接口
        interfaces.push(this.generateApiSpecInterface());

        return interfaces.join('\n\n');
    }

    /**
     * 生成请求接口
     * @param schema - 请求格式规范
     * @returns TypeScript接口代码
     */
    private generateRequestInterface(schema: RequestSchema): string {
        const fields: string[] = [];

        // 必需字段
        schema.requiredFields.forEach(field => {
            const type = this.mapToTypeScriptType(schema.fieldTypes[field]);
            fields.push(`  ${field}: ${type};`);
        });

        // 可选字段
        schema.optionalFields.forEach(field => {
            const type = this.mapToTypeScriptType(schema.fieldTypes[field]);
            fields.push(`  ${field}?: ${type};`);
        });

        return `export interface FreeRunRequest {
${fields.join('\n')}
}`;
    }

    /**
     * 生成响应接口
     * @param schema - 响应格式规范
     * @returns TypeScript接口代码
     */
    private generateResponseInterface(schema: RequestSchema): string {
        const fields: string[] = [];

        // 必需字段
        schema.requiredFields.forEach(field => {
            const type = this.mapToTypeScriptType(schema.fieldTypes[field]);
            fields.push(`  ${field}: ${type};`);
        });

        // 可选字段
        schema.optionalFields.forEach(field => {
            const type = this.mapToTypeScriptType(schema.fieldTypes[field]);
            fields.push(`  ${field}?: ${type};`);
        });

        return `export interface FreeRunResponse {
${fields.join('\n')}
}`;
    }

    /**
     * 生成端点配置接口
     * @param endpoints - 端点配置
     * @returns TypeScript接口代码
     */
    private generateEndpointsInterface(endpoints: any): string {
        return `export interface FreeRunEndpoints {
  submit: string;
  query: string;
  detail: string;
}`;
    }

    /**
     * 生成加密配置接口
     * @param encryption - 加密信息
     * @returns TypeScript接口代码
     */
    private generateEncryptionInterface(encryption: EncryptionInfo): string {
        return `export interface FreeRunEncryption {
  algorithm: '${encryption.algorithm}';
  keySize: ${encryption.keySize};
  padding: '${encryption.padding}';
  publicKey?: string;
  privateKey?: string;
}`;
    }

    /**
     * 生成API规格接口
     * @returns TypeScript接口代码
     */
    private generateApiSpecInterface(): string {
        return `export interface FreeRunApiSpecification {
  endpoints: FreeRunEndpoints;
  requestFormat: RequestSchema;
  responseFormat: RequestSchema;
  encryption: FreeRunEncryption;
}`;
    }

    /**
     * 映射到TypeScript类型
     * @param type - 原始类型
     * @returns TypeScript类型
     */
    private mapToTypeScriptType(type: string): string {
        const typeMap: Record<string, string> = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'object': 'Record<string, any>',
            'array': 'any[]',
            'null': 'null'
        };

        return typeMap[type] || 'any';
    }

    /**
     * 验证API规格
     * @param spec - 要验证的API规格
     * @returns 验证结果
     */
    validateApiSpec(spec: FreeRunApiSpec): SpecValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证端点
        if (!spec.endpoints.submit) {
            errors.push('Submit endpoint is required');
        }
        if (!spec.endpoints.query) {
            warnings.push('Query endpoint is recommended');
        }
        if (!spec.endpoints.detail) {
            warnings.push('Detail endpoint is recommended');
        }

        // 验证请求格式
        if (spec.requestFormat.requiredFields.length === 0) {
            warnings.push('No required fields in request format');
        }

        // 验证响应格式
        if (spec.responseFormat.requiredFields.length === 0) {
            warnings.push('No required fields in response format');
        }

        // 验证加密信息
        if (!spec.encryption.algorithm) {
            errors.push('Encryption algorithm is required');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: this.calculateSpecScore(spec, errors.length, warnings.length)
        };
    }

    /**
     * 计算规格评分
     * @param spec - API规格
     * @param errorCount - 错误数量
     * @param warningCount - 警告数量
     * @returns 评分（0-100）
     */
    private calculateSpecScore(spec: FreeRunApiSpec, errorCount: number, warningCount: number): number {
        let score = 100;

        // 错误扣分
        score -= errorCount * 20;

        // 警告扣分
        score -= warningCount * 5;

        // 完整性加分
        if (spec.endpoints.submit && spec.endpoints.query && spec.endpoints.detail) {
            score += 10;
        }

        if (spec.requestFormat.requiredFields.length > 0) {
            score += 5;
        }

        if (spec.responseFormat.requiredFields.length > 0) {
            score += 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * 更新API规格
     * @param updates - 更新内容
     * @returns 更新后的API规格
     */
    updateApiSpec(updates: Partial<FreeRunApiSpec>): FreeRunApiSpec {
        if (!this.apiSpec) {
            throw new Error('No existing API specification to update');
        }

        this.apiSpec = {
            ...this.apiSpec,
            ...updates
        };

        this.recordGeneration(this.apiSpec, 0, 'update');

        return this.apiSpec;
    }

    /**
     * 记录生成历史
     * @param spec - API规格
     * @param endpointCount - 端点数量
     * @param type - 操作类型
     */
    private recordGeneration(spec: FreeRunApiSpec, endpointCount: number, type: 'generate' | 'update' = 'generate'): void {
        this.generationHistory.push({
            timestamp: Date.now(),
            type,
            spec: JSON.parse(JSON.stringify(spec)), // 深拷贝
            endpointCount,
            validation: this.validateApiSpec(spec)
        });

        // 保留最近10条记录
        if (this.generationHistory.length > 10) {
            this.generationHistory = this.generationHistory.slice(-10);
        }
    }

    /**
     * 获取当前API规格
     * @returns 当前API规格
     */
    getCurrentSpec(): FreeRunApiSpec | null {
        return this.apiSpec ? JSON.parse(JSON.stringify(this.apiSpec)) : null;
    }

    /**
     * 获取生成历史
     * @returns 生成历史记录
     */
    getGenerationHistory(): GenerationRecord[] {
        return [...this.generationHistory];
    }

    /**
     * 导出API文档
     * @param format - 导出格式
     * @returns 导出的文档内容
     */
    exportDocumentation(format: 'markdown' | 'json' | 'typescript' = 'markdown'): string {
        if (!this.apiSpec) {
            throw new Error('No API specification available');
        }

        switch (format) {
            case 'markdown':
                return this.generateMarkdownDoc(this.apiSpec);
            case 'json':
                return JSON.stringify(this.apiSpec, null, 2);
            case 'typescript':
                return this.generateTypeScriptInterfaces(this.apiSpec);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * 生成Markdown文档
     * @param spec - API规格
     * @returns Markdown文档内容
     */
    private generateMarkdownDoc(spec: FreeRunApiSpec): string {
        const sections: string[] = [];

        sections.push('# Free Run API Specification\n');

        // 端点部分
        sections.push('## Endpoints\n');
        sections.push(`- **Submit**: \`${spec.endpoints.submit}\``);
        sections.push(`- **Query**: \`${spec.endpoints.query}\``);
        sections.push(`- **Detail**: \`${spec.endpoints.detail}\`\n`);

        // 请求格式部分
        sections.push('## Request Format\n');
        sections.push('### Required Fields\n');
        spec.requestFormat.requiredFields.forEach(field => {
            const type = spec.requestFormat.fieldTypes[field];
            sections.push(`- \`${field}\`: ${type}`);
        });

        if (spec.requestFormat.optionalFields.length > 0) {
            sections.push('\n### Optional Fields\n');
            spec.requestFormat.optionalFields.forEach(field => {
                const type = spec.requestFormat.fieldTypes[field];
                sections.push(`- \`${field}\`: ${type}`);
            });
        }

        // 响应格式部分
        sections.push('\n## Response Format\n');
        sections.push('### Required Fields\n');
        spec.responseFormat.requiredFields.forEach(field => {
            const type = spec.responseFormat.fieldTypes[field];
            sections.push(`- \`${field}\`: ${type}`);
        });

        if (spec.responseFormat.optionalFields.length > 0) {
            sections.push('\n### Optional Fields\n');
            spec.responseFormat.optionalFields.forEach(field => {
                const type = spec.responseFormat.fieldTypes[field];
                sections.push(`- \`${field}\`: ${type}`);
            });
        }

        // 加密信息部分
        sections.push('\n## Encryption\n');
        sections.push(`- **Algorithm**: ${spec.encryption.algorithm}`);
        sections.push(`- **Key Size**: ${spec.encryption.keySize} bits`);
        sections.push(`- **Padding**: ${spec.encryption.padding}`);

        return sections.join('\n');
    }
}

/**
 * 分类后的端点接口
 */
interface ClassifiedEndpoints {
    submit: ApiEndpoint[];
    query: ApiEndpoint[];
    detail: ApiEndpoint[];
    other: ApiEndpoint[];
}

/**
 * 规格验证结果接口
 */
interface SpecValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    score: number;
}

/**
 * 生成记录接口
 */
interface GenerationRecord {
    timestamp: number;
    type: 'generate' | 'update';
    spec: FreeRunApiSpec;
    endpointCount: number;
    validation: SpecValidationResult;
}