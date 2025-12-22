import type { EncryptionInfo } from '../types/reverseEngineering/NetworkTypes.d.ts';
import rsaKeys from '../data/rsaKeys';
import NodeRSA from '../utils/nodeRSA';
import encryptRequestContent from '../utils/encryptRequestContent';
import decryptRequestContent from '../utils/decryptRequestContent';

/**
 * EncryptionVerifier - 用于验证自由跑是否使用相同RSA加密的类
 * 测试现有密钥对自由跑数据的兼容性，管理加密参数配置
 */
export default class EncryptionVerifier {
    private currentConfig: EncryptionConfig;
    private testResults: Map<string, EncryptionTestResult> = new Map();

    constructor() {
        this.currentConfig = {
            algorithm: 'RSA',
            keySize: 2048,
            padding: 'PKCS1',
            publicKey: rsaKeys.publicKey,
            privateKey: rsaKeys.privateKey,
            encryptionScheme: 'pkcs1'
        };
    }

    /**
     * 验证自由跑数据是否使用相同的RSA加密
     * @param sampleData - 样本数据对象
     * @returns 验证结果
     */
    async verifyFreeRunEncryption(sampleData: Record<string, any>): Promise<EncryptionVerificationResult> {
        const testId = `freerun_${Date.now()}`;

        try {
            // 测试1: 使用现有密钥加密样本数据
            const encryptionTest = await this.testEncryption(sampleData, testId);

            // 测试2: 验证往返一致性
            const roundTripTest = await this.testRoundTrip(sampleData, testId);

            // 测试3: 验证密钥兼容性
            const keyCompatibilityTest = await this.testKeyCompatibility(testId);

            // 测试4: 验证加密参数
            const parameterTest = await this.testEncryptionParameters(testId);

            const result: EncryptionVerificationResult = {
                testId,
                compatible: encryptionTest.success && roundTripTest.success && keyCompatibilityTest.success,
                encryptionTest,
                roundTripTest,
                keyCompatibilityTest,
                parameterTest,
                recommendedConfig: this.generateRecommendedConfig(),
                timestamp: Date.now()
            };

            this.testResults.set(testId, {
                testId,
                success: result.compatible,
                details: result,
                timestamp: result.timestamp
            });

            return result;
        } catch (error) {
            const errorResult: EncryptionVerificationResult = {
                testId,
                compatible: false,
                encryptionTest: { success: false, error: error.message },
                roundTripTest: { success: false, error: error.message },
                keyCompatibilityTest: { success: false, error: error.message },
                parameterTest: { success: false, error: error.message },
                recommendedConfig: this.currentConfig,
                timestamp: Date.now()
            };

            this.testResults.set(testId, {
                testId,
                success: false,
                details: errorResult,
                timestamp: errorResult.timestamp
            });

            return errorResult;
        }
    }

