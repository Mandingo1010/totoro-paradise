import { describe, it, expect, beforeEach } from 'vitest';
import { FreeRunDataGenerator } from './FreeRunDataGenerator';
import type { FreeRunParams, BatchRunParams } from '../types/requestTypes/FreeRunRequest';

describe('FreeRunDataGenerator', () => {
    let generator: FreeRunDataGenerator;

    beforeEach(() => {
        generator = new FreeRunDataGenerator();
    });

    describe('单次数据生成', () => {
        it('应该能够生成基本的自由跑数据', async () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            };

            const runData = await generator.generateRunData(params, 'TEST001', undefined, undefined, false);

            expect(runData.distance).toBe('5.00');
            expect(runData.avgSpeed).toBe('10.00');
            expect(parseFloat(runData.duration)).toBeCloseTo(1800, 0); // 5km at 10km/h = 30min = 1800s
            expect(runData.avgPace).toBe('6:00'); // 10km/h = 6min/km
            expect(runData.mac).toBeTruthy();
            expect(runData.deviceInfo).toBeTruthy();
        });

        it('应该能够根据距离和时间计算速度', async () => {
            const params: FreeRunParams = {
                distance: 3,
                targetTime: 1800 // 30分钟
            };

            const runData = await generator.generateRunData(params, 'TEST002', undefined, undefined, false);

            expect(runData.distance).toBe('3.00');
            expect(parseFloat(runData.avgSpeed)).toBeCloseTo(6, 1); // 3km in 30min = 6km/h
            expect(runData.duration).toBe('1800');
        });

        it('应该使用默认速度当没有提供速度和时间时', async () => {
            const params: FreeRunParams = {
                distance: 4
            };

            const runData = await generator.generateRunData(params, 'TEST003', undefined, undefined, false);

            expect(runData.distance).toBe('4.00');
            expect(runData.avgSpeed).toBe('8.00'); // 默认速度
        });

        it('应该验证无效参数', async () => {
            const invalidParams: FreeRunParams = {
                distance: 0 // 无效距离
            };

            await expect(
                generator.generateRunData(invalidParams, 'TEST004')
            ).rejects.toThrow('参数验证失败');
        });

        it('应该验证空学号', async () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            };

            await expect(
                generator.generateRunData(params, '')
            ).rejects.toThrow('学号不能为空');
        });
    });

    describe('模板功能集成', () => {
        it('应该能够获取可用模板', () => {
            const templates = generator.getAvailableTemplates();
            expect(templates).toHaveLength(3);
            expect(templates.map(t => t.id)).toContain('easy-run');
            expect(templates.map(t => t.id)).toContain('standard-run');
            expect(templates.map(t => t.id)).toContain('challenge-run');
        });

        it('应该能够应用模板', () => {
            const params = generator.applyTemplate('easy-run');
            expect(params.distance).toBe(3);
            expect(params.avgSpeed).toBe(7);
        });

        it('应该能够推荐模板', () => {
            const recommendations = generator.recommendTemplate(5, 10);
            expect(recommendations.length).toBeGreaterThan(0);
            expect(recommendations.some(t => t.id === 'standard-run')).toBe(true);
        });

        it('应该能够创建自定义模板', () => {
            const customParams: FreeRunParams = {
                distance: 6,
                avgSpeed: 9
            };

            const template = generator.createCustomTemplate('我的模板', customParams);
            expect(template.name).toBe('我的模板');
            expect(template.defaultParams.distance).toBe(6);
            expect(template.defaultParams.avgSpeed).toBe(9);
        });
    });

    describe('批量数据生成集成', () => {
        it('应该能够生成批量数据', async () => {
            const batchParams: BatchRunParams = {
                count: 3,
                interval: 5,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0.5,
                    speedVariation: 1,
                    timeVariation: 2
                }
            };

            const results = await generator.generateBatchData(batchParams, 'TEST005');

            expect(results).toHaveLength(3);
            expect(results.every(r => r.success)).toBe(true);
        });

        it('应该能够获取批量执行统计', async () => {
            const batchParams: BatchRunParams = {
                count: 2,
                interval: 1,
                baseParams: {
                    distance: 3,
                    avgSpeed: 8
                },
                randomization: {
                    distanceVariation: 0,
                    speedVariation: 0,
                    timeVariation: 0
                }
            };

            await generator.generateBatchData(batchParams, 'TEST006');

            const stats = generator.getBatchStatistics();
            expect(stats.total).toBe(2);
            expect(stats.completed).toBe(2);
            expect(stats.successRate).toBe(100);
        });

        it('应该能够验证批量配置', () => {
            const reasonableParams: BatchRunParams = {
                count: 3,
                interval: 10,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0.5,
                    speedVariation: 1,
                    timeVariation: 2
                }
            };

            const validation = generator.validateBatchConfiguration(reasonableParams);
            expect(validation.isValid).toBe(true);
        });
    });

    describe('参数变化功能', () => {
        it('应该能够生成带变化的参数', () => {
            const baseParams: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            };

            const variedParams = generator.generateVariedParams(baseParams, 0.5, 1);

            // 距离应该在合理范围内变化
            expect(variedParams.distance).toBeGreaterThanOrEqual(4.5);
            expect(variedParams.distance).toBeLessThanOrEqual(5.5);

            // 速度应该在合理范围内变化
            expect(variedParams.avgSpeed!).toBeGreaterThanOrEqual(9);
            expect(variedParams.avgSpeed!).toBeLessThanOrEqual(11);
        });

        it('应该保持参数在有效范围内', () => {
            const extremeParams: FreeRunParams = {
                distance: 0.6, // 接近最小值
                avgSpeed: 3.5  // 接近最小值
            };

            const variedParams = generator.generateVariedParams(extremeParams, 1, 2);

            // 即使有大的变化，也应该保持在有效范围内
            expect(variedParams.distance).toBeGreaterThanOrEqual(0.5);
            expect(variedParams.avgSpeed!).toBeGreaterThanOrEqual(3);
        });
    });

    describe('辅助功能', () => {
        it('应该能够计算预估完成时间', () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            };

            const duration = generator.calculateEstimatedDuration(params);
            expect(duration).toBeCloseTo(1800, 0); // 30分钟
        });

        it('应该能够格式化配速', () => {
            const pace = generator.formatPace(10);
            expect(pace).toBe('6:00');
        });

        it('应该能够计算卡路里', () => {
            const calories = generator.calculateCalories(5, 10, 70);
            expect(calories).toBeGreaterThan(0);
        });

        it('应该能够生成步数', () => {
            const steps = generator.generateSteps(5);
            expect(steps).toBeGreaterThanOrEqual(5750); // 5 * 1150
            expect(steps).toBeLessThanOrEqual(6250);    // 5 * 1250
        });

        it('应该能够生成设备信息', () => {
            const deviceInfo = generator.generateDeviceInfo('TEST007');
            expect(deviceInfo).toContain('Android');
        });

        it('应该能够生成MAC地址', () => {
            const mac = generator.generateMacAddress('TEST008');
            expect(mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/);
        });

        it('应该能够生成数据摘要', () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            };

            const summary = generator.getGenerationSummary(params);

            expect(summary.estimatedDuration).toBeCloseTo(1800, 0);
            expect(summary.estimatedPace).toBe('6:00');
            expect(summary.estimatedCalories).toBeGreaterThan(0);
            expect(summary.estimatedSteps).toBeGreaterThan(0);
            expect(Array.isArray(summary.warnings)).toBe(true);
        });
    });

    describe('参数验证集成', () => {
        it('应该验证有效的自由跑参数', () => {
            const validParams: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            };

            const validation = generator.validateParameters(validParams);
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        it('应该检测无效的自由跑参数', () => {
            const invalidParams: FreeRunParams = {
                distance: 25, // 超出范围
                avgSpeed: 30  // 超出范围
            };

            const validation = generator.validateParameters(invalidParams);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });

        it('应该验证批量参数', () => {
            const validBatchParams: BatchRunParams = {
                count: 5,
                interval: 10,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0.5,
                    speedVariation: 1,
                    timeVariation: 2
                }
            };

            const validation = generator.validateBatchParameters(validBatchParams);
            expect(validation.isValid).toBe(true);
        });
    });

    describe('状态管理', () => {
        it('应该能够重置批量生成器状态', () => {
            generator.resetBatchGenerator();

            const progress = generator.getBatchProgress();
            expect(progress.isRunning).toBe(false);
            expect(progress.currentIndex).toBe(0);
            expect(progress.completed).toBe(0);
        });
    });
});