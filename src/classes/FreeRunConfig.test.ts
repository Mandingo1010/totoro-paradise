import { describe, it, expect, beforeEach, vi } from 'vitest'
import FreeRunConfigManager from './FreeRunConfig'

// Mock localStorage for Node.js environment
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
}

// Mock global objects
Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
})

Object.defineProperty(globalThis, 'process', {
    value: { client: true },
    writable: true
})

describe('FreeRunConfigManager', () => {
    let configManager: FreeRunConfigManager

    beforeEach(() => {
        // Reset localStorage mock
        localStorageMock.getItem.mockClear()
        localStorageMock.setItem.mockClear()

        // Get fresh instance and reset to defaults
        configManager = FreeRunConfigManager.getInstance()
        configManager.resetConfig()
    })

    describe('Configuration Management', () => {
        it('should provide default configuration', () => {
            const config = configManager.getConfig()

            expect(config).toBeDefined()
            expect(config.version).toBe('1.0.0')
            expect(config.api.endpoints.submit).toBe('/totoro/platform/recreord/freeRun')
            expect(config.dataGeneration.defaultTemplates).toHaveLength(3)
        })

        it('should update API configuration', () => {
            const updates = {
                timeout: 60000,
                endpoints: {
                    submit: '/new/submit/endpoint',
                    query: '/new/query/endpoint',
                    detail: '/new/detail/endpoint',
                    batch: '/new/batch/endpoint'
                }
            }

            configManager.updateApiConfig(updates)
            const config = configManager.getConfig()

            expect(config.api.timeout).toBe(60000)
            expect(config.api.endpoints.submit).toBe('/new/submit/endpoint')
        })

        it('should update data generation configuration', () => {
            const updates = {
                validationRules: {
                    distance: { min: 1, max: 15 },
                    speed: { min: 4, max: 20 },
                    duration: { min: 600, max: 10800 },
                    batch: { maxCount: 5, minInterval: 2, maxInterval: 30 }
                }
            }

            configManager.updateDataConfig(updates)
            const config = configManager.getConfig()

            expect(config.dataGeneration.validationRules.distance.min).toBe(1)
            expect(config.dataGeneration.validationRules.distance.max).toBe(15)
        })

        it('should update UI configuration', () => {
            const updates = {
                defaultParams: {
                    distance: 5,
                    avgSpeed: 10,
                    template: 'standard'
                }
            }

            configManager.updateUIConfig(updates)
            const config = configManager.getConfig()

            expect(config.ui.defaultParams.distance).toBe(5)
            expect(config.ui.defaultParams.template).toBe('standard')
        })
    })

    describe('Configuration Validation', () => {
        it('should validate valid configuration', () => {
            const validation = configManager.validateConfig()

            expect(validation.isValid).toBe(true)
            expect(validation.errors).toHaveLength(0)
        })

        it('should detect invalid API configuration', () => {
            configManager.updateApiConfig({
                endpoints: {
                    submit: '',
                    query: '',
                    detail: '',
                    batch: ''
                },
                timeout: -1
            })

            const validation = configManager.validateConfig()

            expect(validation.isValid).toBe(false)
            expect(validation.errors).toContain('API submit endpoint is required')
            expect(validation.errors).toContain('API query endpoint is required')
            expect(validation.errors).toContain('API timeout must be positive')
        })

        it('should detect invalid validation rules', () => {
            configManager.updateDataConfig({
                validationRules: {
                    distance: { min: 10, max: 5 }, // min > max
                    speed: { min: 20, max: 10 }, // min > max
                    duration: { min: 300, max: 14400 },
                    batch: { maxCount: 10, minInterval: 1, maxInterval: 60 }
                }
            })

            const validation = configManager.validateConfig()

            expect(validation.isValid).toBe(false)
            expect(validation.errors).toContain('Distance min must be less than max')
            expect(validation.errors).toContain('Speed min must be less than max')
        })
    })

    describe('Utility Methods', () => {
        it('should get API endpoint by type', () => {
            const submitEndpoint = configManager.getApiEndpoint('submit')
            const queryEndpoint = configManager.getApiEndpoint('query')

            expect(submitEndpoint).toBe('/totoro/platform/recreord/freeRun')
            expect(queryEndpoint).toBe('/totoro/platform/recreord/freeRun/list')
        })

        it('should get validation rule by type', () => {
            const distanceRule = configManager.getValidationRule('distance')
            const speedRule = configManager.getValidationRule('speed')

            expect(distanceRule.min).toBe(0.5)
            expect(distanceRule.max).toBe(20)
            expect(speedRule.min).toBe(3)
            expect(speedRule.max).toBe(25)
        })

        it('should get template by id', () => {
            const easyTemplate = configManager.getTemplate('easy')
            const standardTemplate = configManager.getTemplate('standard')
            const nonExistentTemplate = configManager.getTemplate('nonexistent')

            expect(easyTemplate).toBeDefined()
            expect(easyTemplate?.name).toBe('轻松跑')
            expect(standardTemplate).toBeDefined()
            expect(standardTemplate?.name).toBe('标准跑')
            expect(nonExistentTemplate).toBeUndefined()
        })

        it('should get validation message by key', () => {
            const distanceRequiredMsg = configManager.getValidationMessage('distance.required')
            const unknownMsg = configManager.getValidationMessage('unknown.key')

            expect(distanceRequiredMsg).toBe('请输入跑步距离')
            expect(unknownMsg).toBe('验证失败')
        })

        it('should check if error is retryable', () => {
            const networkError = configManager.isRetryableError('NETWORK_ERROR')
            const timeoutError = configManager.isRetryableError('TIMEOUT')
            const validationError = configManager.isRetryableError('VALIDATION_ERROR')

            expect(networkError).toBe(true)
            expect(timeoutError).toBe(true)
            expect(validationError).toBe(false)
        })
    })

    describe('Persistence', () => {
        it('should save configuration to localStorage', () => {
            configManager.updateApiConfig({ timeout: 45000 })

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                'freeRunConfig',
                expect.stringContaining('"timeout":45000')
            )
        })

        it('should load configuration from localStorage', () => {
            const mockConfig = {
                api: {
                    timeout: 50000,
                    endpoints: {
                        submit: '/custom/submit'
                    }
                },
                version: '1.1.0'
            }

            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig))

            configManager.loadConfig()
            const config = configManager.getConfig()

            expect(config.api.timeout).toBe(50000)
            expect(config.version).toBe('1.1.0')
        })

        it('should handle invalid JSON in localStorage', () => {
            localStorageMock.getItem.mockReturnValue('invalid json')

            // Should not throw and should use default config
            expect(() => configManager.loadConfig()).not.toThrow()

            const config = configManager.getConfig()
            expect(config.version).toBe('1.0.0') // Default version
        })
    })

    describe('Singleton Pattern', () => {
        it('should return same instance', () => {
            const instance1 = FreeRunConfigManager.getInstance()
            const instance2 = FreeRunConfigManager.getInstance()

            expect(instance1).toBe(instance2)
        })
    })
})