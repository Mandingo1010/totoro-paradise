import type BaseResponse from './BaseResponse';

export default interface FreeRunResponse extends BaseResponse {
    data: FreeRunRecord | null;
}

export interface FreeRunRecord {
    recordId: string;
    stuNumber: string;
    schoolId: string;
    distance: string;
    duration: string;
    avgSpeed: string;
    avgPace: string;
    calorie: string;
    steps: string;
    startTime: string;
    endTime: string;
    submitTime: string;
    status: 'completed' | 'failed' | 'pending';
    runType: '1';  // 自由跑标识
}

export interface BatchResponse {
    totalSubmitted: number;
    successCount: number;
    failureCount: number;
    results: Array<{
        index: number;
        success: boolean;
        recordId?: string;
        error?: string;
    }>;
}

export interface FreeRunDetail extends FreeRunRecord {
    route?: string;          // 路线信息（如果有）
    weather?: string;        // 天气信息
    temperature?: string;    // 温度
    humidity?: string;       // 湿度
}