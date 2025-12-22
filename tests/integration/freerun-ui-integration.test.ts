import { describe, it, expect, beforeEach } from 'vitest'
import { ParameterValidator } from '~/src/classes/ParameterValidator'
import { TemplateManager } from '~/src/classes/TemplateManager'
import { FreeRunDataGenerator } from '~/src/classes/FreeRunDataGenerator'
import { RunCalculator } from '~/src/classes/RunCalculator'
import FreeRunErrorHandler, { NetworkError, ApiError, DataError } from '~/src/classes/FreeRunErrorHandler'
import type { FreeRunParams, BatchRunParams } from '~/src/types/requestTypes/FreeRunRequest'

/**
 * Integration tests for Free Run User Interface Logic
 * Tests the underlying logic that powers the UI components
 * Requirements: 1.1, 3.1, 4.1, 6.5
 */
describe('Free Run UI Logic Integration Tests', () => {
    let validator: ParameterValidator
    let templateManager: TemplateManager
    let dataGenerator: FreeRunDataGenerator
    let calculator: RunCalculator
    let errorHandler: FreeRunErrorHandler

    beforeEach(() => {
        validator = new ParameterValidator()
        templateManager = new TemplateManager()
        dataGenerator = new FreeRunDataGenerator()
        calculator = new RunCalculator()
        errorHandler = new FreeRunErrorHandler()
    })

    describe('Parameter Setup Logic (Requirement 1.1)', () => {
        it('should validate distance input correctly', () => {
            // Valid distances
            expect(validator.validateDistance(0.5).isValid).toBe(true)
            expect(validator.validateDistance(5).isValid).toBe(true)
            expect(validator.validateDistance(20).isValid).toBe(true)

            // Invalid distances
            expect(validator.validateDistance(0.4).isValid).toBe(false)
            expect(validator.validateDistance(21).isValid).toBe(false)
            expect(validator.validateDistance(-1).isValid).toBe(false)
            expect(validator.validateDistance(0).isValid).toBe(false)
        })

        it('should validate speed input correctly', () => {
            // Valid speeds
            expect(validator.validateSpeed(3).isValid).toBe(true)
            expect(validator.validateSpeed(10).isValid).toBe(true)
            expect(validator.validateSpeed(25).isValid).toBe(true)

            // Invalid speeds
            expect(validator.validateSpeed(2).isValid).toBe(false)
            expect(validator.validateSpeed(26).isValid).toBe(false)
            expect(validator.validateSpeed(-1).isValid).toBe(false)
        })

        it('should provide clear error messages for invalid inputs', () => {
            const distanceResult = validator.validateDistance(25)
            expect(distanceResult.isValid).toBe(false)
            expect(distanceResult.errors.length).toBeGreaterThan(0)
            expect(distanceResult.errors[0]).toContain('距离')

            const speedResult = validator.validateSpeed(30)
            expect(speedResult.isValid).toBe(false)
            expect(speedResult.errors.length).toBeGreaterThan(0)
            expect(speedResult.errors[0]).toContain('速度')
        })

        it('should handle template selection and application', () => {
            const templates = templateManager.getAvailableTemplates()
            expect(templates.length).toBe(3)

            // Test easy-run template
            const easyParams = templateManager.applyTemplate('easy-run')
            expect(easyParams.distance).toBe(3)
            expect(easyParams.avgSpeed).toBe(7)

            // Test standard-run template
            const standardParams = templateManager.applyTemplate('standard-run')
            expect(standardParams.distance).toBe(5)
            expect(standardParams.avgSpeed).toBe(10)

            // Test challenge-run template
            const challengeParams = templateManager.applyTemplate('challenge-run')
            expect(challengeParams.distance).toBe(10)
            expect(challengeParams.avgSpeed).toBe(12.5)
        })

        it('should enable start button only when parameters are valid', () => {
            // Simulate canStartRun logic
            const canStartRun = (params: FreeRunParams): boolean => {
                if (!params.distance) return false

                const distanceResult = validator.validateDistance(params.distance)
                if (!distanceResult.isValid) return false

                if (params.avgSpeed) {
                    const speedResult = validator.validateSpeed(params.avgSpeed)
                    if (!speedResult.isValid) return false
                }

                return true
            }

            // Valid parameters
            expect(canStartRun({ distance: 5, avgSpeed: 10 })).toBe(true)
            expect(canStartRun({ distance: 3 })).toBe(true)

            // Invalid parameters
            expect(canStartRun({ distance: 25, avgSpeed: 10 })).toBe(false)
            expect(canStartRun({ distance: 5, avgSpeed: 30 })).toBe(false)
            expect(canStartRun({ distance: 0 })).toBe(false)
        })
    })

    describe('Run Execution Logic (Requirement 3.1)', () => {
        it('should calculate progress correctly', () => {
            const totalTime = 1800000 // 30 minutes in milliseconds

            // Test progress calculation
            const calculateProgress = (elapsed: number, total: number): number => {
                return Math.min(100, (elapsed / total) * 100)
            }

            expect(calculateProgress(0, totalTime)).toBe(0)
            expect(calculateProgress(900000, totalTime)).toBe(50)
            expect(calculateProgress(1800000, totalTime)).toBe(100)
            expect(calculateProgress(2000000, totalTime)).toBe(100) // Capped at 100
        })

        it('should format time correctly', () => {
            const formatTime = (milliseconds: number): string => {
                const totalSeconds = Math.floor(milliseconds / 1000)
                const minutes = Math.floor(totalSeconds / 60)
                const seconds = totalSeconds % 60
                return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            }

            expect(formatTime(0)).toBe('00:00')
            expect(formatTime(60000)).toBe('01:00')
            expect(formatTime(90000)).toBe('01:30')
            expect(formatTime(1800000)).toBe('30:00')
        })

        it('should calculate remaining time correctly', () => {
            const totalTime = 1800000 // 30 minutes

            const calculateRemaining = (elapsed: number, total: number): number => {
                return Math.max(0, total - elapsed)
            }

            expect(calculateRemaining(0, totalTime)).toBe(1800000)
            expect(calculateRemaining(900000, totalTime)).toBe(900000)
            expect(calculateRemaining(1800000, totalTime)).toBe(0)
            expect(calculateRemaining(2000000, totalTime)).toBe(0) // Capped at 0
        })

        it('should generate run data with correct timing', async () => {
            const params: FreeRunParams = {
                distance: 5,
                avgSpeed: 10
            }

            const runData = await dataGenerator.generateRunData(params, 'TEST-USER', undefined, undefined, false)

            // Verify timing data
            const startTime = new Date(runData.startTime)
            const endTime = new Date(runData.endTime)
            const duration = parseInt(runData.duration)

            expect(startTime.getTime()).toBeLessThan(endTime.getTime())
            expect(duration).toBe(1800) // 5km at 10km/h = 30min = 1800s
        })
    })

    describe('Records Display Logic (Requirement 4.1)', () => {
        it('should filter records by type correctly', () => {
            const mockRecords = [
                { recordId: '1', runType: '1', status: 'completed' },
                { recordId: '2', runType: '1', status: 'completed' },
                { recordId: '3', runType: '0', status: 'completed' },
                { recordId: '4', runType: '1', status: 'failed' }
            ]

            const freeRunRecords = mockRecords.filter(r => r.runType === '1')
            expect(freeRunRecords).toHaveLength(3)
        })

        it('should filter records by status correctly', () => {
            const mockRecords = [
                { recordId: '1', runType: '1', status: 'completed' },
                { recordId: '2', runType: '1', status: 'failed' },
                { recordId: '3', runType: '1', status: 'pending' },
                { recordId: '4', runType: '1', status: 'completed' }
            ]

            const completedRecords = mockRecords.filter(r => r.status === 'completed')
            expect(completedRecords).toHaveLength(2)

            const failedRecords = mockRecords.filter(r => r.status === 'failed')
            expect(failedRecords).toHaveLength(1)
        })

        it('should search records correctly', () => {
            const mockRecords = [
                { recordId: '1', distance: '3.00', avgSpeed: '8.00' },
                { recordId: '2', distance: '5.00', avgSpeed: '10.00' },
                { recordId: '3', distance: '8.00', avgSpeed: '12.00' }
            ]

            // Search by distance
            const searchByDistance = (records: any[], query: string) => {
                return records.filter(r => r.distance.includes(query))
            }

            expect(searchByDistance(mockRecords, '5.00')).toHaveLength(1)
            expect(searchByDistance(mockRecords, '0.00')).toHaveLength(0)
        })

        it('should format record display data correctly', () => {
            const formatDate = (dateString: string): string => {
                const date = new Date(dateString)
                return date.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
            }

            const formatDuration = (seconds: number): string => {
                const minutes = Math.floor(seconds / 60)
                const secs = seconds % 60
                return `${minutes}:${secs.toString().padStart(2, '0')}`
            }

            expect(formatDuration(1800)).toBe('30:00')
            expect(formatDuration(90)).toBe('1:30')
            expect(formatDuration(3661)).toBe('61:01')
        })

        it('should handle empty records state', () => {
            const mockRecords: any[] = []

            const isEmpty = mockRecords.length === 0
            expect(isEmpty).toBe(true)

            // Verify empty state message logic
            const getEmptyMessage = (hasSearch: boolean): string => {
                return hasSearch ? '没有找到匹配的记录' : '暂无自由跑记录'
            }

            expect(getEmptyMessage(false)).toBe('暂无自由跑记录')
            expect(getEmptyMessage(true)).toBe('没有找到匹配的记录')
        })
    })

    describe('Batch Operations Logic (Requirement 6.5)', () => {
        it('should validate batch parameters correctly', () => {
            // Valid batch params
            const validParams: BatchRunParams = {
                count: 5,
                interval: 10,
                baseParams: { distance: 5, avgSpeed: 10 },
                randomization: {
                    distanceVariation: 0.5,
                    speedVariation: 1,
                    timeVariation: 2
                }
            }
            expect(validator.validateBatchParams(validParams).isValid).toBe(true)

            // Invalid count
            const invalidCount: BatchRunParams = {
                ...validParams,
                count: 15 // Too high
            }
            expect(validator.validateBatchParams(invalidCount).isValid).toBe(false)

            // Invalid interval
            const invalidInterval: BatchRunParams = {
                ...validParams,
                interval: 100 // Too high
            }
            expect(validator.validateBatchParams(invalidInterval).isValid).toBe(false)
        })

        it('should calculate batch progress correctly', () => {
            const calculateBatchProgress = (current: number, total: number): string => {
                return `${current}/${total}`
            }

            expect(calculateBatchProgress(1, 5)).toBe('1/5')
            expect(calculateBatchProgress(3, 5)).toBe('3/5')
            expect(calculateBatchProgress(5, 5)).toBe('5/5')
        })

        it('should calculate total batch time correctly', () => {
            const calculateTotalTime = (
                count: number,
                singleRunTime: number,
                interval: number
            ): number => {
                return (singleRunTime * count) + (interval * (count - 1))
            }

            // 3 runs of 30 min each with 10 min intervals
            expect(calculateTotalTime(3, 30, 10)).toBe(110) // 90 + 20

            // 5 runs of 20 min each with 5 min intervals
            expect(calculateTotalTime(5, 20, 5)).toBe(120) // 100 + 20
        })

        it('should format batch preview data correctly', () => {
            const formatDistanceRange = (base: number, variation: number): string => {
                const min = Math.max(0.5, base - variation)
                const max = Math.min(20, base + variation)
                return `${min.toFixed(1)}-${max.toFixed(1)}`
            }

            expect(formatDistanceRange(5, 0.5)).toBe('4.5-5.5')
            expect(formatDistanceRange(0.6, 0.5)).toBe('0.5-1.1') // Clamped to min
            expect(formatDistanceRange(19.5, 1)).toBe('18.5-20.0') // Clamped to max
        })
    })

    describe('Error Handling Logic (Requirement 6.5)', () => {
        it('should provide clear error messages for different error types', () => {
            // Network error
            const networkError = new NetworkError('Connection timeout')
            const networkResponse = errorHandler.handleNetworkError(networkError)
            expect(networkResponse.message).toBeDefined()
            expect(networkResponse.suggestions.length).toBeGreaterThan(0)

            // API error
            const apiError = new ApiError('Invalid token', 'INVALID_TOKEN', 401)
            const apiResponse = errorHandler.handleApiError(apiError)
            expect(apiResponse.message).toBeDefined()
            expect(apiResponse.suggestions.length).toBeGreaterThan(0)

            // Data error
            const dataError = new DataError('Invalid distance', 'distance')
            const dataResponse = errorHandler.handleDataError(dataError)
            expect(dataResponse.message).toBeDefined()
            expect(dataResponse.suggestions.length).toBeGreaterThan(0)
        })

        it('should indicate recoverability correctly', () => {
            // Network errors without status code are typically recoverable and retryable
            const networkError = new NetworkError('Connection timeout')
            const networkResponse = errorHandler.handleNetworkError(networkError)
            expect(networkResponse.recoverable).toBe(true)
            expect(networkResponse.retryable).toBe(true)

            // Network errors with 5xx status are retryable
            const serverNetworkError = new NetworkError('Server error', 500)
            const serverNetworkResponse = errorHandler.handleNetworkError(serverNetworkError)
            expect(serverNetworkResponse.recoverable).toBe(true)
            expect(serverNetworkResponse.retryable).toBe(true)

            // Network errors with 4xx status are not retryable
            const clientNetworkError = new NetworkError('Bad request', 400)
            const clientNetworkResponse = errorHandler.handleNetworkError(clientNetworkError)
            expect(clientNetworkResponse.recoverable).toBe(true)
            expect(clientNetworkResponse.retryable).toBe(false)

            // Auth errors are recoverable but not retryable
            const authError = new ApiError('Invalid token', 'INVALID_TOKEN', 401)
            const authResponse = errorHandler.handleApiError(authError)
            expect(authResponse.recoverable).toBe(true)
            expect(authResponse.retryable).toBe(false)
        })

        it('should provide actionable suggestions', () => {
            const networkError = new NetworkError('Connection failed')
            const response = errorHandler.handleNetworkError(networkError)

            // All suggestions should be non-empty strings
            response.suggestions.forEach(suggestion => {
                expect(typeof suggestion).toBe('string')
                expect(suggestion.length).toBeGreaterThan(0)
            })

            // Should contain actionable guidance
            const actionWords = ['检查', '确认', '尝试', '联系', '点击', '清除', '修改', '等待', '验证', '重新', '系统']
            const hasActionWord = response.suggestions.some(s =>
                actionWords.some(word => s.includes(word))
            )
            expect(hasActionWord).toBe(true)
        })
    })

    describe('Performance and Responsiveness', () => {
        it('should handle rapid parameter changes efficiently', async () => {
            const startTime = Date.now()

            // Simulate rapid parameter validation
            for (let i = 0; i < 100; i++) {
                validator.validateDistance(Math.random() * 20)
                validator.validateSpeed(Math.random() * 25)
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // Should complete within 100ms
            expect(duration).toBeLessThan(100)
        })

        it('should calculate run data efficiently', async () => {
            const startTime = Date.now()

            // Generate multiple run data calculations
            const params: FreeRunParams = { distance: 5, avgSpeed: 10 }

            for (let i = 0; i < 10; i++) {
                await dataGenerator.generateRunData(params, `USER-${i}`)
            }

            const endTime = Date.now()
            const duration = endTime - startTime

            // Should complete within 1 second
            expect(duration).toBeLessThan(1000)
        })

        it('should handle batch operations efficiently', async () => {
            const batchParams: BatchRunParams = {
                count: 5,
                interval: 1,
                baseParams: { distance: 3, avgSpeed: 8 },
                randomization: {
                    distanceVariation: 0.2,
                    speedVariation: 0.5,
                    timeVariation: 1
                }
            }

            const startTime = Date.now()
            await dataGenerator.generateBatchData(batchParams, 'PERF-TEST')
            const endTime = Date.now()
            const duration = endTime - startTime

            // Should complete within 5 seconds
            expect(duration).toBeLessThan(5000)
        })
    })
})
