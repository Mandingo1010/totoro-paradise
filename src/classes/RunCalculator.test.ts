import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RunCalculator } from './RunCalculator';

describe('RunCalculator', () => {
    const calculator = new RunCalculator();

    describe('Time Calculation', () => {
        /**
         * **Feature: free-run-feature, Property 3: 时间计算准确性**
         * **验证: 需求 2.1**
         * 对于任何距离和速度输入，计算的用时应该等于距离除以速度乘以3600秒
         */
        it('should calculate duration accurately as distance / speed * 3600', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    (distance, speed) => {
                        const duration = calculator.calculateDuration(distance, speed);
                        const expectedDuration = (distance / speed) * 3600;

                        expect(duration).toBeCloseTo(expectedDuration, 5);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should throw error for invalid inputs', () => {
            expect(() => calculator.calculateDuration(0, 10)).toThrow('距离和速度必须大于0');
            expect(() => calculator.calculateDuration(10, 0)).toThrow('距离和速度必须大于0');
            expect(() => calculator.calculateDuration(-5, 10)).toThrow('距离和速度必须大于0');
        });
    });

    describe('Pace Formatting', () => {
        /**
         * **Feature: free-run-feature, Property 4: 配速格式一致性**
         * **验证: 需求 2.2**
         * 对于任何有效速度，配速应该以"分钟:秒"格式显示，且计算正确
         */
        it('should format pace as MM:SS and calculate correctly', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    (speed) => {
                        const pace = calculator.formatPace(speed);

                        // 验证格式：应该匹配 "数字:数字数字" 格式
                        expect(pace).toMatch(/^\d+:\d{2}$/);

                        // 验证计算正确性
                        const [minutes, seconds] = pace.split(':').map(Number);
                        const totalMinutes = minutes + seconds / 60;
                        const expectedPace = 60 / speed;

                        // 允许1秒的误差（由于四舍五入）
                        expect(Math.abs(totalMinutes - expectedPace)).toBeLessThan(1 / 60);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should throw error for invalid speed', () => {
            expect(() => calculator.formatPace(0)).toThrow('速度必须大于0');
            expect(() => calculator.formatPace(-5)).toThrow('速度必须大于0');
        });
    });

    describe('Calorie Calculation', () => {
        /**
         * **Feature: free-run-feature, Property 5: 卡路里计算合理性**
         * **验证: 需求 2.3**
         * 对于任何距离和速度组合，计算的卡路里应该在合理范围内（基于标准公式）
         */
        it('should calculate calories within reasonable range based on MET formula', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    fc.double({ min: 40, max: 120, noNaN: true }),
                    (distance, speed, weight) => {
                        const calories = calculator.calculateCalories(distance, speed, weight);

                        // 验证卡路里是正数
                        expect(calories).toBeGreaterThan(0);

                        // 验证卡路里在合理范围内
                        // 最小MET = 3.5, 最大MET = 15.3
                        const durationHours = (distance / speed);
                        const minCalories = 3.5 * weight * durationHours * 0.8; // 允许20%误差
                        const maxCalories = 15.3 * weight * durationHours * 1.2;

                        expect(calories).toBeGreaterThanOrEqual(Math.floor(minCalories));
                        expect(calories).toBeLessThanOrEqual(Math.ceil(maxCalories));
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should use default weight of 65kg when not provided', () => {
            const calories = calculator.calculateCalories(5, 10);
            expect(calories).toBeGreaterThan(0);
        });

        it('should throw error for invalid inputs', () => {
            expect(() => calculator.calculateCalories(0, 10, 65)).toThrow('距离、速度和体重必须大于0');
            expect(() => calculator.calculateCalories(5, 0, 65)).toThrow('距离、速度和体重必须大于0');
            expect(() => calculator.calculateCalories(5, 10, 0)).toThrow('距离、速度和体重必须大于0');
        });
    });

    describe('Steps Generation', () => {
        /**
         * **Feature: free-run-feature, Property 6: 步数生成范围**
         * **验证: 需求 2.4**
         * 对于任何距离，生成的步数应该在每公里1150-1250步的范围内
         */
        it('should generate steps within 1150-1250 steps per kilometer', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    (distance) => {
                        const steps = calculator.generateSteps(distance);

                        // 验证步数是正数
                        expect(steps).toBeGreaterThan(0);

                        // 验证每公里步数在1150-1250范围内
                        // 使用较大的容差来处理浮点数精度问题
                        const stepsPerKm = steps / distance;
                        const tolerance = 0.2;
                        expect(stepsPerKm).toBeGreaterThanOrEqual(1150 - tolerance);
                        expect(stepsPerKm).toBeLessThanOrEqual(1250 + tolerance);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should throw error for invalid distance', () => {
            expect(() => calculator.generateSteps(0)).toThrow('距离必须大于0');
            expect(() => calculator.generateSteps(-5)).toThrow('距离必须大于0');
        });
    });

    describe('MAC Address Generation', () => {
        /**
         * **Feature: free-run-feature, Property 7: MAC地址唯一性**
         * **验证: 需求 2.5**
         * 对于任何不同的学号，生成的MAC地址应该是唯一的且格式正确
         */
        it('should generate unique MAC addresses for different student numbers', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 2, maxLength: 10 }),
                    (stuNumbers) => {
                        // 去重学号
                        const uniqueStuNumbers = [...new Set(stuNumbers)];

                        if (uniqueStuNumbers.length < 2) {
                            return; // 跳过没有足够唯一学号的情况
                        }

                        const macAddresses = uniqueStuNumbers.map(sn => calculator.generateMacAddress(sn));

                        // 验证所有MAC地址格式正确
                        macAddresses.forEach(mac => {
                            expect(mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/);
                        });

                        // 验证MAC地址唯一性
                        const uniqueMacs = new Set(macAddresses);
                        expect(uniqueMacs.size).toBe(uniqueStuNumbers.length);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should generate same MAC address for same student number', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 5, maxLength: 20 }),
                    (stuNumber) => {
                        const mac1 = calculator.generateMacAddress(stuNumber);
                        const mac2 = calculator.generateMacAddress(stuNumber);

                        expect(mac1).toBe(mac2);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should throw error for empty student number', () => {
            expect(() => calculator.generateMacAddress('')).toThrow('学号不能为空');
            expect(() => calculator.generateMacAddress('   ')).toThrow('学号不能为空');
        });
    });

    describe('Device Info Generation', () => {
        it('should generate valid device info', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 5, maxLength: 20 }),
                    (stuNumber) => {
                        const deviceInfo = calculator.generateDeviceInfo(stuNumber);

                        // 验证设备信息包含Android版本
                        expect(deviceInfo).toMatch(/Android \d+/);

                        // 验证设备信息不为空
                        expect(deviceInfo.length).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should generate same device info for same student number', () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 5, maxLength: 20 }),
                    (stuNumber) => {
                        const device1 = calculator.generateDeviceInfo(stuNumber);
                        const device2 = calculator.generateDeviceInfo(stuNumber);

                        expect(device1).toBe(device2);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Complete Run Data Generation', () => {
        it('should generate complete run data with all required fields', () => {
            fc.assert(
                fc.property(
                    fc.double({ min: 0.5, max: 20, noNaN: true }),
                    fc.double({ min: 3, max: 25, noNaN: true }),
                    fc.string({ minLength: 5, maxLength: 20 }),
                    (distance, speed, stuNumber) => {
                        const runData = calculator.generateRunData(distance, speed, stuNumber, undefined, undefined, false);

                        // 验证所有字段都存在
                        expect(runData.distance).toBeDefined();
                        expect(runData.duration).toBeDefined();
                        expect(runData.avgSpeed).toBeDefined();
                        expect(runData.avgPace).toBeDefined();
                        expect(runData.calorie).toBeDefined();
                        expect(runData.steps).toBeDefined();
                        expect(runData.startTime).toBeDefined();
                        expect(runData.endTime).toBeDefined();
                        expect(runData.mac).toBeDefined();
                        expect(runData.deviceInfo).toBeDefined();

                        // 验证数值字段可以转换为数字
                        expect(Number(runData.distance)).toBeCloseTo(distance, 2);
                        expect(Number(runData.avgSpeed)).toBeCloseTo(speed, 2);
                        expect(Number(runData.duration)).toBeGreaterThan(0);
                        expect(Number(runData.calorie)).toBeGreaterThan(0);
                        expect(Number(runData.steps)).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should calculate end time correctly based on duration', () => {
            const startTime = new Date('2024-01-01T10:00:00');
            const runData = calculator.generateRunData(5, 10, '12345', startTime);

            const start = new Date(runData.startTime);
            const end = new Date(runData.endTime);
            const duration = Number(runData.duration);

            const timeDiff = (end.getTime() - start.getTime()) / 1000;
            expect(timeDiff).toBeCloseTo(duration, 2);
        });
    });
});