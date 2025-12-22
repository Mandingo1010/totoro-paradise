import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ParameterValidator } from '~/src/classes/ParameterValidator'
import type { FreeRunParams } from '~/src/types/requestTypes/FreeRunRequest'

describe('FreeRunSetup UI Parameter Validation', () => {
    const validator = new ParameterValidator()

    /**
     * **Feature: free-run-feature, Property 8: 参数验证一致性**
     * **Validates: Requirements 1.5**
     * 
     * For any parameter combination, when all parameters are valid, 
     * the validation should pass consistently
     */
    it('should validate parameters consistently for UI enabling logic', () => {
        fc.assert(fc.property(
            // Generate valid distance values
            fc.double({ min: 0.5, max: 20, noNaN: true }),
            (distance) => {
                const params: FreeRunParams = { distance }

                // Distance validation should pass for valid values
                const distanceResult = validator.validateDistance(params.distance)
                expect(distanceResult.isValid).toBe(true)

                // UI should enable start button for valid distance only
                const canStartRun = distanceResult.isValid
                expect(canStartRun).toBe(true)
            }
        ), { numRuns: 100 })
    })

    it('should validate speed parameters consistently when provided', () => {
        fc.assert(fc.property(
            fc.record({
                distance: fc.double({ min: 0.5, max: 20, noNaN: true }),
                speed: fc.double({ min: 3, max: 25, noNaN: true })
            }),
            (params) => {
                const freeRunParams: FreeRunParams = {
                    distance: params.distance,
                    avgSpeed: params.speed
                }

                // Both validations should pass for valid values
                const distanceResult = validator.validateDistance(freeRunParams.distance)
                const speedResult = validator.validateSpeed(freeRunParams.avgSpeed!)

                expect(distanceResult.isValid).toBe(true)
                expect(speedResult.isValid).toBe(true)

                // UI should enable start button for valid parameters
                const canStartRun = distanceResult.isValid && speedResult.isValid
                expect(canStartRun).toBe(true)
            }
        ), { numRuns: 100 })
    })

    it('should validate time parameters that result in valid speeds', () => {
        // Use predefined valid combinations to avoid floating point issues
        const validCombinations = [
            { distance: 1, time: 600 },   // 1km in 10 minutes = 6 km/h
            { distance: 5, time: 1800 },  // 5km in 30 minutes = 10 km/h
            { distance: 10, time: 2400 }, // 10km in 40 minutes = 15 km/h
            { distance: 3, time: 900 },   // 3km in 15 minutes = 12 km/h
            { distance: 2, time: 1200 }   // 2km in 20 minutes = 6 km/h
        ]

        validCombinations.forEach(combo => {
            const params: FreeRunParams = {
                distance: combo.distance,
                targetTime: combo.time
            }

            const distanceResult = validator.validateDistance(params.distance)
            const calculatedSpeed = params.distance / (params.targetTime! / 3600)
            const speedResult = validator.validateSpeed(calculatedSpeed)

            expect(distanceResult.isValid).toBe(true)
            expect(speedResult.isValid).toBe(true)

            const canStartRun = distanceResult.isValid && speedResult.isValid
            expect(canStartRun).toBe(true)
        })
    })

    it('should consistently reject invalid distance parameters', () => {
        fc.assert(fc.property(
            fc.oneof(
                fc.double({ min: -10, max: 0.49, noNaN: true }), // Too small
                fc.double({ min: 20.01, max: 50, noNaN: true })   // Too large
            ),
            (invalidDistance) => {
                const params: FreeRunParams = { distance: invalidDistance }

                const distanceResult = validator.validateDistance(params.distance)
                expect(distanceResult.isValid).toBe(false)

                // UI should disable start button for invalid distance
                const canStartRun = distanceResult.isValid
                expect(canStartRun).toBe(false)
            }
        ), { numRuns: 100 })
    })

    it('should consistently reject invalid speed parameters', () => {
        fc.assert(fc.property(
            fc.record({
                distance: fc.double({ min: 0.5, max: 20, noNaN: true }),
                invalidSpeed: fc.oneof(
                    fc.double({ min: -5, max: 2.9, noNaN: true }), // Too slow
                    fc.double({ min: 25.1, max: 50, noNaN: true })  // Too fast
                )
            }),
            (params) => {
                const distanceResult = validator.validateDistance(params.distance)
                const speedResult = validator.validateSpeed(params.invalidSpeed)

                expect(distanceResult.isValid).toBe(true)
                expect(speedResult.isValid).toBe(false)

                // UI should disable start button for invalid speed
                const canStartRun = distanceResult.isValid && speedResult.isValid
                expect(canStartRun).toBe(false)
            }
        ), { numRuns: 100 })
    })

    it('should consistently reject time that results in invalid speed', () => {
        const invalidCombinations = [
            { distance: 1, time: 60 },     // 1km in 1 minute = 60 km/h (too fast)
            { distance: 5, time: 120 },    // 5km in 2 minutes = 150 km/h (too fast)
            { distance: 1, time: 7200 },   // 1km in 2 hours = 0.5 km/h (too slow)
            { distance: 10, time: 36000 }  // 10km in 10 hours = 1 km/h (too slow)
        ]

        invalidCombinations.forEach(combo => {
            const calculatedSpeed = combo.distance / (combo.time / 3600)

            const distanceResult = validator.validateDistance(combo.distance)
            const speedResult = validator.validateSpeed(calculatedSpeed)

            expect(distanceResult.isValid).toBe(true)
            expect(speedResult.isValid).toBe(false)

            const canStartRun = distanceResult.isValid && speedResult.isValid
            expect(canStartRun).toBe(false)
        })
    })

    it('should handle edge cases in parameter validation', () => {
        // Test exact boundary values
        const boundaryTests = [
            { distance: 0.5, avgSpeed: 3 },     // Minimum valid values
            { distance: 20, avgSpeed: 25 },     // Maximum valid values
            { distance: 0.49, avgSpeed: 3 },    // Just below minimum distance
            { distance: 20.01, avgSpeed: 25 },  // Just above maximum distance
            { distance: 5, avgSpeed: 2.99 },    // Just below minimum speed
            { distance: 5, avgSpeed: 25.01 }    // Just above maximum speed
        ]

        boundaryTests.forEach(params => {
            const distanceResult = validator.validateDistance(params.distance)
            const speedResult = validator.validateSpeed(params.avgSpeed)

            const expectedDistanceValid = params.distance >= 0.5 && params.distance <= 20
            const expectedSpeedValid = params.avgSpeed >= 3 && params.avgSpeed <= 25

            expect(distanceResult.isValid).toBe(expectedDistanceValid)
            expect(speedResult.isValid).toBe(expectedSpeedValid)

            const canStartRun = distanceResult.isValid && speedResult.isValid
            expect(canStartRun).toBe(expectedDistanceValid && expectedSpeedValid)
        })
    })
})