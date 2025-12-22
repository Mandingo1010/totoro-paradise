import type {
    NetworkRequest,
    RequestSchema,
    ValidationRule
} from '../types/reverseEngineering/NetworkTypes.d.ts';

/**
 * RequestFormatAnalyzer - 用于分析自由跑请求格式的类
 * 分析请求数据结构，推断字段类型，生成验证规则
 */
export default class RequestFormatAnalyzer {
    private requests: NetworkRequest[] = [];
    private fieldStatistics: Map<string, FieldStatistics> = new Map();

    /**
     * 添加请求样本进行分析
     * @param request - 网络请求对象
     */
    addRequest(request: NetworkRequest): void {
        this.requests.push(request);
        this.analyzeRequestFields(request);
    }

    /**
     * 批量添加请求样本
     * @param requests - 网络请求数组
     */
    addRequests(requests: NetworkRequest[]): void {
        requests.forEach(request => this.addRequest(request));
    }

    /**
     * 分析单个请求的字段
     * @param request - 网络请求对象
     */
    private analyzeRequestFields(request: NetworkRequest): void {
        if (!request.body) return;

        try {
            const bodyObj = JSON.parse(request.body);
            this.extractFields(bodyObj, '');
        } catch {
            // 非JSON数据，跳过
        }
    }

    /**
     * 递归提取字段信息
     * @param obj - 要分析的对象
     * @param prefix - 字段路径前缀
     */
    private extractFields(obj: any, prefix: string): void {
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
                    patterns: new Set()
                });
            }

            const stats = this.fieldStatistics.get(fullKey)!;
            stats.count++;
            stats.types.set(type, (stats.types.get(type) || 0) + 1);

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
            } else if (type === 'number') {
                const numValue = value as number;
                stats.minValue = Math.min(stats.minValue, numValue);
                stats.maxValue = Math.max(stats.maxValue, numValue);
            }

            // 递归处理嵌套对象
            if (type === 'object') {
                this.extractFields(value, fullKey);
            } else if (type === 'array' && Array.isArray(value) && value.length > 0) {
                // 分析数组元素
                value.forEach((item, index) => {
                    if (typeof item === 'object') {
                        this.extractFields(item, `${fullKey}[${index}]`);
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
    }

    /**
     * 生成请求格式规范
     * @param requiredThreshold - 必需字段的出现频率阈值（0-1）
     * @returns 请求格式规范
     */
    generateSchema(requiredThreshold: number = 0.8): RequestSchema {
        const totalRequests = this.requests.length;
        const requiredFields: string[] = [];
        const optionalFields: string[] = [];
        const fieldTypes: Record<string, string> = {};
        const validation: Record<string, ValidationRule> = {};

        this.fieldStatistics.forEach((stats, fieldName) => {
            // 确定字段是否必需
            const frequency = stats.count / totalRequests;
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
     * 清除所有分析数据
     */
    clear(): void {
        this.requests = [];
        this.fieldStatistics.clear();
    }

    /**
     * 获取分析摘要
     * @returns 分析摘要信息
     */
    getSummary(): AnalysisSummary {
        return {
            totalRequests: this.requests.length,
            totalFields: this.fieldStatistics.size,
            fieldFrequency: this.calculateFieldFrequency(),
            commonPatterns: this.getCommonPatterns()
        };
    }

    /**
     * 计算字段出现频率
     * @returns 字段频率映射
     */
    private calculateFieldFrequency(): Record<string, number> {
        const frequency: Record<string, number> = {};
        const total = this.requests.length;

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
 * 字段统计信息接口
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
}

/**
 * 分析摘要接口
 */
interface AnalysisSummary {
    totalRequests: number;
    totalFields: number;
    fieldFrequency: Record<string, number>;
    commonPatterns: Record<string, number>;
}
