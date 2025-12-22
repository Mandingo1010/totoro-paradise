import type { FreeRunParams, BatchRunParams } from '../types/requestTypes/FreeRunRequest';
import type { RunData } from './RunCalculator';
import { RunCalculator } from './RunCalculator';
import { ParameterValidator } from './ParameterValidator';
import { TemplateManager } from './TemplateManager';
import { BatchDataGenerator } from './BatchDataGenerator';
import type { BatchResult } from './BatchDataGenerator';

export class FreeRunDataGenerator {
    private runCalculator: RunCalculator;
    private validator: ParameterValidator;
    private templateManager: TemplateManager;
    private batchGenerator: BatchDataGenerator;

    constructor() {
        this.runCalculator = new RunCalculator();
        this.validator = new ParameterValidator();
        this.templateManager = new TemplateManager();
        this.batchGenerator = new BatchDataGenerator();
    }

    /**
     * 生成单次自由跑数据
     * 需求 2.1, 2.2, 2.3, 2.4, 2.5: 集成参数验证和数据计算
     */
    async generateRunData(
        params: FreeRunParams,
        stuNumber: string,
        weight?: number,
        startTime?: Date,
        addVariation: boolean = true
    ): Promise<RunData> {
        // 验证参数
        const validation = this.validator.validateFreeRunParams(params);
        if (!validation.isValid) {
            throw new Error(`参数验证失败: ${validation.errors.join(', ')}`);
        }

        if (!stuNumber || stuNumber.trim().length === 0) {
            throw new Error('学号不能为空');
        }

        // 计算派生值
        const derivedValues = this.validator.calculateDerivedValues(params);

        // 确定最终的速度值
        let finalSpeed = params.avgSpeed;
        if (!finalSpeed) {
            if (params.targetTime) {
                finalSpeed = derivedValues.calculatedSpeed!;
            } else {
                // 如果既没有速度也没有时间，使用默认速度
                finalSpeed = 8; // 8 km/h 默认速度
            }
        }

        // 生成跑步数据
        return this.runCalculator.generateRunData(
            params.distance,
            finalSpeed,
            stuNumber,
            startTime,
            weight,
            addVariation
        );
    }

    /**
     * 生成批量自由跑数据
     * 需求 7.1, 7.4, 7.5: 实现随机化和变化算法
     */
    async generateBatchData(
        batchParams: BatchRunParams,
        stuNumber: string,
        weight?: number
    ): Promise<BatchResult[]> {
        return this.batchGenerator.generateBatchData(batchParams, stuNumber, weight);
    }

    /**
     * 验证自由跑参数
     */
    validateParameters(params: FreeRunParams) {
        return this.validator.validateFreeRunParams(params);
    }

    /**
     * 验证批量参数
     */
    validateBatchParameters(batchParams: BatchRunParams) {
        return this.validator.validateBatchParams(batchParams);
    }

    /**
     * 获取可用模板
     */
    getAvailableTemplates() {
        return this.templateManager.getAvailableTemplates();
    }

    /**
     * 应用模板
     */
    applyTemplate(templateId: string) {
        return this.templateManager.applyTemplate(templateId);
    }

    /**
     * 创建自定义模板
     */
    createCustomTemplate(name: string, params: FreeRunParams, description?: string) {
        return this.templateManager.createCustomTemplate(name, params, description);
    }

    /**
     * 推荐模板
     */
    recommendTemplate(distance: number, avgSpeed?: number) {
        return this.templateManager.recommendTemplate(distance, avgSpeed);
    }

    /**
     * 获取批量执行进度
     */
    getBatchProgress() {
        return this.batchGenerator.getProgress();
    }

    /**
     * 获取批量执行统计
     */
    getBatchStatistics() {
        return this.batchGenerator.getStatistics();
    }

    /**
     * 生成批量执行报告
     */
    generateBatchReport() {
        return this.batchGenerator.generateReport();
    }

    /**
     * 验证批量配置的合理性
     */
    validateBatchConfiguration(batchParams: BatchRunParams) {
        return this.batchGenerator.validateBatchConfiguration(batchParams);
    }

    /**
     * 重置批量生成器状态
     */
    resetBatchGenerator() {
        this.batchGenerator.reset();
    }

    /**
     * 生成带有随机变化的参数
     * 用于在不使用批量模式时也能产生一些随机性
     */
    generateVariedParams(
        baseParams: FreeRunParams,
        distanceVariation: number = 0.1,
        speedVariation: number = 0.5
    ): FreeRunParams {
        const variedParams = { ...baseParams };

        // 添加距离变化
        if (distanceVariation > 0) {
            const variation = (Math.random() - 0.5) * 2 * distanceVariation;
            variedParams.distance = Math.max(0.5, Math.min(20, baseParams.distance + variation));
        }

        // 添加速度变化
        if (baseParams.avgSpeed && speedVariation > 0) {
            const variation = (Math.random() - 0.5) * 2 * speedVariation;
            variedParams.avgSpeed = Math.max(3, Math.min(25, baseParams.avgSpeed + variation));
        }

        return variedParams;
    }

    /**
     * 计算预估完成时间
     */
    calculateEstimatedDuration(params: FreeRunParams): number {
        let speed = params.avgSpeed;
        if (!speed) {
            if (params.targetTime) {
                speed = params.distance / (params.targetTime / 3600);
            } else {
                speed = 8; // 默认速度
            }
        }

        return this.runCalculator.calculateDuration(params.distance, speed);
    }

    /**
     * 格式化配速显示
     */
    formatPace(avgSpeed: number): string {
        return this.runCalculator.formatPace(avgSpeed);
    }

    /**
     * 计算卡路里消耗
     */
    calculateCalories(distance: number, avgSpeed: number, weight?: number): number {
        return this.runCalculator.calculateCalories(distance, avgSpeed, weight);
    }

    /**
     * 生成步数
     */
    generateSteps(distance: number): number {
        return this.runCalculator.generateSteps(distance);
    }

    /**
     * 生成设备信息
     */
    generateDeviceInfo(stuNumber: string): string {
        return this.runCalculator.generateDeviceInfo(stuNumber);
    }

    /**
     * 生成MAC地址
     */
    generateMacAddress(stuNumber: string): string {
        return this.runCalculator.generateMacAddress(stuNumber);
    }

    /**
     * 获取数据生成摘要
     */
    getGenerationSummary(params: FreeRunParams): {
        estimatedDuration: number;
        estimatedPace: string;
        estimatedCalories: number;
        estimatedSteps: number;
        warnings: string[];
    } {
        const validation = this.validateParameters(params);
        const duration = this.calculateEstimatedDuration(params);

        let speed = params.avgSpeed;
        if (!speed) {
            speed = params.distance / (duration / 3600);
        }

        return {
            estimatedDuration: duration,
            estimatedPace: this.formatPace(speed),
            estimatedCalories: this.calculateCalories(params.distance, speed),
            estimatedSteps: this.generateSteps(params.distance),
            warnings: validation.warnings
        };
    }
}