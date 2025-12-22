import type { BatchRunParams, FreeRunParams } from '../types/requestTypes/FreeRunRequest';
import type { RunData } from './RunCalculator';
import { RunCalculator } from './RunCalculator';
import { ParameterValidator } from './ParameterValidator';

export interface BatchProgress {
    currentIndex: number;
    totalCount: number;
    completed: number;
    failed: number;
    isRunning: boolean;
    startTime?: Date;
    estimatedEndTime?: Date;
}

export interface BatchResult {
    index: number;
    success: boolean;
    data?: RunData;
    error?: string;
    timestamp: Date;
}

export class BatchDataGenerator {
    private runCalculator: RunCalculator;
    private validator: ParameterValidator;
    private progress: BatchProgress;
    private results: BatchResult[] = [];

    constructor() {
        this.runCalculator = new RunCalculator();
        this.validator = new ParameterValidator();
        this.progress = {
            currentIndex: 0,
            totalCount: 0,
            completed: 0,
            failed: 0,
            isRunning: false
        };
    }

    /**
     * 生成批量跑步数据
     * 需求 7.1: 支持批量模式
     * 需求 7.4: 为每次跑步生成不同的随机参数
     */
    async generateBatchData(
        batchParams: BatchRunParams,
        stuNumber: string,
        weight?: number
    ): Promise<BatchResult[]> {
        // 验证批量参数
        const validation = this.validator.validateBatchParams(batchParams);
        if (!validation.isValid) {
            throw new Error(`批量参数验证失败: ${validation.errors.join(', ')}`);
        }

        if (!stuNumber || stuNumber.trim().length === 0) {
            throw new Error('学号不能为空');
        }

        // 初始化进度跟踪
        this.initializeProgress(batchParams.count);
        this.results = [];

        const results: BatchResult[] = [];
        const startTime = new Date();

        try {
            for (let i = 0; i < batchParams.count; i++) {
                this.updateProgress(i);

                try {
                    // 生成随机化参数
                    const randomizedParams = this.generateRandomizedParams(batchParams, i);

                    // 计算开始时间（考虑间隔）
                    const runStartTime = new Date(startTime.getTime() + i * batchParams.interval * 60 * 1000);

                    // 生成跑步数据
                    const runData = this.runCalculator.generateRunData(
                        randomizedParams.distance,
                        randomizedParams.avgSpeed!,
                        stuNumber,
                        runStartTime,
                        weight
                    );

                    const result: BatchResult = {
                        index: i,
                        success: true,
                        data: runData,
                        timestamp: new Date()
                    };

                    results.push(result);
                    this.results.push(result);
                    this.progress.completed++;

                } catch (error) {
                    const result: BatchResult = {
                        index: i,
                        success: false,
                        error: error instanceof Error ? error.message : '未知错误',
                        timestamp: new Date()
                    };

                    results.push(result);
                    this.results.push(result);
                    this.progress.failed++;
                }
            }
        } finally {
            this.progress.isRunning = false;
        }

        return results;
    }

    /**
     * 生成随机化参数
     * 需求 7.4: 为每次跑步生成不同的随机参数
     */
    private generateRandomizedParams(batchParams: BatchRunParams, index: number): FreeRunParams {
        const { baseParams, randomization } = batchParams;

        // 使用索引作为随机种子的一部分，确保可重现性
        const seed = Date.now() + index;
        const random = this.seededRandom(seed);

        // 计算随机化的距离
        let randomizedDistance = baseParams.distance;
        if (randomization.distanceVariation > 0) {
            const distanceVariation = (random() - 0.5) * 2 * randomization.distanceVariation;
            randomizedDistance = Math.max(0.5, Math.min(20, baseParams.distance + distanceVariation));
        }

        // 计算随机化的速度
        let randomizedSpeed = baseParams.avgSpeed;
        if (baseParams.avgSpeed && randomization.speedVariation > 0) {
            const speedVariation = (random() - 0.5) * 2 * randomization.speedVariation;
            randomizedSpeed = Math.max(3, Math.min(25, baseParams.avgSpeed + speedVariation));
        }

        // 计算随机化的时间（如果提供了目标时间）
        let randomizedTime = baseParams.targetTime;
        if (baseParams.targetTime && randomization.timeVariation > 0) {
            const timeVariationSeconds = (random() - 0.5) * 2 * randomization.timeVariation * 60;
            randomizedTime = Math.max(60, baseParams.targetTime + timeVariationSeconds);
        }

        // 如果没有提供速度，根据距离和时间计算
        if (!randomizedSpeed && randomizedTime) {
            randomizedSpeed = randomizedDistance / (randomizedTime / 3600);
        }

        // 如果没有提供时间，使用默认速度
        if (!randomizedSpeed) {
            randomizedSpeed = 8; // 默认速度
        }

        return {
            distance: randomizedDistance,
            avgSpeed: randomizedSpeed,
            targetTime: randomizedTime,
            template: baseParams.template
        };
    }

