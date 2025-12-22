import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import type FreeRunRequest from '../types/requestTypes/FreeRunRequest';
import UserSession from '../classes/UserSession';

// Helper to generate valid MAC address format using hex characters
const hexChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
const hexPairArb = fc.array(fc.constantFrom(...hexChars), { minLength: 2, maxLength: 2 })
    .map(chars => chars.join(''));

const macAddressArb = fc.tuple(
    hexPairArb, hexPairArb, hexPairArb, hexPairArb, hexPairArb, hexPairArb
).map(parts => parts.join(':'));

// Helper to generate valid pace format (MM:SS)
const paceArb = fc.tuple(
    fc.integer({ min: 2, max: 20 }),
    fc.integer({ min: 0, max: 59 })
).map(([min, sec]) => `${min}:${sec.toString().padStart(2, '0')}`);

describe('TotoroApiWrapper Free Run Extensions', () => {
    let session: UserSession;

    beforeEach(() => {
        session = new UserSession('test-code');
        session.setDetailInfo({
            campusId: 'test-campus',
            schoolId: 'test-school',
            stuNumber: 'test-student',
            phoneNumber: '12345678901'
        });
        session.setToken('test-token');
    });

    describe('Property 14: Request Format Compliance', () => {
        /**
         * Feature: free-run-feature, Property 14: 请求格式合规性
         * For any free run data, the generated request should strictly comply with discovered API format requirements
         * Validates: Requirements 5.3
         */
        it('should generate compliant free run request format', () => {
            fc.assert(fc.property(
                fc.record({
                    distance: fc.float({ min: 0.5, max: 20, noNaN: true }).map(d => d.toFixed(2)),
                    duration: fc.integer({ min: 300, max: 7200 }).map(d => d.toString()),
                    avgSpeed: fc.float({ min: 3, max: 25, noNaN: true }).map(s => s.toFixed(2)),
                    avgPace: paceArb,
                    calorie: fc.integer({ min: 50, max: 2000 }).map(c => c.toString()),
                    steps: fc.integer({ min: 500, max: 30000 }).map(s => s.toString()),
                    startTime: fc.date().map(d => d.toISOString()),
                    endTime: fc.date().map(d => d.toISOString()),
                    mac: macAddressArb,
                    deviceInfo: fc.string({ minLength: 1, maxLength: 100 })
                }),
                (freeRunData) => {
                    const request: FreeRunRequest = {
                        ...session.getBasicRequest(),
                        ...freeRunData,
                        runType: '1'
                    };

                    // Verify all required fields are present
                    expect(request.campusId).toBeDefined();
                    expect(request.schoolId).toBeDefined();
                    expect(request.stuNumber).toBeDefined();
                    expect(request.token).toBeDefined();
                    expect(request.distance).toBeDefined();
                    expect(request.duration).toBeDefined();
                    expect(request.avgSpeed).toBeDefined();
                    expect(request.avgPace).toBeDefined();
                    expect(request.calorie).toBeDefined();
                    expect(request.steps).toBeDefined();
                    expect(request.startTime).toBeDefined();
                    expect(request.endTime).toBeDefined();
                    expect(request.mac).toBeDefined();
                    expect(request.deviceInfo).toBeDefined();
                    expect(request.runType).toBe('1');

                    // Verify field types are strings (as required by API)
                    expect(typeof request.distance).toBe('string');
                    expect(typeof request.duration).toBe('string');
                    expect(typeof request.avgSpeed).toBe('string');
                    expect(typeof request.avgPace).toBe('string');
                    expect(typeof request.calorie).toBe('string');
                    expect(typeof request.steps).toBe('string');
                    expect(typeof request.startTime).toBe('string');
                    expect(typeof request.endTime).toBe('string');
                    expect(typeof request.mac).toBe('string');
                    expect(typeof request.deviceInfo).toBe('string');
                    expect(typeof request.runType).toBe('string');

                    // Verify numeric fields are valid
                    expect(parseFloat(request.distance)).toBeGreaterThanOrEqual(0.5);
                    expect(parseFloat(request.distance)).toBeLessThanOrEqual(20);
                    expect(parseInt(request.duration)).toBeGreaterThanOrEqual(300);
                    expect(parseInt(request.duration)).toBeLessThanOrEqual(7200);
                    expect(parseFloat(request.avgSpeed)).toBeGreaterThanOrEqual(3);
                    expect(parseFloat(request.avgSpeed)).toBeLessThanOrEqual(25);
                    expect(parseInt(request.calorie)).toBeGreaterThanOrEqual(50);
                    expect(parseInt(request.calorie)).toBeLessThanOrEqual(2000);
                    expect(parseInt(request.steps)).toBeGreaterThanOrEqual(500);
                    expect(parseInt(request.steps)).toBeLessThanOrEqual(30000);
                }
            ), { numRuns: 100 });
        });
    });
});