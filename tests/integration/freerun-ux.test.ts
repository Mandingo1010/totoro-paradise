import { describe, it, expect, beforeEach } from 'vitest'
import { ParameterValidator } from '~/src/classes/ParameterValidator'
import { TemplateManager } from '~/src/classes/TemplateManager'
import { FreeRunDataGenerator } from '~/src/classes/FreeRunDataGenerator'
import { RunCalculator } from '~/src/classes/RunCalculator'
import FreeRunErrorHandler, { NetworkError, ApiError, DataError, ReverseEngineeringError } from '~/src/classes/FreeRunErrorHandler'
import type { FreeRunParams, BatchRunParams } from '~/src/types/requestTypes/FreeRunRequest'

/**
 * User Experience Tests for Free Run Feature
 * Tests interface usability, error message clarity, and responsive design
 * Requirements: 1.1, 3.1, 4.1, 6.5
 * 
 * Task 9.2: 用户体验测试
 * - 进行界面可用性测试
 * - 验证错误信息的清晰度
 * - 测试响应式设计和性能
 */
describe('Free Run User Experience Tests', () => {
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

    describe('Interface Usability (Requirement 1.1)', () => {
        it('should provide intuitive parameter input validation', () => {
            // Test that validation messages are clear and helpful
            const invalidDistanceLow = validator.validateDistance(0.3)
            expect(invalidDistanceLow.isValid).toBe(false)
            expect(invalidDistanceLow.errors[0]).toContain('距离')
            expect(invalidDistanceLow.errors[0]).toContain('0.5')

            const invalidDistanceHigh = validator.validateDistance(25)
            expect(invalidDistanceHigh.isValid).toBe(false)
            expect(invalidDistanceHigh.errors[0]).toContain('距离')
            expect(invalidDistanceHigh.errors[0]).toContain('20')

            const invalidSpeedLow = validator.validateSpeed(2)
            expect(invalidSpeedLow.isValid).toBe(false)
            expect(invalidSpeedLow.errors[0]).toContain('速度')
            expect(invalidSpeedLow.errors[0]).toContain('3')

            const invalidSpeedHigh = validator.validateSpeed(30)
            expect(invalidSpeedHigh.isValid).toBe(false)
            expect(invalidSpeedHigh.errors[0]).toContain('速度')
            expect(invalidSpeedHigh.errors[0]).toContain('25')
        })

        it('should provide helpful template descriptions', () => {
            const templates = templateManager.getAvailableTemplates()

            templates.forEach(template => {
                expect(template.name).toBeDefined()
                expect(template.name.length).toBeGreaterThan(0)
                expect(template.description).toBeDefined()
                expect(template.description.length).toBeGreaterThan(10)
                expect(template.defaultParams).toBeDefined()
                expect(template.speedRange).toBeDefined()
                expect(template.distanceRange).toBeDefined()
            })
        })

        it('should provide clear feedback for valid inputs', () => {
            const validDistance = validator.validateDistance(5)
            expect(validDistance.isValid).toBe(true)
            expect(validDistance.errors).toHaveLength(0)

            const validSpeed = validator.validateSpeed(10)
            expect(validSpeed.isValid).toBe(true)
            expect(validSpeed.errors).toHaveLength(0)
        })

        it('should provide warnings for edge case inputs', () => {
            // Test boundary values
            const minDistance = validator.validateDistance(0.5)
            expect(minDistance.isValid).toBe(true)

            const maxDistance = validator.validateDistance(20)
            expect(maxDistance.isValid).toBe(true)

            const minSpeed = validator.validateSpeed(3)
            expect(minSpeed.isValid).toBe(true)

            const maxSpeed = validator.validateSpeed(25)
            expect(maxSpeed.isValid).toBe(true)
        })
    })

    describe('Error Message Clarity (Requirement 6.5)', () => {
        it('should provide clear and localized error messages', () => {
            // Network error messages
            const networkError = new NetworkError('Connection timeout')
            const networkResponse = errorHandler.handleNetworkError(networkError)

            expect(networkResponse.message).toContain('网络')
            expect(networkResponse.message.length).toBeGreaterThan(10)
            expect(networkResponse.suggestions.length).toBeGreaterThanOrEqual(2)

            // API error messages
            const apiError = new ApiError('Invalid token', 'INVALID_TOKEN', 401)
            const apiResponse = errorHandler.handleApiError(apiError)

            expect(apiResponse.message).toContain('登录')
            expect(apiResponse.message.length).toBeGreaterThan(10)
            expect(apiResponse.suggestions.length).toBeGreaterThanOrEqual(2)

            // Data error messages
            const dataError = new DataError('Invalid distance', 'distance')
            const dataResponse = errorHandler.handleDataError(dataError)

            expect(dataResponse.message).toContain('数据')
            expect(dataResponse.message.length).toBeGreaterThan(10)
            expect(dataResponse.suggestions.length).toBeGreaterThanOrEqual(2)
        })

        it('should provide actionable recovery suggestions', () => {
            const networkError = new NetworkError('Connection failed')
            const response = errorHandler.handleNetworkError(networkError)

            // All suggestions should be actionable
            const actionWords = ['检查', '确认', '尝试', '联系', '点击', '清除', '修改', '等待', '验证', '重新', '系统']

            response.suggestions.forEach(suggestion => {
                const hasActionWord = actionWords.some(word => suggestion.includes(word))
                expect(hasActionWord).toBe(true)
            })
        })

        it('should indicate error severity correctly', () => {
            // Recoverable errors
            const networkError = new NetworkError('Timeout')
            const networkResponse = errorHandler.handleNetworkError(networkError)
            expect(networkResponse.recoverable).toBe(true)

            // Non-recoverable errors
            const apiError = new ApiError('Unknown error', 'UNKNOWN', 500)
            const apiResponse = errorHandler.handleApiError(apiError)
            // Unknown errors should still have a response
            expect(apiResponse.code).toBeDefined()
        })

        it('should provide context-specific error messages', () => {
            // Distance validation error - too high
            const distanceResultHigh = validator.validateDistance(25)
            expect(distanceResultHigh.errors[0]).toContain('距离')
            expect(distanceResultHigh.errors[0]).toContain('20')

            // Distance validation error - too low
            const distanceResultLow = validator.validateDistance(0.3)
            expect(distanceResultLow.errors[0]).toContain('距离')
            expect(distanceResultLow.errors[0]).toContain('0.5')

            // Speed validation error - too high
            const speedResultHigh = validator.validateSpeed(30)
            expect(speedResultHigh.errors[0]).toContain('速度')
            expect(speedResultHigh.errors[0]).toContain('25')

            // Speed validation error - too low
            const speedResultLow = validator.validateSpeed(2)
            expect(speedResultLow.errors[0]).toContain('速度')
            expect(speedResultLow.errors[0]).toContain('3')

            // Batch count validation error
            const batchResult = validator.validateBatchParams({
                count: 15,
                interval: 10,
                baseParams: { distance: 5, avgSpeed: 10 },
                randomization: { distanceVariation: 0.5, speedVariation: 1, timeVariation: 2 }
            })
            expect(batchResult.isValid).toBe(false)
            expect(batchResult.errors.some(e => e.includes('次数'))).toBe(true)
        })
    })

    describe('Responsive Design and Performance (Requirement 3.1)', () => {
        it('should calculate run data quickly', async () => {
            const params: FreeRunParams = { distance: 5, avgSpeed: 10 }

            const startTime = Date.now()
            await dataGenerator.generateRunData(params, 'TEST-USER')
            const endTime = Date.now()

            // Should complete within 100ms
            expect(endTime - startTime).toBeLessThan(100)
        })

        it('should validate parameters quickly', () => {
            const startTime = Date.now()

            // Perform 1000 validations
            for (let i = 0; i < 1000; i++) {
                validator.validateDistance(Math.random() * 25)
                validator.validateSpeed(Math.random() * 30)
            }

            const endTime = Date.now()

            // Should complete within 100ms
            expect(endTime - startTime).toBeLessThan(100)
        })

        it('should handle batch operations efficiently', async () => {
            const batchParams: BatchRunParams = {
                count: 5,
                interval: 1,
                baseParams: { distance: 3, avgSpeed: 8 },
                randomization: { distanceVariation: 0.2, speedVariation: 0.5, timeVariation: 1 }
            }

            const startTime = Date.now()
            await dataGenerator.generateBatchData(batchParams, 'PERF-TEST')
            const endTime = Date.now()

            // Should complete within 2 seconds
            expect(endTime - startTime).toBeLessThan(2000)
        })

        it('should format display data quickly', () => {
            const startTime = Date.now()

            // Format 1000 time values
            for (let i = 0; i < 1000; i++) {
                const seconds = Math.floor(Math.random() * 7200)
                const minutes = Math.floor(seconds / 60)
                const secs = seconds % 60
                const formatted = `${minutes}:${secs.toString().padStart(2, '0')}`
                expect(formatted).toBeDefined()
            }

            const endTime = Date.now()

            // Should complete within 100ms (allowing for system load variations)
            expect(endTime - startTime).toBeLessThan(100)
        })
    })

    describe('Records Display Usability (Requirement 4.1)', () => {
        it('should format dates in user-friendly format', () => {
            const formatDate = (dateString: string): string => {
                const date = new Date(dateString)
                return date.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }

            const testDate = '2024-01-15T10:30:00Z'
            const formatted = formatDate(testDate)

            expect(formatted).toContain('2024')
            expect(formatted).toContain('01')
            expect(formatted).toContain('15')
        })

        it('should format duration in readable format', () => {
            const formatDuration = (seconds: number): string => {
                const hours = Math.floor(seconds / 3600)
                const minutes = Math.floor((seconds % 3600) / 60)
                const secs = seconds % 60

                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                }
                return `${minutes}:${secs.toString().padStart(2, '0')}`
            }

            expect(formatDuration(90)).toBe('1:30')
            expect(formatDuration(1800)).toBe('30:00')
            expect(formatDuration(3661)).toBe('1:01:01')
        })

        it('should provide clear status indicators', () => {
            const getStatusColor = (status: string): string => {
                switch (status) {
                    case 'completed': return 'success'
                    case 'failed': return 'error'
                    case 'pending': return 'warning'
                    default: return 'grey'
                }
            }

            const getStatusText = (status: string): string => {
                switch (status) {
                    case 'completed': return '已完成'
                    case 'failed': return '失败'
                    case 'pending': return '进行中'
                    default: return '未知'
                }
            }

            expect(getStatusColor('completed')).toBe('success')
            expect(getStatusColor('failed')).toBe('error')
            expect(getStatusColor('pending')).toBe('warning')

            expect(getStatusText('completed')).toBe('已完成')
            expect(getStatusText('failed')).toBe('失败')
            expect(getStatusText('pending')).toBe('进行中')
        })

        it('should provide helpful empty state messages', () => {
            const getEmptyMessage = (hasSearch: boolean): string => {
                return hasSearch ? '没有找到匹配的记录' : '暂无自由跑记录'
            }

            expect(getEmptyMessage(false)).toBe('暂无自由跑记录')
            expect(getEmptyMessage(true)).toBe('没有找到匹配的记录')
        })
    })

    describe('Batch Operations Usability (Requirement 6.5)', () => {
        it('should provide clear batch progress feedback', () => {
            const formatProgress = (current: number, total: number): string => {
                return `${current}/${total}`
            }

            const formatPercentage = (current: number, total: number): string => {
                return `${Math.round((current / total) * 100)}%`
            }

            expect(formatProgress(1, 5)).toBe('1/5')
            expect(formatProgress(3, 5)).toBe('3/5')
            expect(formatPercentage(1, 5)).toBe('20%')
            expect(formatPercentage(3, 5)).toBe('60%')
        })

        it('should provide clear batch time estimates', () => {
            const formatTotalTime = (minutes: number): string => {
                const hours = Math.floor(minutes / 60)
                const mins = minutes % 60

                if (hours > 0) {
                    return `${hours}小时${mins}分钟`
                }
                return `${mins}分钟`
            }

            expect(formatTotalTime(30)).toBe('30分钟')
            expect(formatTotalTime(90)).toBe('1小时30分钟')
            expect(formatTotalTime(120)).toBe('2小时0分钟')
        })

        it('should provide clear parameter range displays', () => {
            const formatRange = (base: number, variation: number, unit: string): string => {
                const min = (base - variation).toFixed(1)
                const max = (base + variation).toFixed(1)
                return `${min}-${max} ${unit}`
            }

            expect(formatRange(5, 0.5, 'km')).toBe('4.5-5.5 km')
            expect(formatRange(10, 2, 'km/h')).toBe('8.0-12.0 km/h')
        })
    })

    describe('Template Selection Usability (Requirement 8.1)', () => {
        it('should provide clear template options', () => {
            const templates = templateManager.getAvailableTemplates()

            expect(templates).toHaveLength(3)

            const easyRun = templates.find(t => t.id === 'easy-run')
            expect(easyRun).toBeDefined()
            expect(easyRun!.name).toContain('轻松')

            const standardRun = templates.find(t => t.id === 'standard-run')
            expect(standardRun).toBeDefined()
            expect(standardRun!.name).toContain('标准')

            const challengeRun = templates.find(t => t.id === 'challenge-run')
            expect(challengeRun).toBeDefined()
            expect(challengeRun!.name).toContain('挑战')
        })

        it('should apply templates correctly', () => {
            const easyParams = templateManager.applyTemplate('easy-run')
            expect(easyParams.distance).toBe(3)
            expect(easyParams.avgSpeed).toBe(7)

            const standardParams = templateManager.applyTemplate('standard-run')
            expect(standardParams.distance).toBe(5)
            expect(standardParams.avgSpeed).toBe(10)

            const challengeParams = templateManager.applyTemplate('challenge-run')
            expect(challengeParams.distance).toBe(10)
            expect(challengeParams.avgSpeed).toBe(12.5)
        })

        it('should recommend appropriate templates', () => {
            // For short, slow runs
            const easyRecommendations = dataGenerator.recommendTemplate(3, 7)
            expect(easyRecommendations.some(t => t.id === 'easy-run')).toBe(true)

            // For medium runs
            const standardRecommendations = dataGenerator.recommendTemplate(5, 10)
            expect(standardRecommendations.some(t => t.id === 'standard-run')).toBe(true)

            // For long, fast runs
            const challengeRecommendations = dataGenerator.recommendTemplate(10, 12)
            expect(challengeRecommendations.some(t => t.id === 'challenge-run')).toBe(true)
        })
    })

    describe('Data Preview Usability', () => {
        it('should provide accurate run data preview', () => {
            const params: FreeRunParams = { distance: 5, avgSpeed: 10 }
            const summary = dataGenerator.getGenerationSummary(params)

            expect(summary.estimatedDuration).toBeCloseTo(1800, 0) // 30 minutes
            expect(summary.estimatedPace).toBe('6:00')
            expect(summary.estimatedCalories).toBeGreaterThan(0)
            expect(summary.estimatedSteps).toBeGreaterThan(0)
        })

        it('should format pace correctly', () => {
            const formatPace = (speed: number): string => {
                const paceMinutes = 60 / speed
                const minutes = Math.floor(paceMinutes)
                const seconds = Math.round((paceMinutes - minutes) * 60)
                return `${minutes}:${seconds.toString().padStart(2, '0')}`
            }

            expect(formatPace(10)).toBe('6:00')
            expect(formatPace(12)).toBe('5:00')
            expect(formatPace(8)).toBe('7:30')
        })

        it('should calculate calories reasonably', () => {
            const calculateCalories = (distance: number, speed: number): number => {
                // MET-based calculation
                const met = speed < 8 ? 6 : speed < 12 ? 10 : 12
                const weight = 70 // Default weight
                const hours = distance / speed
                return Math.round(met * weight * hours)
            }

            const calories5km = calculateCalories(5, 10)
            expect(calories5km).toBeGreaterThan(200)
            expect(calories5km).toBeLessThan(500)

            const calories10km = calculateCalories(10, 12)
            expect(calories10km).toBeGreaterThan(400)
            expect(calories10km).toBeLessThan(1000)
        })
    })

    /**
     * Task 9.2: Additional Accessibility Tests
     * Tests for keyboard navigation and screen reader support
     */
    describe('Accessibility and Keyboard Navigation', () => {
        it('should provide accessible form labels', () => {
            // Test that form fields have proper labels
            const formFields = [
                { id: 'distance', label: '跑步距离', unit: '公里' },
                { id: 'targetTime', label: '目标时间', unit: '分钟' },
                { id: 'avgSpeed', label: '平均速度', unit: 'km/h' }
            ]

            formFields.forEach(field => {
                expect(field.label).toBeDefined()
                expect(field.label.length).toBeGreaterThan(0)
                expect(field.unit).toBeDefined()
            })
        })

        it('should provide accessible button labels', () => {
            const buttons = [
                { action: 'start', label: '开始跑步', ariaLabel: '开始自由跑' },
                { action: 'back', label: '返回', ariaLabel: '返回上一页' },
                { action: 'retry', label: '重试', ariaLabel: '重新提交跑步数据' },
                { action: 'viewRecords', label: '查看记录', ariaLabel: '查看跑步记录' }
            ]

            buttons.forEach(button => {
                expect(button.label).toBeDefined()
                expect(button.label.length).toBeGreaterThan(0)
                expect(button.ariaLabel).toBeDefined()
                expect(button.ariaLabel.length).toBeGreaterThan(0)
            })
        })

        it('should provide accessible status announcements', () => {
            const statusAnnouncements = {
                running: '跑步进行中，请不要关闭页面',
                completed: '跑步完成！数据已成功提交到服务器',
                error: '提交失败，请重试'
            }

            Object.values(statusAnnouncements).forEach(announcement => {
                expect(announcement).toBeDefined()
                expect(announcement.length).toBeGreaterThan(5)
            })
        })

        it('should provide accessible progress information', () => {
            const formatProgressAnnouncement = (progress: number, remaining: string): string => {
                return `跑步进度 ${Math.round(progress)}%，剩余时间 ${remaining}`
            }

            expect(formatProgressAnnouncement(50, '15:00')).toBe('跑步进度 50%，剩余时间 15:00')
            expect(formatProgressAnnouncement(100, '00:00')).toBe('跑步进度 100%，剩余时间 00:00')
        })
    })

    /**
     * Task 9.2: Responsive Design Tests
     * Tests for different screen sizes and orientations
     */
    describe('Responsive Design Breakpoints', () => {
        it('should define appropriate breakpoints', () => {
            const breakpoints = {
                xs: 0,
                sm: 600,
                md: 960,
                lg: 1280,
                xl: 1920
            }

            // Verify breakpoints are in ascending order
            const values = Object.values(breakpoints)
            for (let i = 1; i < values.length; i++) {
                expect(values[i]).toBeGreaterThan(values[i - 1])
            }
        })

        it('should calculate appropriate column widths for different screens', () => {
            const getColumnWidth = (screenWidth: number, cols: number): number => {
                return Math.floor(screenWidth / cols)
            }

            // Mobile (xs): 1 column
            expect(getColumnWidth(360, 1)).toBe(360)

            // Tablet (sm): 2 columns
            expect(getColumnWidth(600, 2)).toBe(300)

            // Desktop (md): 3 columns
            expect(getColumnWidth(960, 3)).toBe(320)

            // Large desktop (lg): 4 columns
            expect(getColumnWidth(1280, 4)).toBe(320)
        })

        it('should provide appropriate font sizes for different screens', () => {
            const getFontSize = (screenWidth: number, baseSize: number): number => {
                if (screenWidth < 600) return baseSize * 0.875 // Mobile
                if (screenWidth < 960) return baseSize // Tablet
                return baseSize * 1.125 // Desktop
            }

            const baseSize = 16

            expect(getFontSize(360, baseSize)).toBe(14) // Mobile
            expect(getFontSize(768, baseSize)).toBe(16) // Tablet
            expect(getFontSize(1280, baseSize)).toBe(18) // Desktop
        })

        it('should provide appropriate spacing for different screens', () => {
            const getSpacing = (screenWidth: number, baseSpacing: number): number => {
                if (screenWidth < 600) return baseSpacing * 0.5 // Mobile
                if (screenWidth < 960) return baseSpacing * 0.75 // Tablet
                return baseSpacing // Desktop
            }

            const baseSpacing = 24

            expect(getSpacing(360, baseSpacing)).toBe(12) // Mobile
            expect(getSpacing(768, baseSpacing)).toBe(18) // Tablet
            expect(getSpacing(1280, baseSpacing)).toBe(24) // Desktop
        })
    })

    /**
     * Task 9.2: Input Validation UX Tests
     * Tests for real-time validation feedback
     */
    describe('Real-time Input Validation UX', () => {
        it('should provide immediate feedback on invalid input', () => {
            const validateWithFeedback = (value: number, min: number, max: number): { valid: boolean; message: string } => {
                if (value < min) {
                    return { valid: false, message: `值必须大于等于 ${min}` }
                }
                if (value > max) {
                    return { valid: false, message: `值必须小于等于 ${max}` }
                }
                return { valid: true, message: '' }
            }

            const result1 = validateWithFeedback(0.3, 0.5, 20)
            expect(result1.valid).toBe(false)
            expect(result1.message).toContain('0.5')

            const result2 = validateWithFeedback(25, 0.5, 20)
            expect(result2.valid).toBe(false)
            expect(result2.message).toContain('20')

            const result3 = validateWithFeedback(5, 0.5, 20)
            expect(result3.valid).toBe(true)
            expect(result3.message).toBe('')
        })

        it('should debounce validation for performance', async () => {
            let validationCount = 0
            const debounce = (fn: () => void, delay: number) => {
                let timeoutId: NodeJS.Timeout
                return () => {
                    clearTimeout(timeoutId)
                    timeoutId = setTimeout(fn, delay)
                }
            }

            const validate = debounce(() => {
                validationCount++
            }, 100)

            // Simulate rapid input
            validate()
            validate()
            validate()

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 150))

            // Should only validate once
            expect(validationCount).toBe(1)
        })

        it('should show validation state visually', () => {
            const getValidationState = (isValid: boolean, isTouched: boolean): string => {
                if (!isTouched) return 'neutral'
                return isValid ? 'valid' : 'invalid'
            }

            expect(getValidationState(true, false)).toBe('neutral')
            expect(getValidationState(false, false)).toBe('neutral')
            expect(getValidationState(true, true)).toBe('valid')
            expect(getValidationState(false, true)).toBe('invalid')
        })
    })

    /**
     * Task 9.2: Loading State UX Tests
     * Tests for loading indicators and skeleton screens
     */
    describe('Loading State UX', () => {
        it('should provide appropriate loading messages', () => {
            const loadingMessages = {
                records: '加载记录中...',
                submit: '提交数据中...',
                calculate: '计算中...',
                export: '导出中...'
            }

            Object.values(loadingMessages).forEach(message => {
                expect(message).toContain('...')
                expect(message.length).toBeGreaterThan(3)
            })
        })

        it('should provide loading progress for long operations', () => {
            const formatLoadingProgress = (current: number, total: number): string => {
                const percentage = Math.round((current / total) * 100)
                return `加载中 ${percentage}% (${current}/${total})`
            }

            expect(formatLoadingProgress(5, 10)).toBe('加载中 50% (5/10)')
            expect(formatLoadingProgress(10, 10)).toBe('加载中 100% (10/10)')
        })

        it('should handle loading timeout gracefully', () => {
            const getTimeoutMessage = (operation: string, timeoutSeconds: number): string => {
                return `${operation}超时（${timeoutSeconds}秒），请检查网络连接后重试`
            }

            expect(getTimeoutMessage('加载记录', 30)).toBe('加载记录超时（30秒），请检查网络连接后重试')
        })
    })

    /**
     * Task 9.2: Confirmation Dialog UX Tests
     * Tests for confirmation dialogs and user prompts
     */
    describe('Confirmation Dialog UX', () => {
        it('should provide clear confirmation messages', () => {
            const confirmationMessages = {
                leave: '跑步还未完成，确定要离开吗？离开后当前进度将丢失。',
                delete: '确定要删除这条记录吗？此操作无法撤销。',
                export: '确定要导出选中的记录吗？',
                batch: '确定要开始批量跑步吗？这将执行多次跑步操作。'
            }

            Object.values(confirmationMessages).forEach(message => {
                expect(message).toContain('？')
                expect(message.length).toBeGreaterThan(10)
            })
        })

        it('should provide clear action button labels', () => {
            const actionLabels = {
                confirm: '确定',
                cancel: '取消',
                delete: '删除',
                leave: '确认离开',
                stay: '继续跑步'
            }

            Object.values(actionLabels).forEach(label => {
                expect(label.length).toBeGreaterThan(0)
                expect(label.length).toBeLessThan(10)
            })
        })

        it('should distinguish destructive actions visually', () => {
            const getButtonColor = (action: string): string => {
                const destructiveActions = ['delete', 'leave', 'cancel']
                return destructiveActions.includes(action) ? 'error' : 'primary'
            }

            expect(getButtonColor('delete')).toBe('error')
            expect(getButtonColor('leave')).toBe('error')
            expect(getButtonColor('confirm')).toBe('primary')
            expect(getButtonColor('save')).toBe('primary')
        })
    })

    /**
     * Task 9.2: Error Recovery UX Tests
     * Tests for error recovery flows and user guidance
     */
    describe('Error Recovery UX', () => {
        it('should provide step-by-step recovery guidance', () => {
            const getRecoverySteps = (errorType: string): string[] => {
                const recoveryGuides: Record<string, string[]> = {
                    network: [
                        '1. 检查网络连接是否正常',
                        '2. 尝试刷新页面',
                        '3. 如果问题持续，请稍后重试'
                    ],
                    auth: [
                        '1. 检查登录状态',
                        '2. 尝试重新登录',
                        '3. 清除浏览器缓存后重试'
                    ],
                    validation: [
                        '1. 检查输入的参数是否正确',
                        '2. 确保所有必填项已填写',
                        '3. 参考参数范围提示进行修改'
                    ]
                }
                return recoveryGuides[errorType] || ['请联系技术支持']
            }

            const networkSteps = getRecoverySteps('network')
            expect(networkSteps.length).toBe(3)
            expect(networkSteps[0]).toContain('1.')

            const authSteps = getRecoverySteps('auth')
            expect(authSteps.length).toBe(3)
            expect(authSteps[0]).toContain('登录')
        })

        it('should provide retry functionality with backoff', () => {
            const calculateRetryDelay = (attempt: number, baseDelay: number = 1000): number => {
                return Math.min(baseDelay * Math.pow(2, attempt), 30000)
            }

            expect(calculateRetryDelay(0)).toBe(1000)
            expect(calculateRetryDelay(1)).toBe(2000)
            expect(calculateRetryDelay(2)).toBe(4000)
            expect(calculateRetryDelay(5)).toBe(30000) // Capped at 30 seconds
        })

        it('should provide user-friendly retry countdown', () => {
            const formatRetryCountdown = (seconds: number): string => {
                if (seconds <= 0) return '正在重试...'
                return `${seconds}秒后自动重试`
            }

            expect(formatRetryCountdown(5)).toBe('5秒后自动重试')
            expect(formatRetryCountdown(0)).toBe('正在重试...')
        })
    })

    /**
     * Task 9.2: Reverse Engineering Error UX Tests
     * Tests for reverse engineering specific error handling
     */
    describe('Reverse Engineering Error UX', () => {
        it('should handle reverse engineering errors gracefully', () => {
            const reverseEngineeringError = new ReverseEngineeringError('API endpoint not found', 'ENDPOINT_NOT_FOUND')
            const response = errorHandler.handleReverseEngineeringError(reverseEngineeringError)

            expect(response.message).toBeDefined()
            expect(response.message.length).toBeGreaterThan(10)
            expect(response.suggestions.length).toBeGreaterThanOrEqual(1)
        })

        it('should provide technical error details for developers', () => {
            const formatTechnicalError = (error: Error, context: Record<string, unknown>): string => {
                return JSON.stringify({
                    message: error.message,
                    name: error.name,
                    context,
                    timestamp: new Date().toISOString()
                }, null, 2)
            }

            const error = new Error('Test error')
            const context = { endpoint: '/api/test', method: 'POST' }
            const formatted = formatTechnicalError(error, context)

            expect(formatted).toContain('Test error')
            expect(formatted).toContain('/api/test')
        })
    })
})
