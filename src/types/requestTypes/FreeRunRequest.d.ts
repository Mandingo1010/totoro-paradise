import type BasicRequest from './BasicRequest';

export default interface FreeRunRequest extends BasicRequest {
    distance: string;        // 距离（公里）
    duration: string;        // 用时（秒）
    avgSpeed: string;        // 平均速度（km/h）
    avgPace: string;         // 平均配速（分钟:秒/公里）
    calorie: string;         // 卡路里消耗
    steps: string;           // 步数
    startTime: string;       // 开始时间
    endTime: string;         // 结束时间
    mac: string;             // MAC地址
    deviceInfo: string;      // 设备信息
    runType: '1';            // 自由跑标识
}

export interface BatchRunParams {
    count: number;           // 执行次数 (1-10)
    interval: number;        // 间隔时间（分钟，1-60）
    baseParams: FreeRunParams;
    randomization: {
        distanceVariation: number;  // 距离变化范围（±公里）
        speedVariation: number;     // 速度变化范围（±km/h）
        timeVariation: number;      // 时间变化范围（±分钟）
    };
}

export interface FreeRunParams {
    distance: number;        // 距离（公里）
    targetTime?: number;     // 目标时间（秒）
    avgSpeed?: number;       // 平均速度（km/h）
    template?: RunTemplate;  // 预设模板
}

export interface RunTemplate {
    id: string;
    name: string;
    description: string;
    defaultParams: FreeRunParams;
    speedRange: [number, number];
    distanceRange: [number, number];
}