import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ParameterValidator } from './ParameterValidator';
import type { BatchRunParams, FreeRunParams } from '../types/requestTypes/FreeRunRequest';

describe('ParameterValidator', () => {
    const validator = new ParameterValidator();

    describe('Distance Validation', () => {
        /**
         * **Feature: free-run-feature, Property 1: 距离验证范围**
         * **验证: 需求 1.3**
         * 对于任何距离输入，验证函数应该只接受0.5到20公里范围内的值
         */
        it('should only accept distances between 0.5 and 20 kilometers', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    (validDistance) => {
                        const result = validator.validateDistance(validDistance);
                        expect(result.isValid).toBe(true);
                        expect(result.errors).toHaveLength(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject distances below 0.5 kilometers', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: -100, max: 0.49, noNaN: true }),
                    (invalidDistance) => {
                        const result = validator.validateDistance(invalidDistance);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error => error.includes('不能小于0.5公里'))).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject distances above 20 kilometers', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 20.01, max: 100, noNaN: true }),
                    (invalidDistance) => {
                        const result = validator.validateDistance(invalidDistance);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error => error.includes('不能大于20公里'))).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject non-numeric distances', () => {
            const invalidInputs = [NaN, 'string' as any, null as any, undefined as any];
            invalidInputs.forEach(input => {
                const result = validator.validateDistance(input);
                expect(result.isValid).toBe(false);
                expect(result.errors.some(error => error.includes('必须是有效数字'))).toBe(true);
            });
        });
    });

    describe('Speed Validation', () => {
        /**
         * **Feature: free-run-feature, Property 2: 速度计算一致性**
         * **验证: 需求 1.4**
         * 对于任何有效的距离和时间组合，计算出的平均速度应该在3-25公里/小时范围内
         */
        it('should only accept speeds between 3 and 25 km/h', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    (validSpeed) => {
                        const result = validator.validateSpeed(validSpeed);
                        expect(result.isValid).toBe(true);
                        expect(result.errors).toHaveLength(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject speeds below 3 km/h', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: -10, max: 2.99, noNaN: true }),
                    (invalidSpeed) => {
                        const result = validator.validateSpeed(invalidSpeed);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error => error.includes('不能低于3公里/小时'))).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject speeds above 25 km/h', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 25.01, max: 50, noNaN: true }),
                    (invalidSpeed) => {
                        const result = validator.validateSpeed(invalidSpeed);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error => error.includes('不能超过25公里/小时'))).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Batch Parameters Validation', () => {
        /**
         * **Feature: free-run-feature, Property 9: 批量参数验证**
         * **验证: 需求 7.2, 7.3**
         * 对于任何批量参数，次数应该在1-10范围内，间隔应该在1-60分钟范围内
         */
        it('should accept valid batch parameters', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    fc.double({ min: 1, max: 60, noNaN: true }),
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    (count, interval, distance, speed) => {
                        const batchParams: BatchRunParams = {
                            count,
                            interval,
                            baseParams: {
                                distance,
                                avgSpeed: speed
                            },
                            randomization: {
                                distanceVariation: 0.1,
                                speedVariation: 0.5,
                                timeVariation: 30
                            }
                        };

                        const result = validator.validateBatchParams(batchParams);
                        expect(result.isValid).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject count outside 1-10 range', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.integer({ min: -10, max: 0 }),
                        fc.integer({ min: 11, max: 20 })
                    ),
                    (invalidCount) => {
                        const batchParams: BatchRunParams = {
                            count: invalidCount,
                            interval: 5,
                            baseParams: { distance: 5, avgSpeed: 10 },
                            randomization: {
                                distanceVariation: 0.1,
                                speedVariation: 0.5,
                                timeVariation: 30
                            }
                        };

                        const result = validator.validateBatchParams(batchParams);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error =>
                            error.includes('执行次数不能少于1次') ||
                            error.includes('执行次数不能超过10次')
                        )).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject interval outside 1-60 minute range', () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.double({ min: -10, max: 0.99, noNaN: true }),
                        fc.double({ min: 60.01, max: 120, noNaN: true })
                    ),
                    (invalidInterval) => {
                        const batchParams: BatchRunParams = {
                            count: 5,
                            interval: invalidInterval,
                            baseParams: { distance: 5, avgSpeed: 10 },
                            randomization: {
                                distanceVariation: 0.1,
                                speedVariation: 0.5,
                                timeVariation: 30
                            }
                        };

                        const result = validator.validateBatchParams(batchParams);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error =>
                            error.includes('间隔时间不能少于1分钟') ||
                            error.includes('间隔时间不能超过60分钟')
                        )).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Time Validation', () => {
        it('should accept positive time values', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 1, max: 24000, noNaN: true }),
                    (validTime) => {
                        const result = validator.validateTime(validTime);
                        expect(result.isValid).toBe(true);
                        expect(result.errors).toHaveLength(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should reject non-positive time values', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: -100, max: 0, noNaN: true }),
                    (invalidTime) => {
                        const result = validator.validateTime(invalidTime);
                        expect(result.isValid).toBe(false);
                        expect(result.errors.some(error => error.includes('时间必须大于0'))).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Derived Values Calculation', () => {
        it('should calculate time from distance and speed', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    (distance, speed) => {
                        const params: FreeRunParams = { distance, avgSpeed: speed };
                        const derived = validator.calculateDerivedValues(params);

                        expect(derived.calculatedTime).toBeDefined();
                        expect(derived.calculatedTime).toBeCloseTo((distance / speed) * 3600, 1);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should calculate speed from distance and time', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    fc.double({ min: 100, max: 24000, noNaN: true }),
                    (distance, time) => {
                        const params: FreeRunParams = { distance, targetTime: time };
                        const derived = validator.calculateDerivedValues(params);

                        expect(derived.calculatedSpeed).toBeDefined();
                        expect(derived.calculatedSpeed).toBeCloseTo(distance / (time / 3600), 1);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});