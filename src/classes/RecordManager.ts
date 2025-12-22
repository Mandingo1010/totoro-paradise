import type { FreeRunRecord, FreeRunDetail } from '../types/responseTypes/FreeRunResponse';
import type BasicRequest from '../types/requestTypes/BasicRequest';
import TotoroApiWrapper from '../wrappers/TotoroApiWrapper';

export interface RecordFilters {
    startDate?: string;
    endDate?: string;
    minDistance?: number;
    maxDistance?: number;
    status?: 'completed' | 'failed' | 'pending';
    limit?: number;
}

export interface RecordStats {
    totalRuns: number;
    totalDistance: number;
    totalTime: number;
    avgSpeed: number;
    totalCalories: number;
    completedRuns: number;
    failedRuns: number;
}

export class RecordManager {
    private cache: Map<string, FreeRunRecord[]> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
     * 获取自由跑记录列表
     */
    async getFreeRunRecords(
        session: BasicRequest,
        filters?: RecordFilters
    ): Promise<FreeRunRecord[]> {
        const cacheKey = this.generateCacheKey(session, filters);

        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return this.filterRecords(cached, filters);
            }
        }

        try {
            const response = await TotoroApiWrapper.getFreeRunRecords(session, {
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                limit: filters?.limit,
            });

            const records = response.data || [];

            // Cache the results
            this.cache.set(cacheKey, records);
            this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

            return this.filterRecords(records, filters);
        } catch (error) {
            console.error('Failed to fetch free run records:', error);
            throw error;
        }
    }

    /**
     * 获取记录详情
     */
    async getFreeRunDetail(
        recordId: string,
        session: BasicRequest
    ): Promise<FreeRunDetail> {
        try {
            const response = await TotoroApiWrapper.getFreeRunDetail(recordId, session);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch free run detail:', error);
            throw error;
        }
    }

    /**
     * 过滤记录
     */
    filterRecords(records: FreeRunRecord[], filters?: RecordFilters): FreeRunRecord[] {
        if (!filters) return records;

        return records.filter(record => {
            // Filter by run type (only free runs)
            if (record.runType !== '1') return false;

            // Filter by distance range
            if (filters.minDistance !== undefined) {
                const distance = parseFloat(record.distance);
                if (distance < filters.minDistance) return false;
            }

            if (filters.maxDistance !== undefined) {
                const distance = parseFloat(record.distance);
                if (distance > filters.maxDistance) return false;
            }

            // Filter by status
            if (filters.status && record.status !== filters.status) {
                return false;
            }

            // Filter by date range
            if (filters.startDate) {
                const recordDate = new Date(record.startTime);
                const startDate = new Date(filters.startDate);
                if (recordDate < startDate) return false;
            }

            if (filters.endDate) {
                const recordDate = new Date(record.startTime);
                const endDate = new Date(filters.endDate);
                if (recordDate > endDate) return false;
            }

            return true;
        });
    }

    /**
     * 计算记录统计信息
     */
    calculateStats(records: FreeRunRecord[]): RecordStats {
        const completedRecords = records.filter(r => r.status === 'completed');

        const totalDistance = completedRecords.reduce((sum, record) => {
            return sum + parseFloat(record.distance);
        }, 0);

        const totalTime = completedRecords.reduce((sum, record) => {
            return sum + parseFloat(record.duration);
        }, 0);

        const totalCalories = completedRecords.reduce((sum, record) => {
            return sum + parseFloat(record.calorie);
        }, 0);

        const avgSpeed = completedRecords.length > 0
            ? completedRecords.reduce((sum, record) => sum + parseFloat(record.avgSpeed), 0) / completedRecords.length
            : 0;

        return {
            totalRuns: records.length,
            totalDistance,
            totalTime,
            avgSpeed,
            totalCalories,
            completedRuns: completedRecords.length,
            failedRuns: records.filter(r => r.status === 'failed').length,
        };
    }

    /**
     * 清除缓存
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheExpiry.clear();
    }

    /**
     * 导出记录为JSON
     */
    exportRecords(records: FreeRunRecord[]): string {
        return JSON.stringify(records, null, 2);
    }

    /**
     * 搜索记录
     */
    searchRecords(records: FreeRunRecord[], query: string): FreeRunRecord[] {
        if (!query.trim()) return records;

        const lowerQuery = query.toLowerCase();
        return records.filter(record => {
            return (
                record.recordId.toLowerCase().includes(lowerQuery) ||
                record.distance.toLowerCase().includes(lowerQuery) ||
                record.avgSpeed.toLowerCase().includes(lowerQuery) ||
                record.startTime.toLowerCase().includes(lowerQuery)
            );
        });
    }

    private generateCacheKey(session: BasicRequest, filters?: RecordFilters): string {
        return `${session.stuNumber}_${JSON.stringify(filters || {})}`;
    }

    private isCacheValid(cacheKey: string): boolean {
        const expiry = this.cacheExpiry.get(cacheKey);
        return expiry ? Date.now() < expiry : false;
    }
}

export default RecordManager;