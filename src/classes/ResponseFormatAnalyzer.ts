import type {
    NetworkResponse,
    RequestSchema,
    ValidationRule
} from '../types/reverseEngineering/NetworkTypes.d.ts';

/**
 * ResponseFormatAnalyzer - 用于分析自由跑响应格式的类
 * 分析响应数据结构，推断字段类型，生成验证规则
 */
export default class ResponseFormatAnalyzer {
    private responses: NetworkResponse[] = [];
    private fieldStatistics: Map<string, FieldStatistics> = new Map();
    private statusCodeStats: Map<number, number> = new Map();
    private errorPatterns: Map<string, number> = new Map();

    /**
     * 添加响应样本进行分析
     * @param response - 网络响应对象
     */
    addResponse(response: NetworkResponse): void {
        this.responses.push(response);
        this.analyzeResponseFields(response);
        this.analyzeStatusCode(response);
    }

    /**
     * 批量添加响应样本
     * @param responses - 网络响应数组
     */
    addResponses(responses: NetworkResponse[]): void {
        responses.forEach(response => this.addResponse(response));
    }

    /**
     * 分析单个响应的字段
     * @param response - 网络响应对象
     */
    private analyzeResponseFields(response: NetworkResponse): void {
        if (!response.body) return;

        try {
            const bodyObj = JSON.parse(response.body);
            this.extractFields(bodyObj, '', response.status);
        } catch {
            // 非JSON数据，分析为文本
            this.analyzeTextResponse(response);
        }
    }

    /**
     * 分析状态码
     * @param response - 网络响应对象
     */
    private analyzeStatusCode(response: NetworkResponse): void {
        const count = this.statusCodeStats.get(response.status) || 0;
        this.statusCodeStats.set(response.status, count + 1);
    }

    /**
     * 分析文本响应
     * @param response - 网络响应对象
     */
    private analyzeTextResponse(response: NetworkResponse): void {
        const fieldName = '_raw_response';
        const type = 'string';

        if (!this.fieldStatistics.has(fieldName)) {
            this.fieldStatistics.set(fieldName, {
                count: 0,
                types: new Map(),
                values: [],
                minLength: Infinity,
                maxLength: 0,
                minValue: Infinity,
                maxValue: -Infinity,
                patterns: new Set(),
                statusCodes: new Set()
            });
        }

        const stats = this.fieldStatistics.get(fieldName)!;
        stats.count++;
        stats.types.set(type, (stats.types.get(type) || 0) + 1);
        stats.statusCodes.add(response.status);

        if (stats.values.length < 10) {
            stats.values.push(response.body);
        }

        stats.minLength = Math.min(stats.minLength, response.body.length);
        stats.maxLength = Math.max(stats.maxLength, response.body.length);
    }

