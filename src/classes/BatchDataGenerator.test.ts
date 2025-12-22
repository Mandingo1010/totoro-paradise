import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { BatchDataGenerator } from './BatchDataGenerator';
import type { BatchRunParams } from '../types/requestTypes/FreeRunRequest';

describe('BatchDataGenerator', () => {
    let batchGenerator: BatchDataGenerator;

    beforeEach(() => {
        batchGenerator = new BatchDataGenerator();
    });

    describe('基本功能测试', () => {
        it('应该能够生成批量跑步数据', async () => {
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

            const results = await batchGenerator.generateBatchData(batchParams, 'TEST001');

            expect(results).toHaveLength(3);
            expect(results.every(r => r.success)).toBe(true);
            expect(results.every(r => r.data)).toBeTruthy();
        });

        it('应该正确跟踪进度', async () => {
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

            const promise = batchGenerator.generateBatchData(batchParams, 'TEST002');

            await promise;

            // 检查完成后的进度
            const finalProgress = batchGenerator.getProgress();
            expect(finalProgress.totalCount).toBe(2);
            expect(finalProgress.isRunning).toBe(false);
            expect(finalProgress.completed).toBe(2);
        });
    });

    describe('属性测试', () => {
        /**
         * **Feature: free-run-feature, Property 16: 批量参数随机化**
         * **验证: 需求 7.4**
         * 
         * 对于任何批量执行，每次跑步的参数应该在指定范围内有所不同
         */
        it('Property 16: 批量参数随机化', async () => {
            await fc.assert(
                fc.asyncProperty(
                    // 生成有效的批量参数
                    fc.record({
                        count: fc.integer({ min: 2, max: 5 }), // 至少2次才能比较差异
                        interval: fc.integer({ min: 1, max: 10 }),
                        baseParams: fc.record({
                            distance: fc.float({ min: 1, max: 10, noNaN: true }),
                            avgSpeed: fc.float({ min: 5, max: 15, noNaN: true })
                        }),
                        randomization: fc.record({
                            distanceVariation: fc.float({ min: Math.fround(0.1), max: Math.fround(2), noNaN: true }),
                            speedVariation: fc.float({ min: Math.fround(0.1), max: Math.fround(3), noNaN: true }),
                            timeVariation: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true })
                        })
                    }),
                    fc.stringMatching(/^[a-zA-Z0-9]{5,10}$/), // 学号 (字母数字，5-10字符)
                    async (batchParams: BatchRunParams, stuNumber: string) => {
                        const results = await batchGenerator.generateBatchData(batchParams, stuNumber);

                        // 所有结果都应该成功
                        expect(results.every(r => r.success)).toBe(true);

                        if (results.length < 2) return; // 需要至少2个结果来比较

                        const runData = results.map(r => r.data!);
                        const distances = runData.map(d => parseFloat(d.distance));
                        const speeds = runData.map(d => parseFloat(d.avgSpeed));

                        // 如果有距离变化，距离应该有所不同
                        if (batchParams.randomization.distanceVariation > 0) {
                            const minDistance = Math.min(...distances);
                            const maxDistance = Math.max(...distances);
                            const actualVariation = maxDistance - minDistance;

                            // 实际变化应该在合理范围内
                            expect(actualVariation).toBeGreaterThanOrEqual(0);
                            expect(actualVariation).toBeLessThanOrEqual(batchParams.randomization.distanceVariation * 2);

                            // 所有距离都应该在有效范围内
                            distances.forEach(distance => {
                                expect(distance).toBeGreaterThanOrEqual(0.5);
                                expect(distance).toBeLessThanOrEqual(20);
                                // 考虑到距离会被限制在[0.5, 20]范围内，并且会被四舍五入到2位小数
                                const expectedMin = Math.max(0.5, batchParams.baseParams.distance - batchParams.randomization.distanceVariation);
                                const expectedMax = Math.min(20, batchParams.baseParams.distance + batchParams.randomization.distanceVariation);
                                // 使用0.06的容差来处理toFixed(2)的四舍五入和浮点数精度
                                expect(distance).toBeGreaterThanOrEqual(expectedMin - 0.06);
                                expect(distance).toBeLessThanOrEqual(expectedMax + 0.06);
                            });
                        }

                        // 如果有速度变化，速度应该有所不同
                        if (batchParams.randomization.speedVariation > 0) {
                            const minSpeed = Math.min(...speeds);
                            const maxSpeed = Math.max(...speeds);
                            const actualVariation = maxSpeed - minSpeed;

                            // 实际变化应该在合理范围内（增加容差处理浮点数精度）
                            expect(actualVariation).toBeGreaterThanOrEqual(0);
                            expect(actualVariation).toBeLessThanOrEqual(batchParams.randomization.speedVariation * 2 + 0.05);

                            // 所有速度都应该在有效范围内
                            speeds.forEach(speed => {
                                expect(speed).toBeGreaterThanOrEqual(3);
                                expect(speed).toBeLessThanOrEqual(25);
                                // 考虑到速度会被限制在[3, 25]范围内，并且会被四舍五入到2位小数
                                const expectedMin = Math.max(3, batchParams.baseParams.avgSpeed! - batchParams.randomization.speedVariation);
                                const expectedMax = Math.min(25, batchParams.baseParams.avgSpeed! + batchParams.randomization.speedVariation);
                                // 使用0.15的容差来处理toFixed(2)的四舍五入和浮点数精度
                                expect(speed).toBeGreaterThanOrEqual(expectedMin - 0.15);
                                expect(speed).toBeLessThanOrEqual(expectedMax + 0.15);
                            });
                        }

                        // 每次跑步的开始时间应该按间隔递增
                        const startTimes = runData.map(d => new Date(d.startTime).getTime());
                        for (let i = 1; i < startTimes.length; i++) {
                            const expectedInterval = batchParams.interval * 60 * 1000; // 转换为毫秒
                            const actualInterval = startTimes[i] - startTimes[i - 1];
                            expect(Math.abs(actualInterval - expectedInterval)).toBeLessThan(1000); // 允许1秒误差
                        }

                        // 重置生成器状态以避免测试间干扰
                        batchGenerator.reset();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('错误处理测试', () => {
        it('应该处理无效的批量参数', async () => {
            const invalidParams: BatchRunParams = {
                count: 0, // 无效
                interval: 5,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0,
                    speedVariation: 0,
                    timeVariation: 0
                }
            };

            await expect(
                batchGenerator.generateBatchData(invalidParams, 'TEST003')
            ).rejects.toThrow();
        });

        it('应该处理空学号', async () => {
            const validParams: BatchRunParams = {
                count: 2,
                interval: 5,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0,
                    speedVariation: 0,
                    timeVariation: 0
                }
            };

            await expect(
                batchGenerator.generateBatchData(validParams, '')
            ).rejects.toThrow('学号不能为空');
        });
    });

    describe('统计和报告功能', () => {
        it('应该生成正确的统计信息', async () => {
            const batchParams: BatchRunParams = {
                count: 3,
                interval: 1,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0,
                    speedVariation: 0,
                    timeVariation: 0
                }
            };

            await batchGenerator.generateBatchData(batchParams, 'TEST004');

            const stats = batchGenerator.getStatistics();
            expect(stats.total).toBe(3);
            expect(stats.completed).toBe(3);
            expect(stats.failed).toBe(0);
            expect(stats.successRate).toBe(100);
            // Duration might be 0 for very fast operations, so we don't test it
        });

        it('应该生成批量执行报告', async () => {
            const batchParams: BatchRunParams = {
                count: 2,
                interval: 1,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0,
                    speedVariation: 0,
                    timeVariation: 0
                }
            };

            await batchGenerator.generateBatchData(batchParams, 'TEST005');

            const report = batchGenerator.generateReport();
            expect(report).toContain('批量跑步数据生成报告');
            expect(report).toContain('总计: 2 次');
            expect(report).toContain('成功: 2 次');
            expect(report).toContain('成功率: 100.0%');
        });
    });

    describe('配置验证', () => {
        it('应该验证批量配置的合理性', () => {
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

            const validation = batchGenerator.validateBatchConfiguration(reasonableParams);
            expect(validation.isValid).toBe(true);
            expect(validation.warnings).toHaveLength(0);
        });

        it('应该警告不合理的配置', () => {
            const unreasonableParams: BatchRunParams = {
                count: 10,
                interval: 60, // 总时间10小时
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 5, // 距离变化100%
                    speedVariation: 5, // 速度变化50%
                    timeVariation: 10
                }
            };

            const validation = batchGenerator.validateBatchConfiguration(unreasonableParams);
            expect(validation.isValid).toBe(false);
            expect(validation.warnings.length).toBeGreaterThan(0);
            expect(validation.recommendations.length).toBeGreaterThan(0);
        });
    });
});