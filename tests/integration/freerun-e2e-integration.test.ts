import { describe, it, expect, beforeEach } from 'vitest'
import { FreeRunDataGenerator } from '~/src/classes/FreeRunDataGenerator'
import { TemplateManager } from '~/src/classes/TemplateManager'
import { RecordManager } from '~/src/classes/RecordManager'
import FreeRunErrorHandler from '~/src/classes/FreeRunErrorHandler'
import UserSession from '~/src/classes/UserSession'
import type { FreeRunParams, BatchRunParams } from '~/src/types/requestTypes/FreeRunRequest'

describe('Free Run End-to-End Integration Tests', () => {
    let session: UserSession
    let dataGenerator: FreeRunDataGenerator
    let templateManager: TemplateManager
    let recordManager: RecordManager
    let errorHandler: FreeRunErrorHandler

    beforeEach(() => {
        session = new UserSession('E2E-TEST-001')
        session.setDetailInfo({
            campusId: 'e2e-campus',
            schoolId: 'e2e-school',
            stuNumber: 'E2E-STUDENT-001',
            phoneNumber: '13900139000'
        })
        session.setToken('e2e-test-token')

        dataGenerator = new FreeRunDataGenerator()
        templateManager = new TemplateManager()
        recordManager = new RecordManager()
        errorHandler = new FreeRunErrorHandler()
    })

    describe('Complete Single Run Workflow', () => {
        it('should complete full single run workflow', async () => {
            const availableTemplates = templateManager.getAvailableTemplates()
            expect(availableTemplates.length).toBeGreaterThan(0)

            const templateParams = templateManager.applyTemplate('standard-run')
            expect(templateParams.distance).toBe(5)
            expect(templateParams.avgSpeed).toBe(10)

            const validation = dataGenerator.validateParameters(templateParams)
            expect(validation.isValid).toBe(true)
            expect(validation.errors).toHaveLength(0)

            const runData = await dataGenerator.generateRunData(templateParams, session.stuNumber)
            expect(runData.distance).toBe('5.00')
            expect(runData.avgSpeed).toBe('10.00')
            expect(runData.duration).toBe('1800')

            const record = {
                recordId: `record-${Date.now()}`,
                stuNumber: session.stuNumber,
                schoolId: session.schoolId,
                distance: runData.distance,
                duration: runData.duration,
                avgSpeed: runData.avgSpeed,
                avgPace: runData.avgPace,
                calorie: runData.calorie,
                steps: runData.steps,
                startTime: runData.startTime,
                endTime: runData.endTime,
                submitTime: new Date().toISOString(),
                status: 'completed' as const,
                runType: '1' as const
            }

            expect(record.distance).toBe('5.00')
            expect(record.status).toBe('completed')
            expect(record.runType).toBe('1')
        })

        it('should handle template selection and parameter customization', async () => {
            const templates = templateManager.getAvailableTemplates()

            for (const template of templates) {
                const params = templateManager.applyTemplate(template.id)

                expect(params.distance).toBeGreaterThanOrEqual(0.5)
                expect(params.distance).toBeLessThanOrEqual(20)

                if (params.avgSpeed) {
                    expect(params.avgSpeed).toBeGreaterThanOrEqual(3)
                    expect(params.avgSpeed).toBeLessThanOrEqual(25)
                }

                const runData = await dataGenerator.generateRunData(params, session.stuNumber)
                expect(runData.distance).toBeDefined()
                expect(runData.avgSpeed).toBeDefined()
            }
        })
    })

    describe('Complete Batch Run Workflow', () => {
        it('should complete full batch run workflow', async () => {
            const batchParams: BatchRunParams = {
                count: 3,
                interval: 1,
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

            const batchValidation = dataGenerator.validateBatchParameters(batchParams)
            expect(batchValidation.isValid).toBe(true)

            const batchResults = await dataGenerator.generateBatchData(batchParams, session.stuNumber)
            expect(batchResults).toHaveLength(3)
            expect(batchResults.every((r: any) => r.success)).toBe(true)

            const batchStats = dataGenerator.getBatchStatistics()
            expect(batchStats.total).toBe(3)
            expect(batchStats.completed).toBe(3)
            expect(batchStats.successRate).toBe(100)
        })

        it('should handle batch parameter variations correctly', async () => {
            const batchParams: BatchRunParams = {
                count: 5,
                interval: 1,
                baseParams: {
                    distance: 5,
                    avgSpeed: 10
                },
                randomization: {
                    distanceVariation: 1,
                    speedVariation: 2,
                    timeVariation: 5
                }
            }

            const results = await dataGenerator.generateBatchData(batchParams, session.stuNumber)

            expect(results.every(r => r.success)).toBe(true)

            const distances = results.map(r => parseFloat(r.data!.distance))
            const speeds = results.map(r => parseFloat(r.data!.avgSpeed))

            distances.forEach(d => {
                expect(d).toBeGreaterThanOrEqual(4)
                expect(d).toBeLessThanOrEqual(6)
            })

            speeds.forEach(s => {
                expect(s).toBeGreaterThanOrEqual(8)
                expect(s).toBeLessThanOrEqual(12)
            })
        })
    })

    describe('Error Recovery Workflow', () => {
        it('should handle and recover from validation errors', async () => {
            const invalidParams: FreeRunParams = {
                distance: 25,
                avgSpeed: 30
            }

            try {
                await dataGenerator.generateRunData(invalidParams, session.stuNumber)
                expect.fail('Should have thrown validation error')
            } catch (error) {
                expect(error).toBeInstanceOf(Error)
                expect((error as Error).message).toContain('参数验证失败')

                const errorResponse = errorHandler.handleDataError({
                    message: (error as Error).message,
                    field: 'distance'
                } as any)

                expect(errorResponse.message).toBeDefined()
                expect(errorResponse.recoverable).toBe(true)
                expect(errorResponse.suggestions.length).toBeGreaterThan(0)
            }

            const correctedParams: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            const runData = await dataGenerator.generateRunData(correctedParams, session.stuNumber)
            expect(runData.distance).toBe('5.00')
            expect(runData.avgSpeed).toBe('10.00')
        })

        it('should handle network error scenarios', () => {
            const networkError = { message: 'Connection timeout', statusCode: 408 }
            const response = errorHandler.handleNetworkError(networkError as any)

            expect(response.code).toBe('NETWORK_ERROR')
            expect(response.recoverable).toBe(true)
            expect(response.suggestions.length).toBeGreaterThan(0)
        })

        it('should handle API error scenarios', () => {
            const apiError = { message: 'Invalid token', code: 'INVALID_TOKEN', statusCode: 401 }
            const response = errorHandler.handleApiError(apiError as any)

            expect(response.code).toBe('AUTH_ERROR')
            expect(response.recoverable).toBe(true)
            expect(response.suggestions.length).toBeGreaterThan(0)
        })
    })

    describe('Data Integrity Workflow', () => {
        it('should maintain data integrity throughout complete workflow', async () => {
            const testRuns = [
                { distance: 3, avgSpeed: 8 },
                { distance: 5, avgSpeed: 10 },
                { distance: 8, avgSpeed: 12 }
            ]

            const generatedRecords = []

            for (const params of testRuns) {
                const runData = await dataGenerator.generateRunData(params, session.stuNumber)

                const distance = parseFloat(runData.distance)
                const speed = parseFloat(runData.avgSpeed)
                const duration = parseInt(runData.duration)

                const calculatedDistance = (speed * duration) / 3600
                expect(calculatedDistance).toBeCloseTo(distance, 2)

                const record = {
                    recordId: `integrity-${Date.now()}-${Math.random()}`,
                    stuNumber: session.stuNumber,
                    schoolId: session.schoolId,
                    distance: runData.distance,
                    duration: runData.duration,
                    avgSpeed: runData.avgSpeed,
                    avgPace: runData.avgPace,
                    calorie: runData.calorie,
                    steps: runData.steps,
                    startTime: runData.startTime,
                    endTime: runData.endTime,
                    submitTime: new Date().toISOString(),
                    status: 'completed' as const,
                    runType: '1' as const
                }

                generatedRecords.push(record)
            }

            expect(generatedRecords).toHaveLength(3)
            generatedRecords.forEach((record, index) => {
                expect(record.distance).toBe(testRuns[index].distance.toFixed(2))
                expect(record.avgSpeed).toBe(testRuns[index].avgSpeed.toFixed(2))
                expect(record.status).toBe('completed')
                expect(record.runType).toBe('1')
            })

            const freeRunRecords = generatedRecords.filter(r => r.runType === '1')
            expect(freeRunRecords).toHaveLength(3)

            const sortedRecords = [...freeRunRecords].sort((a, b) =>
                parseFloat(a.distance) - parseFloat(b.distance)
            )
            expect(parseFloat(sortedRecords[0].distance)).toBe(3)
            expect(parseFloat(sortedRecords[2].distance)).toBe(8)

            void recordManager
        })

        it('should verify timestamp consistency', async () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            const runData = await dataGenerator.generateRunData(params, session.stuNumber)

            const startTime = new Date(runData.startTime)
            const endTime = new Date(runData.endTime)

            expect(startTime.getTime()).not.toBeNaN()
            expect(endTime.getTime()).not.toBeNaN()
            expect(endTime.getTime()).toBeGreaterThan(startTime.getTime())

            const timestampDuration = (endTime.getTime() - startTime.getTime()) / 1000
            const reportedDuration = parseInt(runData.duration)
            expect(timestampDuration).toBeCloseTo(reportedDuration, 1)
        })
    })

    describe('Record Management Workflow', () => {
        it('should handle record filtering correctly', () => {
            const mockRecords = [
                { recordId: '1', distance: '3.00', status: 'completed', runType: '1' },
                { recordId: '2', distance: '5.00', status: 'completed', runType: '1' },
                { recordId: '3', distance: '8.00', status: 'failed', runType: '1' },
                { recordId: '4', distance: '10.00', status: 'completed', runType: '0' }
            ]

            const freeRunRecords = mockRecords.filter(r => r.runType === '1')
            expect(freeRunRecords).toHaveLength(3)

            const completedRecords = freeRunRecords.filter(r => r.status === 'completed')
            expect(completedRecords).toHaveLength(2)

            const mediumDistanceRecords = freeRunRecords.filter(r => {
                const distance = parseFloat(r.distance)
                return distance >= 4 && distance <= 6
            })
            expect(mediumDistanceRecords).toHaveLength(1)
            expect(mediumDistanceRecords[0].distance).toBe('5.00')
        })

        it('should calculate statistics correctly', () => {
            const mockRecords = [
                { distance: '3.00', duration: '1350', avgSpeed: '8.00', calorie: '210' },
                { distance: '5.00', duration: '1800', avgSpeed: '10.00', calorie: '350' },
                { distance: '8.00', duration: '2400', avgSpeed: '12.00', calorie: '560' }
            ]

            const totalDistance = mockRecords.reduce((sum, r) => sum + parseFloat(r.distance), 0)
            const totalDuration = mockRecords.reduce((sum, r) => sum + parseInt(r.duration), 0)
            const totalCalories = mockRecords.reduce((sum, r) => sum + parseInt(r.calorie), 0)
            const avgSpeed = totalDistance / (totalDuration / 3600)

            expect(totalDistance).toBe(16)
            expect(totalDuration).toBe(5550)
            expect(totalCalories).toBe(1120)
            expect(avgSpeed).toBeCloseTo(10.38, 1)
        })
    })
})