    /**
     * 递归提取字段信息
     * @param obj - 要分析的对象
     * @param prefix - 字段路径前缀
     * @param statusCode - HTTP状态码
     */
    private extractFields(obj: any, prefix: string, statusCode: number): void {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const value = obj[key];
            const type = this.inferType(value);

            if (!this.fieldStatistics.has(fullKey)) {
                this.fieldStatistics.set(fullKey, {
                    count: 0,
                    types: new Map(),
                    values: [],
                    minLength: Infinity,
                    maxLength: 0,
                    minValue: Infinity,
                    maxValue: -Infinity,
                    patterns: new Set(),
                    statusCodes: new Set()
                });
            }

            const stats = this.fieldStatistics.get(fullKey)!;
            stats.count++;
            stats.types.set(type, (stats.types.get(type) || 0) + 1);
            stats.statusCodes.add(statusCode);

            // 收集值样本（最多保留10个）
            if (stats.values.length < 10) {
                stats.values.push(value);
            }

            // 更新统计信息
            if (type === 'string') {
                const strValue = value as string;
                stats.minLength = Math.min(stats.minLength, strValue.length);
                stats.maxLength = Math.max(stats.maxLength, strValue.length);
                this.detectPattern(strValue, stats);
                this.detectErrorPattern(key, strValue, statusCode);
            } else if (type === 'number') {
                const numValue = value as number;
                stats.minValue = Math.min(stats.minValue, numValue);
                stats.maxValue = Math.max(stats.maxValue, numValue);
            }

            // 递归处理嵌套对象
            if (type === 'object') {
                this.extractFields(value, fullKey, statusCode);
            } else if (type === 'array' && Array.isArray(value) && value.length > 0) {
                // 分析数组元素
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        this.extractFields(item, `${fullKey}[${index}]`, statusCode);
                    }
                });
            }
        });
    }

    /**
     * 推断值的类型
     * @param value - 要推断类型的值
     * @returns 类型字符串
     */
    private inferType(value: any): string {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }

    /**
     * 检测字符串模式
     * @param value - 字符串值
     * @param stats - 字段统计信息
     */
    private detectPattern(value: string, stats: FieldStatistics): void {
        // 检测常见模式
        if (/^\d+$/.test(value)) {
            stats.patterns.add('numeric_string');
        }
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
            stats.patterns.add('email');
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            stats.patterns.add('date');
        }
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
            stats.patterns.add('uuid');
        }
        if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value)) {
            stats.patterns.add('mac_address');
        }
        if (/^(success|ok|true)$/i.test(value)) {
            stats.patterns.add('success_indicator');
        }
        if (/^(error|fail|false)$/i.test(value)) {
            stats.patterns.add('error_indicator');
        }
    }

    /**
     * 检测错误模式
     * @param fieldName - 字段名称
     * @param value - 字段值
     * @param statusCode - HTTP状态码
     */
    private detectErrorPattern(fieldName: string, value: string, statusCode: number): void {
        if (statusCode >= 400) {
            const errorKey = `${fieldName}:${value}`;
            const count = this.errorPatterns.get(errorKey) || 0;
            this.errorPatterns.set(errorKey, count + 1);
        }
    }

    /**
     * 生成响应格式规范
     * @param requiredThreshold - 必需字段的出现频率阈值（0-1）
     * @returns 响应格式规范
     */
    generateSchema(requiredThreshold: number = 0.7): RequestSchema {
        const totalResponses = this.responses.length;
        const requiredFields: string[] = [];
        const optionalFields: string[] = [];
        const fieldTypes: Record<string, string> = {};
        const validation: Record<string, ValidationRule> = {};

        this.fieldStatistics.forEach((stats, fieldName) => {
            // 确定字段是否必需（响应字段的必需性阈值通常比请求低）
            const frequency = stats.count / totalResponses;
            const isRequired = frequency >= requiredThreshold;

            if (isRequired) {
                requiredFields.push(fieldName);
            } else {
                optionalFields.push(fieldName);
            }

            // 确定主要类型（出现最多的类型）
            let primaryType = 'string';
            let maxCount = 0;
            stats.types.forEach((count, type) => {
                if (count > maxCount) {
                    maxCount = count;
                    primaryType = type;
                }
            });
            fieldTypes[fieldName] = primaryType;

            // 生成验证规则
            const rule: ValidationRule = {
                type: primaryType as any,
                required: isRequired
            };

            // 添加额外的验证约束
            if (primaryType === 'string') {
                if (stats.minLength !== Infinity && stats.maxLength !== 0) {
                    rule.min = stats.minLength;
                    rule.max = stats.maxLength;
                }
                // 如果检测到特定模式，添加模式验证
                if (stats.patterns.size > 0) {
                    const pattern = Array.from(stats.patterns)[0];
                    rule.pattern = pattern;
                }
            } else if (primaryType === 'number') {
                if (stats.minValue !== Infinity && stats.maxValue !== -Infinity) {
                    rule.min = stats.minValue;
                    rule.max = stats.maxValue;
                }
            }

            validation[fieldName] = rule;
        });

        return {
            requiredFields,
            optionalFields,
            fieldTypes,
            validation
        };
    }

    /**
     * 获取成功响应格式
     * @returns 成功响应的格式规范
     */
    getSuccessResponseSchema(): RequestSchema {
        return this.getSchemaByStatusCode([200, 201, 202]);
    }

    /**
     * 获取错误响应格式
     * @returns 错误响应的格式规范
     */
    getErrorResponseSchema(): RequestSchema {
        return this.getSchemaByStatusCode([400, 401, 403, 404, 500, 502, 503]);
    }

    /**
     * 根据状态码获取响应格式
     * @param statusCodes - 状态码数组
     * @returns 响应格式规范
     */
    private getSchemaByStatusCode(statusCodes: number[]): RequestSchema {
        const filteredFields = new Map<string, FieldStatistics>();

        this.fieldStatistics.forEach((stats, fieldName) => {
            // 检查该字段是否在指定状态码的响应中出现
            const hasMatchingStatus = Array.from(stats.statusCodes).some(code =>
                statusCodes.includes(code)
            );

            if (hasMatchingStatus) {
                filteredFields.set(fieldName, stats);
            }
        });

        // 基于过滤后的字段生成格式规范
        const requiredFields: string[] = [];
        const optionalFields: string[] = [];
        const fieldTypes: Record<string, string> = {};
        const validation: Record<string, ValidationRule> = {};

        const relevantResponses = this.responses.filter(r => statusCodes.includes(r.status));
        const totalRelevantResponses = relevantResponses.length;

        filteredFields.forEach((stats, fieldName) => {
            const frequency = stats.count / totalRelevantResponses;
            const isRequired = frequency >= 0.7;

            if (isRequired) {
                requiredFields.push(fieldName);
            } else {
                optionalFields.push(fieldName);
            }

            let primaryType = 'string';
            let maxCount = 0;
            stats.types.forEach((count, type) => {
                if (count > maxCount) {
                    maxCount = count;
                    primaryType = type;
                }
            });
            fieldTypes[fieldName] = primaryType;

            validation[fieldName] = {
                type: primaryType as any,
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
     * 获取字段统计信息
     * @param fieldName - 字段名称
     * @returns 字段统计信息
     */
    getFieldStatistics(fieldName: string): FieldStatistics | undefined {
        return this.fieldStatistics.get(fieldName);
    }

    /**
     * 获取所有字段名称
     * @returns 字段名称数组
     */
    getAllFields(): string[] {
        return Array.from(this.fieldStatistics.keys());
    }

    /**
     * 获取状态码统计
     * @returns 状态码统计信息
     */
    getStatusCodeStatistics(): Record<number, number> {
        const stats: Record<number, number> = {};
        this.statusCodeStats.forEach((count, code) => {
            stats[code] = count;
        });
        return stats;
    }

    /**
     * 获取错误模式
     * @returns 错误模式统计
     */
    getErrorPatterns(): Record<string, number> {
        const patterns: Record<string, number> = {};
        this.errorPatterns.forEach((count, pattern) => {
            patterns[pattern] = count;
        });
        return patterns;
    }

    /**
     * 清除所有分析数据
     */
    clear(): void {
        this.responses = [];
        this.fieldStatistics.clear();
        this.statusCodeStats.clear();
        this.errorPatterns.clear();
    }

    /**
     * 获取分析摘要
     * @returns 分析摘要信息
     */
    getSummary(): ResponseAnalysisSummary {
        return {
            totalResponses: this.responses.length,
            totalFields: this.fieldStatistics.size,
            statusCodeDistribution: this.getStatusCodeStatistics(),
            fieldFrequency: this.calculateFieldFrequency(),
            commonPatterns: this.getCommonPatterns(),
            errorPatterns: this.getErrorPatterns()
        };
    }

    /**
     * 计算字段出现频率
     * @returns 字段频率映射
     */
    private calculateFieldFrequency(): Record<string, number> {
        const frequency: Record<string, number> = {};
        const total = this.responses.length;

        this.fieldStatistics.forEach((stats, fieldName) => {
            frequency[fieldName] = stats.count / total;
        });

        return frequency;
    }

    /**
     * 获取常见模式
     * @returns 模式统计
     */
    private getCommonPatterns(): Record<string, number> {
        const patterns: Record<string, number> = {};

        this.fieldStatistics.forEach(stats => {
            stats.patterns.forEach(pattern => {
                patterns[pattern] = (patterns[pattern] || 0) + 1;
            });
        });

        return patterns;
    }
}

/**
 * 字段统计信息接口（扩展版本，包含状态码信息）
 */
interface FieldStatistics {
    count: number;
    types: Map<string, number>;
    values: any[];
    minLength: number;
    maxLength: number;
    minValue: number;
    maxValue: number;
    patterns: Set<string>;
    statusCodes: Set<number>;
}

/**
 * 响应分析摘要接口
 */
interface ResponseAnalysisSummary {
    totalResponses: number;
    totalFields: number;
    statusCodeDistribution: Record<number, number>;
    fieldFrequency: Record<string, number>;
    commonPatterns: Record<string, number>;
    errorPatterns: Record<string, number>;
}