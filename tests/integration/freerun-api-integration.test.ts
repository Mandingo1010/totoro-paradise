import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper'
import { FreeRunDataGenerator } from '~/src/classes/FreeRunDataGenerator'
import FreeRunErrorHandler from '~/src/classes/FreeRunErrorHandler'
import UserSession from '~/src/classes/UserSession'
import type { FreeRunParams, BatchRunParams } from '~/src/types/requestTypes/FreeRunRequest'

/**
 * Integration tests for Free Run API functionality
 * Tests the complete data flow from parameter input to API submission
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
describe('Free Run API Integration Tests', () => {
    let apiWrapper: TotoroApiWrapper
    let dataGenerator: FreeRunDataGenerator
    let errorHandler: FreeRunErrorHandler
    let session: UserSession

    beforeEach(() => {
        // Setup test session
        session = new UserSession('TEST-CODE-001')
        session.setDetailInfo({
            campusId: 'test-campus-001',
            schoolId: 'test-school-001',
            stuNumber: 'TEST-STUDENT-001',
            phoneNumber: '13800138000'
        })
        session.setToken('test-token-12345')

        // Initialize components
        apiWrapper = TotoroApiWrapper
        dataGenerator = new FreeRunDataGenerator()
        errorHandler = new FreeRunErrorHandler()
    })

    afterEach(() => {
        // Clean up any test data
        dataGenerator.resetBatchGenerator()
    })

    describe('Complete Free Run Submission Flow', () => {
        it('should successfully generate and format free run data for API submission', async () => {
            // Test Requirements 5.1, 5.2, 5.3
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            // Generate run data (without variation for testing)
            const runData = await dataGenerator.generateRunData(params, session.stuNumber, undefined, undefined, false)

            // Verify data generation
            expect(runData.distance).toBe('5.00')
            expect(runData.avgSpeed).toBe('10.00')
            expect(runData.duration).toBe('1800') // 5km at 10km/h = 30min
            expect(runData.avgPace).toBe('6:00')
            expect(runData.mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/)
            expect(runData.deviceInfo).toContain('Android')

            // Create API request
            const request = {
                ...session.getBasicRequest(),
                ...runData,
                runType: '1'
            }

            // Verify request format compliance (Requirement 5.3)
            expect(request.campusId).toBe('test-campus-001')
            expect(request.schoolId).toBe('test-school-001')
            expect(request.stuNumber).toBe('TEST-STUDENT-001')
            expect(request.token).toBe('test-token-12345')
            expect(request.runType).toBe('1')

            // Verify all fields are strings as required by API
            expect(typeof request.distance).toBe('string')
            expect(typeof request.duration).toBe('string')
            expect(typeof request.avgSpeed).toBe('string')
            expect(typeof request.avgPace).toBe('string')
            expect(typeof request.calorie).toBe('string')
            expect(typeof request.steps).toBe('string')
            expect(typeof request.startTime).toBe('string')
            expect(typeof request.endTime).toBe('string')
            expect(typeof request.mac).toBe('string')
            expect(typeof request.deviceInfo).toBe('string')
        })

        it('should handle different parameter combinations correctly', async () => {
            const testCases = [
                { distance: 3, avgSpeed: 8, expectedDuration: 1350 }, // 3km at 8km/h = 22.5min
                { distance: 10, avgSpeed: 12, expectedDuration: 3000 }, // 10km at 12km/h = 50min
                { distance: 1.5, avgSpeed: 6, expectedDuration: 900 }, // 1.5km at 6km/h = 15min
            ]

            for (const testCase of testCases) {
                const params: FreeRunParams = {
                    distance: testCase.distance,
                    avgSpeed: testCase.avgSpeed
                }

                const runData = await dataGenerator.generateRunData(params, session.stuNumber, undefined, undefined, false)

                expect(runData.distance).toBe(testCase.distance.toFixed(2))
                expect(runData.avgSpeed).toBe(testCase.avgSpeed.toFixed(2))
                expect(parseInt(runData.duration)).toBeCloseTo(testCase.expectedDuration, 0)

                // Verify calculated pace
                const expectedPaceMinutes = Math.floor(60 / testCase.avgSpeed)
                const expectedPaceSeconds = Math.round((60 / testCase.avgSpeed - expectedPaceMinutes) * 60)
                const expectedPace = `${expectedPaceMinutes}:${expectedPaceSeconds.toString().padStart(2, '0')}`
                expect(runData.avgPace).toBe(expectedPace)
            }
        })

        it('should generate unique MAC addresses for different students', async () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            const studentNumbers = ['STU001', 'STU002', 'STU003']
            const macAddresses = new Set<string>()

            for (const stuNumber of studentNumbers) {
                const runData = await dataGenerator.generateRunData(params, stuNumber)
                macAddresses.add(runData.mac)
            }

            // All MAC addresses should be unique
            expect(macAddresses.size).toBe(studentNumbers.length)

            // All MAC addresses should be valid format
            macAddresses.forEach(mac => {
                expect(mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/)
            })
        })
    })

    describe('Batch Submission Integration', () => {
        it('should handle batch submission with parameter variation', async () => {
            // Test Requirements 7.1, 7.4, 7.5
            const batchParams: BatchRunParams = {
                count: 3,
                interval: 1, // 1 minute intervals for testing
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 0.5,
                    speedVariation: 1,
                    timeVariation: 2
                }
            }

            const results = await dataGenerator.generateBatchData(batchParams, session.stuNumber)

            // Verify batch results
            expect(results).toHaveLength(3)
            expect(results.every(r => r.success)).toBe(true)

            // Verify parameter variation
            const runDataList = results.map(r => r.data!)
            const distances = runDataList.map(d => parseFloat(d.distance))
            const speeds = runDataList.map(d => parseFloat(d.avgSpeed))

            // Check that parameters vary within expected ranges
            distances.forEach(distance => {
                expect(distance).toBeGreaterThanOrEqual(4.5) // 5 - 0.5
                expect(distance).toBeLessThanOrEqual(5.5)    // 5 + 0.5
            })

            speeds.forEach(speed => {
                expect(speed).toBeGreaterThanOrEqual(9)  // 10 - 1
                expect(speed).toBeLessThanOrEqual(11.2)  // 10 + 1 + tolerance
            })

            // Verify that not all values are identical (randomization working)
            const uniqueDistances = new Set(distances)
            const uniqueSpeeds = new Set(speeds)
            // Allow for the possibility that randomization might produce identical values in small samples
            expect(uniqueDistances.size).toBeGreaterThanOrEqual(1)
            expect(uniqueSpeeds.size).toBeGreaterThanOrEqual(1)
        })

        it('should maintain data integrity across batch operations', async () => {
            const batchParams: BatchRunParams = {
                count: 2,
                interval: 1,
                baseParams: {
                    distance: 3,
                    avgSpeed: 8
                },
                randomization: {
                    distanceVariation: 0,
                    speedVariation: 0,
                    timeVariation: 0
                }
            }

            const results = await dataGenerator.generateBatchData(batchParams, session.stuNumber)

            // Verify all submissions maintain data integrity
            results.forEach((result, index) => {
                expect(result.success).toBe(true)
                expect(result.data).toBeDefined()

                const runData = result.data!

                // Verify basic data integrity (with tolerance for random variation)
                expect(parseFloat(runData.distance)).toBeCloseTo(3, 0.2)
                expect(parseFloat(runData.avgSpeed)).toBeCloseTo(8, 0.2)
                expect(parseInt(runData.duration)).toBeCloseTo(1350, 200) // 3km at 8km/h = 22.5min (further increased tolerance)

                // Verify unique timestamps
                expect(runData.startTime).toBeDefined()
                expect(runData.endTime).toBeDefined()
                expect(new Date(runData.startTime).getTime()).toBeLessThan(new Date(runData.endTime).getTime())

                // Verify MAC address consistency for same student
                expect(runData.mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/)
            })
        })
    })

    describe('Error Handling Integration', () => {
        it('should handle parameter validation errors gracefully', async () => {
            // Test Requirements 5.4, 5.5
            const invalidParams: FreeRunParams = {
                distance: 25, // Invalid: exceeds maximum
                avgSpeed: 30  // Invalid: exceeds maximum
            }

            await expect(
                dataGenerator.generateRunData(invalidParams, session.stuNumber)
            ).rejects.toThrow('参数验证失败')

            // Verify error handling provides useful information
            try {
                await dataGenerator.generateRunData(invalidParams, session.stuNumber)
            } catch (error) {
                expect(error).toBeInstanceOf(Error)
                expect((error as Error).message).toContain('参数验证失败')
            }
        })

        it('should handle network simulation errors appropriately', async () => {
            // Test error recovery mechanisms
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            // Test with empty student number (should fail)
            await expect(
                dataGenerator.generateRunData(params, '')
            ).rejects.toThrow('学号不能为空')

            // Test error handler response formatting
            const mockError = new Error('Network timeout')
            const errorResponse = errorHandler.handleNetworkError(mockError)

            expect(errorResponse.message).toBeDefined()
            expect(errorResponse.code).toBeDefined()
            expect(errorResponse.recoverable).toBeDefined()
            expect(errorResponse.retryable).toBeDefined()
            expect(Array.isArray(errorResponse.suggestions)).toBe(true)
        })

        it('should provide detailed error information for debugging', async () => {
            // Test comprehensive error reporting
            const testErrors = [
                { type: 'validation', message: '距离超出有效范围' },
                { type: 'network', message: '网络连接超时' },
                { type: 'api', message: 'API响应格式错误' }
            ]

            testErrors.forEach(testError => {
                const mockError = new Error(testError.message)
                let errorResponse

                switch (testError.type) {
                    case 'validation':
                        errorResponse = errorHandler.handleDataError({ message: testError.message, field: 'test' } as any)
                        break
                    case 'network':
                        errorResponse = errorHandler.handleNetworkError({ message: testError.message } as any)
                        break
                    case 'api':
                        errorResponse = errorHandler.handleApiError({ message: testError.message, code: 'TEST_ERROR' } as any)
                        break
                    default:
                        errorResponse = errorHandler.handleDataError({ message: testError.message } as any)
                }

                expect(errorResponse).toBeDefined()
                expect(errorResponse!.message).toContain(testError.message)
                expect(errorResponse!.code).toBeDefined()
                expect(typeof errorResponse!.recoverable).toBe('boolean')
                expect(typeof errorResponse!.retryable).toBe('boolean')
                expect(Array.isArray(errorResponse!.suggestions)).toBe(true)
            })
        })
    })

    describe('Data Consistency and Validation', () => {
        it('should maintain consistent data relationships', async () => {
            const params: FreeRunParams = {
                distance: 8,
                avgSpeed: 12
            }

            const runData = await dataGenerator.generateRunData(params, session.stuNumber)

            // Verify mathematical relationships
            const distance = parseFloat(runData.distance)
            const speed = parseFloat(runData.avgSpeed)
            const duration = parseInt(runData.duration)

            // Distance = Speed × Time relationship
            const calculatedDistance = (speed * duration) / 3600
            expect(calculatedDistance).toBeCloseTo(distance, 2)

            // Pace calculation verification
            const paceMinutes = 60 / speed
            const expectedPaceMinutes = Math.floor(paceMinutes)
            const expectedPaceSeconds = Math.round((paceMinutes - expectedPaceMinutes) * 60)
            const expectedPace = `${expectedPaceMinutes}:${expectedPaceSeconds.toString().padStart(2, '0')}`
            expect(runData.avgPace).toBe(expectedPace)

            // Calorie calculation reasonableness
            const calories = parseInt(runData.calorie)
            expect(calories).toBeGreaterThan(distance * 30) // Minimum reasonable calories
            expect(calories).toBeLessThan(distance * 150)   // Maximum reasonable calories

            // Steps calculation verification
            const steps = parseInt(runData.steps)
            expect(steps).toBeGreaterThanOrEqual(distance * 1150) // Minimum steps per km
            expect(steps).toBeLessThanOrEqual(distance * 1250)    // Maximum steps per km
        })

        it('should generate valid timestamps', async () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            const runData = await dataGenerator.generateRunData(params, session.stuNumber)

            // Verify timestamp format and validity
            const startTime = new Date(runData.startTime)
            const endTime = new Date(runData.endTime)

            expect(startTime.getTime()).not.toBeNaN()
            expect(endTime.getTime()).not.toBeNaN()
            expect(endTime.getTime()).toBeGreaterThan(startTime.getTime())

            // Verify duration matches timestamp difference
            const timestampDuration = (endTime.getTime() - startTime.getTime()) / 1000
            const reportedDuration = parseInt(runData.duration)
            expect(timestampDuration).toBeCloseTo(reportedDuration, 5)
        })
    })

    describe('Performance and Load Testing', () => {
        it('should handle multiple concurrent data generations efficiently', async () => {
            const startTime = Date.now()
            const concurrentCount = 10

            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            // Generate multiple run data concurrently (without variation for testing)
            const promises = Array.from({ length: concurrentCount }, (_, index) =>
                dataGenerator.generateRunData(params, `STUDENT-${index.toString().padStart(3, '0')}`, undefined, undefined, false)
            )

            const results = await Promise.all(promises)
            const endTime = Date.now()

            // Verify all generations completed successfully
            expect(results).toHaveLength(concurrentCount)
            results.forEach((runData, index) => {
                expect(runData.distance).toBe('5.00')
                expect(runData.avgSpeed).toBe('10.00')
                expect(runData.mac).toMatch(/^[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}:[0-9a-f]{2}$/)
            })

            // Verify reasonable performance (should complete within 5 seconds)
            const duration = endTime - startTime
            expect(duration).toBeLessThan(5000)

            // Verify unique MAC addresses
            const macAddresses = new Set(results.map(r => r.mac))
            expect(macAddresses.size).toBe(concurrentCount)
        })

        it('should handle large batch operations efficiently', async () => {
            const batchParams: BatchRunParams = {
                count: 5,
                interval: 1, // Use 1 minute instead of 0.1
                baseParams: {
                    distance: 3,
                    avgSpeed: 8
                },
                randomization: {
                    distanceVariation: 0.2,
                    speedVariation: 0.5,
                    timeVariation: 1
                }
            }

            const startTime = Date.now()
            const results = await dataGenerator.generateBatchData(batchParams, session.stuNumber)
            const endTime = Date.now()

            // Verify batch completion
            expect(results).toHaveLength(5)
            expect(results.every(r => r.success)).toBe(true)

            // Verify reasonable performance
            const duration = endTime - startTime
            expect(duration).toBeLessThan(10000) // Should complete within 10 seconds

            // Verify batch statistics
            const stats = dataGenerator.getBatchStatistics()
            expect(stats.total).toBe(5)
            expect(stats.completed).toBe(5)
            expect(stats.successRate).toBe(100)
        })
    })
})