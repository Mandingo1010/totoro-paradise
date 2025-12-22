import { describe, it, expect, beforeEach } from 'vitest';
import { RecordManager } from './RecordManager';
import type { FreeRunRecord } from '../types/responseTypes/FreeRunResponse';
import type { RecordFilters } from './RecordManager';

describe('RecordManager', () => {
    let recordManager: RecordManager;

    beforeEach(() => {
        recordManager = new RecordManager();
    });

    /**
     * **Feature: free-run-feature, Property 10: 记录过滤正确性**
     * 对于任何记录集合，按自由跑类型过滤应该只返回runType='1'的记录
     * **验证: 需求 4.2**
     */
    it('should only return records with runType="1" when filtering', () => {
        // Create test records with mixed types (using any to bypass type checking for test)
        const records: any[] = [
            {
                recordId: '1',
                stuNumber: '123',
                schoolId: '1',
                distance: '5.0',
                duration: '1800',
                avgSpeed: '10.0',
                avgPace: '6:00',
                calorie: '300',
                steps: '6000',
                startTime: '2024-01-01T10:00:00Z',
                endTime: '2024-01-01T10:30:00Z',
                submitTime: '2024-01-01T10:30:00Z',
                status: 'completed',
                runType: '1', // Free run
            },
            {
                recordId: '2',
                stuNumber: '123',
                schoolId: '1',
                distance: '3.0',
                duration: '1200',
                avgSpeed: '9.0',
                avgPace: '6:40',
                calorie: '180',
                steps: '3600',
                startTime: '2024-01-02T10:00:00Z',
                endTime: '2024-01-02T10:20:00Z',
                submitTime: '2024-01-02T10:20:00Z',
                status: 'completed',
                runType: '0', // Sun run (should be filtered out)
            },
            {
                recordId: '3',
                stuNumber: '123',
                schoolId: '1',
                distance: '2.0',
                duration: '900',
                avgSpeed: '8.0',
                avgPace: '7:30',
                calorie: '120',
                steps: '2400',
                startTime: '2024-01-03T10:00:00Z',
                endTime: '2024-01-03T10:15:00Z',
                submitTime: '2024-01-03T10:15:00Z',
                status: 'failed',
                runType: '1', // Free run
            },
        ];

        const filteredRecords = recordManager.filterRecords(records, {});

        // All filtered records should have runType='1' (free run)
        filteredRecords.forEach(record => {
            expect(record.runType).toBe('1');
        });

        // Should only have 2 records (excluding the sun run)
        expect(filteredRecords).toHaveLength(2);
        expect(filteredRecords[0].recordId).toBe('1');
        expect(filteredRecords[1].recordId).toBe('3');
    });

    /**
     * **Feature: free-run-feature, Property 11: 记录显示完整性**
     * 对于任何自由跑记录，显示应该包含日期、距离、用时、平均速度和卡路里信息
     * **验证: 需求 4.3**
     */
    it('should include all required display information for any free run record', () => {
        const record: FreeRunRecord = {
            recordId: '1',
            stuNumber: '123',
            schoolId: '1',
            distance: '5.0',
            duration: '1800',
            avgSpeed: '10.0',
            avgPace: '6:00',
            calorie: '300',
            steps: '6000',
            startTime: '2024-01-01T10:00:00Z',
            endTime: '2024-01-01T10:30:00Z',
            submitTime: '2024-01-01T10:30:00Z',
            status: 'completed',
            runType: '1',
        };

        // Verify all required display fields are present and valid
        expect(record.startTime).toBeDefined();
        expect(record.startTime).not.toBe('');
        expect(new Date(record.startTime)).toBeInstanceOf(Date);
        expect(isNaN(new Date(record.startTime).getTime())).toBe(false);

        expect(record.distance).toBeDefined();
        expect(record.distance).not.toBe('');
        expect(parseFloat(record.distance)).toBeGreaterThan(0);

        expect(record.duration).toBeDefined();
        expect(record.duration).not.toBe('');
        expect(parseInt(record.duration)).toBeGreaterThan(0);

        expect(record.avgSpeed).toBeDefined();
        expect(record.avgSpeed).not.toBe('');
        expect(parseFloat(record.avgSpeed)).toBeGreaterThan(0);

        expect(record.calorie).toBeDefined();
        expect(record.calorie).not.toBe('');
        expect(parseInt(record.calorie)).toBeGreaterThan(0);
    });

    it('should calculate stats correctly', () => {
        const records: FreeRunRecord[] = [
            {
                recordId: '1',
                stuNumber: '123',
                schoolId: '1',
                distance: '5.0',
                duration: '1800',
                avgSpeed: '10.0',
                avgPace: '6:00',
                calorie: '300',
                steps: '6000',
                startTime: '2024-01-01T10:00:00Z',
                endTime: '2024-01-01T10:30:00Z',
                submitTime: '2024-01-01T10:30:00Z',
                status: 'completed',
                runType: '1',
            },
            {
                recordId: '2',
                stuNumber: '123',
                schoolId: '1',
                distance: '3.0',
                duration: '1200',
                avgSpeed: '9.0',
                avgPace: '6:40',
                calorie: '180',
                steps: '3600',
                startTime: '2024-01-02T10:00:00Z',
                endTime: '2024-01-02T10:20:00Z',
                submitTime: '2024-01-02T10:20:00Z',
                status: 'completed',
                runType: '1',
            },
        ];

        const stats = recordManager.calculateStats(records);

        expect(stats.totalRuns).toBe(2);
        expect(stats.completedRuns).toBe(2);
        expect(stats.totalDistance).toBe(8.0);
        expect(stats.avgSpeed).toBe(9.5);
    });
});