    /**
     * 测试加密功能
     * @param data - 要加密的数据
     * @param testId - 测试ID
     * @returns 加密测试结果
     */
    private async testEncryption(data: Record<string, any>, testId: string): Promise<TestResult> {
        try {
            const encrypted = encryptRequestContent(data);

            if (!encrypted || typeof encrypted !== 'string') {
                return {
                    success: false,
                    error: 'Encryption failed: no encrypted data returned'
                };
            }

            // 验证加密结果是否为有效的Base64
            try {
                Buffer.from(encrypted, 'base64');
            } catch {
                return {
                    success: false,
                    error: 'Encryption failed: result is not valid Base64'
                };
            }

            return {
                success: true,
                data: {
                    originalSize: JSON.stringify(data).length,
                    encryptedSize: encrypted.length,
                    encryptedData: encrypted.substring(0, 100) + '...' // 只保留前100个字符用于调试
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Encryption test failed: ${error.message}`
            };
        }
    }

    /**
     * 测试往返一致性（加密后解密）
     * @param data - 原始数据
     * @param testId - 测试ID
     * @returns 往返测试结果
     */
    private async testRoundTrip(data: Record<string, any>, testId: string): Promise<TestResult> {
        try {
            // 加密数据
            const encrypted = encryptRequestContent(data);

            // 解密数据
            const rsa = new NodeRSA(this.currentConfig.privateKey);
            rsa.setOptions({ encryptionScheme: this.currentConfig.encryptionScheme });
            const decrypted = JSON.parse(rsa.decrypt(encrypted, 'utf8'));

            // 比较原始数据和解密后的数据
            const isEqual = this.deepEqual(data, decrypted);

            if (!isEqual) {
                return {
                    success: false,
                    error: 'Round trip failed: decrypted data does not match original',
                    data: {
                        original: data,
                        decrypted: decrypted
                    }
                };
            }

            return {
                success: true,
                data: {
                    roundTripSuccessful: true,
                    dataIntegrity: 'preserved'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Round trip test failed: ${error.message}`
            };
        }
    }

    /**
     * 测试密钥兼容性
     * @param testId - 测试ID
     * @returns 密钥兼容性测试结果
     */
    private async testKeyCompatibility(testId: string): Promise<TestResult> {
        try {
            const rsa = new NodeRSA();

            // 测试导入现有密钥
            rsa.importKey(this.currentConfig.privateKey, 'private');
            rsa.importKey(this.currentConfig.publicKey, 'public');

            // 验证密钥信息
            const keySize = rsa.getKeySize();
            const maxMessageLength = rsa.getMaxMessageSize();

            if (keySize !== this.currentConfig.keySize) {
                return {
                    success: false,
                    error: `Key size mismatch: expected ${this.currentConfig.keySize}, got ${keySize}`
                };
            }

            return {
                success: true,
                data: {
                    keySize,
                    maxMessageLength,
                    keyFormat: 'PEM',
                    compatible: true
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Key compatibility test failed: ${error.message}`
            };
        }
    }

    /**
     * 测试加密参数
     * @param testId - 测试ID
     * @returns 参数测试结果
     */
    private async testEncryptionParameters(testId: string): Promise<TestResult> {
        try {
            const rsa = new NodeRSA(this.currentConfig.privateKey);

            // 测试不同的加密方案
            const schemes = ['pkcs1', 'pkcs1_oaep'];
            const results: Record<string, boolean> = {};

            for (const scheme of schemes) {
                try {
                    rsa.setOptions({ encryptionScheme: scheme });
                    const testData = { test: 'parameter_validation' };
                    const encrypted = rsa.encrypt(JSON.stringify(testData), 'base64');
                    const decrypted = JSON.parse(rsa.decrypt(encrypted, 'utf8'));
                    results[scheme] = this.deepEqual(testData, decrypted);
                } catch {
                    results[scheme] = false;
                }
            }

            return {
                success: true,
                data: {
                    supportedSchemes: results,
                    currentScheme: this.currentConfig.encryptionScheme,
                    recommendedScheme: results.pkcs1 ? 'pkcs1' : 'pkcs1_oaep'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Parameter test failed: ${error.message}`
            };
        }
    }

    /**
     * 生成推荐的加密配置
     * @returns 推荐的加密配置
     */
    private generateRecommendedConfig(): EncryptionConfig {
        return {
            ...this.currentConfig,
            // 基于测试结果可能会调整参数
            verified: true,
            lastVerified: Date.now()
        };
    }

    /**
     * 深度比较两个对象是否相等
     * @param obj1 - 对象1
     * @param obj2 - 对象2
     * @returns 是否相等
     */
    private deepEqual(obj1: any, obj2: any): boolean {
        if (obj1 === obj2) return true;

        if (obj1 == null || obj2 == null) return obj1 === obj2;

        if (typeof obj1 !== typeof obj2) return false;

        if (typeof obj1 !== 'object') return obj1 === obj2;

        if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        for (const key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!this.deepEqual(obj1[key], obj2[key])) return false;
        }

        return true;
    }

    /**
     * 更新加密配置
     * @param config - 新的加密配置
     */
    updateConfig(config: Partial<EncryptionConfig>): void {
        this.currentConfig = { ...this.currentConfig, ...config };
    }

    /**
     * 获取当前加密配置
     * @returns 当前加密配置
     */
    getCurrentConfig(): EncryptionConfig {
        return { ...this.currentConfig };
    }

    /**
     * 获取测试历史
     * @returns 测试结果历史
     */
    getTestHistory(): EncryptionTestResult[] {
        return Array.from(this.testResults.values()).sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * 获取最新的测试结果
     * @returns 最新的测试结果
     */
    getLatestTestResult(): EncryptionTestResult | undefined {
        const history = this.getTestHistory();
        return history.length > 0 ? history[0] : undefined;
    }

    /**
     * 清除测试历史
     */
    clearTestHistory(): void {
        this.testResults.clear();
    }

    /**
     * 验证加密信息对象
     * @param encryptionInfo - 要验证的加密信息
     * @returns 验证结果
     */
    validateEncryptionInfo(encryptionInfo: EncryptionInfo): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 验证算法
        if (!encryptionInfo.algorithm || encryptionInfo.algorithm !== 'RSA') {
            errors.push('Algorithm must be RSA');
        }

        // 验证密钥大小
        if (!encryptionInfo.keySize || encryptionInfo.keySize < 1024) {
            errors.push('Key size must be at least 1024 bits');
        } else if (encryptionInfo.keySize < 2048) {
            warnings.push('Key size less than 2048 bits is not recommended');
        }

        // 验证填充方式
        if (!encryptionInfo.padding || !['PKCS1', 'OAEP'].includes(encryptionInfo.padding)) {
            errors.push('Padding must be PKCS1 or OAEP');
        }

        // 验证密钥格式
        if (encryptionInfo.publicKey && !encryptionInfo.publicKey.includes('BEGIN PUBLIC KEY')) {
            errors.push('Public key must be in PEM format');
        }

        if (encryptionInfo.privateKey && !encryptionInfo.privateKey.includes('BEGIN PRIVATE KEY')) {
            errors.push('Private key must be in PEM format');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 生成加密信息对象
     * @returns 加密信息对象
     */
    generateEncryptionInfo(): EncryptionInfo {
        return {
            algorithm: this.currentConfig.algorithm,
            keySize: this.currentConfig.keySize,
            padding: this.currentConfig.padding,
            publicKey: this.currentConfig.publicKey,
            privateKey: this.currentConfig.privateKey
        };
    }
}

/**
 * 加密配置接口
 */
interface EncryptionConfig {
    algorithm: string;
    keySize: number;
    padding: string;
    publicKey: string;
    privateKey: string;
    encryptionScheme: string;
    verified?: boolean;
    lastVerified?: number;
}

/**
 * 测试结果接口
 */
interface TestResult {
    success: boolean;
    error?: string;
    data?: any;
}

/**
 * 加密验证结果接口
 */
interface EncryptionVerificationResult {
    testId: string;
    compatible: boolean;
    encryptionTest: TestResult;
    roundTripTest: TestResult;
    keyCompatibilityTest: TestResult;
    parameterTest: TestResult;
    recommendedConfig: EncryptionConfig;
    timestamp: number;
}

/**
 * 加密测试结果接口
 */
interface EncryptionTestResult {
    testId: string;
    success: boolean;
    details: EncryptionVerificationResult;
    timestamp: number;
}

/**
 * 验证结果接口
 */
interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}