    /**
     * 简单的种子随机数生成器
     */
    private seededRandom(seed: number): () => number {
        let state = seed;
        return () => {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    /**
     * 初始化进度跟踪
     * 需求 7.5: 添加批量执行进度跟踪
     */
    private initializeProgress(totalCount: number): void {
        this.progress = {
            currentIndex: 0,
            totalCount,
            completed: 0,
            failed: 0,
            isRunning: true,
            startTime: new Date()
        };

        // 估算结束时间（假设每个任务需要1秒）
        this.progress.estimatedEndTime = new Date(Date.now() + totalCount * 1000);
    }

    /**
     * 更新进度
     */
    private updateProgress(currentIndex: number): void {
        this.progress.currentIndex = currentIndex;

        // 重新估算结束时间
        if (this.progress.startTime && currentIndex > 0) {
            const elapsed = Date.now() - this.progress.startTime.getTime();
            const avgTimePerTask = elapsed / currentIndex;
            const remainingTasks = this.progress.totalCount - currentIndex;
            this.progress.estimatedEndTime = new Date(Date.now() + remainingTasks * avgTimePerTask);
        }
    }

    /**
     * 获取当前进度
     * 需求 7.5: 显示当前进度和剩余次数
     */
    getProgress(): BatchProgress {
        return { ...this.progress };
    }

    /**
     * 获取批量执行结果
     */
    getResults(): BatchResult[] {
        return [...this.results];
    }

    /**
     * 获取成功的结果
     */
    getSuccessfulResults(): BatchResult[] {
        return this.results.filter(result => result.success);
    }

    /**
     * 获取失败的结果
     */
    getFailedResults(): BatchResult[] {
        return this.results.filter(result => !result.success);
    }

    /**
     * 获取批量执行统计
     */
    getStatistics(): {
        total: number;
        completed: number;
        failed: number;
        successRate: number;
        duration?: number;
    } {
        const stats = {
            total: this.progress.totalCount,
            completed: this.progress.completed,
            failed: this.progress.failed,
            successRate: this.progress.totalCount > 0 ?
                (this.progress.completed / this.progress.totalCount) * 100 : 0,
            duration: undefined as number | undefined
        };

        if (this.progress.startTime && !this.progress.isRunning) {
            const endTime = this.results.length > 0 ?
                this.results[this.results.length - 1].timestamp : new Date();
            stats.duration = endTime.getTime() - this.progress.startTime.getTime();
        }

        return stats;
    }

    /**
     * 验证批量参数的合理性
     */
    validateBatchConfiguration(batchParams: BatchRunParams): {
        isValid: boolean;
        warnings: string[];
        recommendations: string[];
    } {
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // 检查总执行时间
        const totalDuration = batchParams.count * batchParams.interval;
        if (totalDuration > 300) { // 超过5小时
            warnings.push(`批量执行总时间将超过${Math.round(totalDuration / 60)}小时`);
            recommendations.push('考虑减少执行次数或缩短间隔时间');
        }

        // 检查随机化范围
        const { randomization, baseParams } = batchParams;

        if (randomization.distanceVariation > baseParams.distance * 0.5) {
            warnings.push('距离变化范围过大，可能产生不合理的距离值');
            recommendations.push('建议距离变化范围不超过基础距离的50%');
        }

        if (baseParams.avgSpeed && randomization.speedVariation > baseParams.avgSpeed * 0.3) {
            warnings.push('速度变化范围过大，可能产生不合理的速度值');
            recommendations.push('建议速度变化范围不超过基础速度的30%');
        }

        // 检查间隔时间
        if (batchParams.interval < 5) {
            warnings.push('间隔时间较短，可能被检测为异常行为');
            recommendations.push('建议间隔时间至少5分钟');
        }

        return {
            isValid: warnings.length === 0,
            warnings,
            recommendations
        };
    }

    /**
     * 生成批量执行报告
     */
    generateReport(): string {
        const stats = this.getStatistics();
        const successfulResults = this.getSuccessfulResults();
        const failedResults = this.getFailedResults();

        let report = '=== 批量跑步数据生成报告 ===\n\n';

        report += `总计: ${stats.total} 次\n`;
        report += `成功: ${stats.completed} 次\n`;
        report += `失败: ${stats.failed} 次\n`;
        report += `成功率: ${stats.successRate.toFixed(1)}%\n`;

        if (stats.duration) {
            report += `执行时间: ${(stats.duration / 1000).toFixed(1)} 秒\n`;
        }

        if (successfulResults.length > 0) {
            report += '\n=== 成功生成的数据统计 ===\n';
            const distances = successfulResults.map(r => parseFloat(r.data!.distance));
            const speeds = successfulResults.map(r => parseFloat(r.data!.avgSpeed));

            report += `距离范围: ${Math.min(...distances).toFixed(2)} - ${Math.max(...distances).toFixed(2)} 公里\n`;
            report += `速度范围: ${Math.min(...speeds).toFixed(2)} - ${Math.max(...speeds).toFixed(2)} 公里/小时\n`;
            report += `平均距离: ${(distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(2)} 公里\n`;
            report += `平均速度: ${(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(2)} 公里/小时\n`;
        }

        if (failedResults.length > 0) {
            report += '\n=== 失败记录 ===\n';
            failedResults.forEach((result, index) => {
                report += `${index + 1}. 第${result.index + 1}次: ${result.error}\n`;
            });
        }

        return report;
    }

    /**
     * 重置生成器状态
     */
    reset(): void {
        this.progress = {
            currentIndex: 0,
            totalCount: 0,
            completed: 0,
            failed: 0,
            isRunning: false
        };
        this.results = [];
    }
}