// Browser-compatible hash function
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and ensure it's positive
    const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
    // Extend to 32 characters by repeating
    return (hexHash + hexHash + hexHash + hexHash).substring(0, 32);
}

export interface RunData {
    distance: string;
    duration: string;
    avgSpeed: string;
    avgPace: string;
    calorie: string;
    steps: string;
    startTime: string;
    endTime: string;
    mac: string;
    deviceInfo: string;
}

export class RunCalculator {
    /**
     * 计算跑步用时
     * 需求 2.1: 根据距离和速度计算准确的用时
     */
    calculateDuration(distance: number, avgSpeed: number): number {
        if (distance <= 0 || avgSpeed <= 0) {
            throw new Error('距离和速度必须大于0');
        }
        // 时间 = 距离 / 速度 * 3600秒
        return (distance / avgSpeed) * 3600;
    }

    /**
     * 计算平均速度
     */
    calculateAvgSpeed(distance: number, duration: number): number {
        if (distance <= 0 || duration <= 0) {
            throw new Error('距离和时间必须大于0');
        }
        // 速度 = 距离 / (时间 / 3600)
        return distance / (duration / 3600);
    }

    /**
     * 格式化配速
     * 需求 2.2: 使用分钟:秒格式显示每公里用时
     */
    formatPace(avgSpeed: number): string {
        if (avgSpeed <= 0) {
            throw new Error('速度必须大于0');
        }

        // 配速 = 60分钟 / 速度(km/h)
        const paceMinutes = 60 / avgSpeed;
        const minutes = Math.floor(paceMinutes);
        const seconds = Math.round((paceMinutes - minutes) * 60);

        // 确保秒数不超过59
        if (seconds >= 60) {
            return `${minutes + 1}:00`;
        }

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * 计算卡路里消耗
     * 需求 2.3: 基于距离、速度和标准体重计算消耗
     */
    calculateCalories(distance: number, avgSpeed: number, weight: number = 65): number {
        if (distance <= 0 || avgSpeed <= 0 || weight <= 0) {
            throw new Error('距离、速度和体重必须大于0');
        }

        // 使用MET (Metabolic Equivalent of Task) 公式
        // 跑步的MET值根据速度变化：
        // 3-5 km/h: 3.5 MET
        // 5-8 km/h: 7.0 MET  
        // 8-12 km/h: 9.8 MET
        // 12-16 km/h: 12.3 MET
        // 16+ km/h: 15.3 MET

        let met: number;
        if (avgSpeed < 5) {
            met = 3.5;
        } else if (avgSpeed < 8) {
            met = 7.0;
        } else if (avgSpeed < 12) {
            met = 9.8;
        } else if (avgSpeed < 16) {
            met = 12.3;
        } else {
            met = 15.3;
        }

        // 卡路里 = MET × 体重(kg) × 时间(小时)
        const durationHours = this.calculateDuration(distance, avgSpeed) / 3600;
        const calories = met * weight * durationHours;

        return Math.round(calories);
    }

    /**
     * 生成步数
     * 需求 2.4: 基于距离使用每公里1200±50步的随机值
     */
    generateSteps(distance: number): number {
        if (distance <= 0) {
            throw new Error('距离必须大于0');
        }

        // 每公里步数：1200 ± 50步
        const baseStepsPerKm = 1200;
        const variation = 50;

        // 生成随机变化 (-50 到 +50)
        const randomVariation = (Math.random() - 0.5) * 2 * variation;
        const stepsPerKm = Math.max(1150, Math.min(1250.1, baseStepsPerKm + randomVariation));

        return Math.round(distance * stepsPerKm);
    }

    /**
     * 生成MAC地址
     * 需求 2.5: 创建基于学号的唯一MAC地址
     */
    generateMacAddress(stuNumber: string): string {
        if (!stuNumber || stuNumber.trim().length === 0) {
            throw new Error('学号不能为空');
        }

        // 使用学号生成确定性的MAC地址
        const hash = simpleHash(stuNumber);

        // 取前12位十六进制字符
        const macHex = hash.substring(0, 12);

        // 格式化为MAC地址格式 (xx:xx:xx:xx:xx:xx)
        const macAddress = macHex.match(/.{2}/g)?.join(':') || '';

        // 确保第一个字节的最低位为0（单播地址）
        const firstByte = parseInt(macAddress.substring(0, 2), 16);
        const unicastFirstByte = (firstByte & 0xFE).toString(16).padStart(2, '0');

        return unicastFirstByte + macAddress.substring(2);
    }

    /**
     * 生成设备信息
     */
    generateDeviceInfo(stuNumber: string): string {
        if (!stuNumber || stuNumber.trim().length === 0) {
            throw new Error('学号不能为空');
        }

        // 基于学号生成设备信息
        const hash = simpleHash(stuNumber + 'device');
        const deviceId = hash.substring(0, 16);

        // 模拟Android设备信息
        const androidVersions = ['10', '11', '12', '13', '14'];
        const deviceModels = ['SM-G973F', 'Pixel 6', 'Mi 11', 'OnePlus 9', 'HUAWEI P40'];

        const versionIndex = parseInt(hash.substring(16, 17), 16) % androidVersions.length;
        const modelIndex = parseInt(hash.substring(17, 18), 16) % deviceModels.length;

        return `Android ${androidVersions[versionIndex]}; ${deviceModels[modelIndex]}; ${deviceId}`;
    }

    /**
     * 格式化时间戳
     */
    formatTimestamp(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    /**
     * 对距离添加随机浮动（小数点后两位）
     * 使数据更加真实，例如 3.00 -> 3.07 或 2.94
     */
    addDistanceVariation(distance: number): number {
        // 生成 -0.09 到 +0.09 的随机浮动
        const variation = (Math.random() - 0.5) * 0.18;
        const variedDistance = distance + variation;
        // 确保距离不小于0.5
        return Math.max(0.5, parseFloat(variedDistance.toFixed(2)));
    }

    /**
     * 对速度添加随机浮动（小数点后两位）
     * 使数据更加真实，例如 8.00 -> 8.13 或 7.92
     */
    addSpeedVariation(speed: number): number {
        // 生成 -0.15 到 +0.15 的随机浮动
        const variation = (Math.random() - 0.5) * 0.30;
        const variedSpeed = speed + variation;
        // 确保速度在合理范围内 (3-25 km/h)
        return Math.max(3, Math.min(25, parseFloat(variedSpeed.toFixed(2))));
    }

    /**
     * 生成完整的跑步数据
     */
    generateRunData(
        distance: number,
        avgSpeed: number,
        stuNumber: string,
        startTime?: Date,
        weight?: number,
        addVariation: boolean = true
    ): RunData {
        if (distance <= 0 || avgSpeed <= 0) {
            throw new Error('距离和速度必须大于0');
        }

        if (!stuNumber || stuNumber.trim().length === 0) {
            throw new Error('学号不能为空');
        }

        // 对距离和速度添加随机浮动使数据更真实
        const finalDistance = addVariation ? this.addDistanceVariation(distance) : distance;
        const finalSpeed = addVariation ? this.addSpeedVariation(avgSpeed) : avgSpeed;

        const start = startTime || new Date();
        const duration = this.calculateDuration(finalDistance, finalSpeed);
        const end = new Date(start.getTime() + duration * 1000);

        return {
            distance: finalDistance.toFixed(2),
            duration: Math.round(duration).toString(),
            avgSpeed: finalSpeed.toFixed(2),
            avgPace: this.formatPace(finalSpeed),
            calorie: this.calculateCalories(finalDistance, finalSpeed, weight).toString(),
            steps: this.generateSteps(finalDistance).toString(),
            startTime: this.formatTimestamp(start),
            endTime: this.formatTimestamp(end),
            mac: this.generateMacAddress(stuNumber),
            deviceInfo: this.generateDeviceInfo(stuNumber)
        };
    }

    /**
     * 计算跑步数据（用于UI预览）
     * 根据参数计算预计的跑步数据
     */
    calculateRunData(params: { distance: number; targetTime?: number; avgSpeed?: number }): {
        avgSpeed: string;
        avgPace: string;
        calorie: string;
        steps: string;
        duration: string;
    } {
        const { distance, targetTime, avgSpeed: inputSpeed } = params;

        // 计算平均速度
        let avgSpeed: number;
        if (inputSpeed && inputSpeed > 0) {
            avgSpeed = inputSpeed;
        } else if (targetTime && targetTime > 0) {
            avgSpeed = this.calculateAvgSpeed(distance, targetTime);
        } else {
            // 默认使用8 km/h的速度
            avgSpeed = 8;
        }

        // 确保速度在合理范围内
        avgSpeed = Math.max(3, Math.min(25, avgSpeed));

        const duration = this.calculateDuration(distance, avgSpeed);
        const calorie = this.calculateCalories(distance, avgSpeed);
        const steps = this.generateSteps(distance);
        const pace = this.formatPace(avgSpeed);

        return {
            avgSpeed: avgSpeed.toFixed(1),
            avgPace: pace,
            calorie: calorie.toString(),
            steps: steps.toString(),
            duration: Math.round(duration).toString()
        };
    }
}