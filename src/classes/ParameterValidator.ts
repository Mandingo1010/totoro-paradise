import type { FreeRunParams, BatchRunParams } from '../types/requestTypes/FreeRunRequest';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export interface DerivedValues {
    calculatedTime?: number;
    calculatedSpeed?: number;
    calculatedDistance?: number;
}

export class ParameterValidator {
    /**
     * 验证距离参数
     * 需求 1.3: 距离范围在0.5-20公里之间
     */
    validateDistance(distance: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (typeof distance !== 'number' || isNaN(distance)) {
            result.isValid = false;
            result.errors.push('距离必须是有效数字');
            return result;
        }

        if (distance < 0.5) {
            result.isValid = false;
            result.errors.push('距离不能小于0.5公里');
        }

        if (distance > 20) {
            result.isValid = false;
            result.errors.push('距离不能大于20公里');
        }

        if (distance < 1) {
            result.warnings.push('距离较短，建议至少1公里');
        }

        return result;
    }

    /**
     * 验证速度参数
     * 需求 1.4: 平均速度在3-25公里/小时范围内
     */
    validateSpeed(speed: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (typeof speed !== 'number' || isNaN(speed)) {
            result.isValid = false;
            result.errors.push('速度必须是有效数字');
            return result;
        }

        if (speed < 3) {
            result.isValid = false;
            result.errors.push('平均速度不能低于3公里/小时');
        }

        if (speed > 25) {
            result.isValid = false;
            result.errors.push('平均速度不能超过25公里/小时');
        }

        if (speed < 5) {
            result.warnings.push('速度较慢，建议至少5公里/小时');
        }

        if (speed > 20) {
            result.warnings.push('速度较快，请确保符合实际情况');
        }

        return result;
    }

    /**
     * 验证时间参数
     */
    validateTime(time: number): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (typeof time !== 'number' || isNaN(time)) {
            result.isValid = false;
            result.errors.push('时间必须是有效数字');
            return result;
        }

        if (time <= 0) {
            result.isValid = false;
            result.errors.push('时间必须大于0');
        }

        // 最大时间限制：20公里 / 3公里/小时 = 6.67小时 = 24000秒
        if (time > 24000) {
            result.isValid = false;
            result.errors.push('时间过长，超过合理范围');
        }

        return result;
    }

    /**
     * 验证批量参数
     * 需求 7.2: 总次数在1-10次范围内
     * 需求 7.3: 间隔时间在1-60分钟范围内
     */
    validateBatchParams(params: BatchRunParams): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // 验证次数
        if (typeof params.count !== 'number' || isNaN(params.count)) {
            result.isValid = false;
            result.errors.push('执行次数必须是有效数字');
        } else {
            if (params.count < 1) {
                result.isValid = false;
                result.errors.push('执行次数不能少于1次');
            }
            if (params.count > 10) {
                result.isValid = false;
                result.errors.push('执行次数不能超过10次');
            }
            if (!Number.isInteger(params.count)) {
                result.isValid = false;
                result.errors.push('执行次数必须是整数');
            }
        }

        // 验证间隔时间
        if (typeof params.interval !== 'number' || isNaN(params.interval)) {
            result.isValid = false;
            result.errors.push('间隔时间必须是有效数字');
        } else {
            if (params.interval < 1) {
                result.isValid = false;
                result.errors.push('间隔时间不能少于1分钟');
            }
            if (params.interval > 60) {
                result.isValid = false;
                result.errors.push('间隔时间不能超过60分钟');
            }
        }

        // 验证基础参数
        if (params.baseParams) {
            const baseValidation = this.validateFreeRunParams(params.baseParams);
            if (!baseValidation.isValid) {
                result.isValid = false;
                result.errors.push(...baseValidation.errors.map(e => `基础参数: ${e}`));
            }
            result.warnings.push(...baseValidation.warnings.map(w => `基础参数: ${w}`));
        }

        // 验证随机化参数
        if (params.randomization) {
            const { distanceVariation, speedVariation, timeVariation } = params.randomization;

            if (distanceVariation < 0) {
                result.errors.push('距离变化范围不能为负数');
                result.isValid = false;
            }
            if (speedVariation < 0) {
                result.errors.push('速度变化范围不能为负数');
                result.isValid = false;
            }
            if (timeVariation < 0) {
                result.errors.push('时间变化范围不能为负数');
                result.isValid = false;
            }
        }

        return result;
    }

    /**
     * 验证自由跑参数
     */
    validateFreeRunParams(params: FreeRunParams): ValidationResult {
        const result: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // 验证距离
        const distanceValidation = this.validateDistance(params.distance);
        if (!distanceValidation.isValid) {
            result.isValid = false;
        }
        result.errors.push(...distanceValidation.errors);
        result.warnings.push(...distanceValidation.warnings);

        // 验证速度（如果提供）
        if (params.avgSpeed !== undefined) {
            const speedValidation = this.validateSpeed(params.avgSpeed);
            if (!speedValidation.isValid) {
                result.isValid = false;
            }
            result.errors.push(...speedValidation.errors);
            result.warnings.push(...speedValidation.warnings);
        }

        // 验证目标时间（如果提供）
        if (params.targetTime !== undefined) {
            const timeValidation = this.validateTime(params.targetTime);
            if (!timeValidation.isValid) {
                result.isValid = false;
            }
            result.errors.push(...timeValidation.errors);
            result.warnings.push(...timeValidation.warnings);
        }

        // 验证速度和时间的一致性
        if (params.avgSpeed !== undefined && params.targetTime !== undefined) {
            const calculatedSpeed = (params.distance / (params.targetTime / 3600));
            const speedDifference = Math.abs(calculatedSpeed - params.avgSpeed);

            if (speedDifference > 0.5) {
                result.warnings.push('提供的速度与根据距离和时间计算的速度不一致');
            }
        }

        return result;
    }

    /**
     * 计算派生值
     */
    calculateDerivedValues(params: FreeRunParams): DerivedValues {
        const derived: DerivedValues = {};

        if (params.distance && params.avgSpeed) {
            // 根据距离和速度计算时间（秒）
            derived.calculatedTime = (params.distance / params.avgSpeed) * 3600;
        }

        if (params.distance && params.targetTime) {
            // 根据距离和时间计算速度（km/h）
            derived.calculatedSpeed = params.distance / (params.targetTime / 3600);
        }

        if (params.avgSpeed && params.targetTime) {
            // 根据速度和时间计算距离（km）
            derived.calculatedDistance = params.avgSpeed * (params.targetTime / 3600);
        }

        return derived;
    }
}