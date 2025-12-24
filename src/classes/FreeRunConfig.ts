import type { RunTemplate } from '~/src/types/requestTypes/FreeRunRequest'

export interface FreeRunApiConfig {
    endpoints: {
        submit: string
        query: string
        detail: string
        batch: string
    }
    encryption: {
        algorithm: string
        keySize: number
        padding: string
        publicKey?: string
        privateKey?: string
    }
    timeout: number
    retryConfig: {
        maxAttempts: number
        backoffStrategy: 'linear' | 'exponential'
        baseDelay: number
        maxDelay: number
        retryableErrors: string[]
    }
}

export interface FreeRunDataConfig {
    defaultTemplates: RunTemplate[]
    validationRules: {
        distance: {
            min: number
            max: number
        }
        speed: {
            min: number
            max: number
        }
        duration: {
            min: number
            max: number
        }
        batch: {
            maxCount: number
            minInterval: number
            maxInterval: number
        }
    }
    randomizationConfig: {
        distanceVariation: number
        speedVariation: number
        timeVariation: number
        calorieFormula: string
        stepsPerKm: {
            min: number
            max: number
        }
    }
}

export interface FreeRunUIConfig {
    defaultParams: {
        distance: number
        avgSpeed: number
        template: string | null
    }
    validationMessages: Record<string, string>
    progressUpdateInterval: number
    autoSaveInterval: number
    theme: {
        primaryColor: string
        successColor: string
        errorColor: string
        warningColor: string
    }
}

export interface FreeRunConfig {
    api: FreeRunApiConfig
    dataGeneration: FreeRunDataConfig
    ui: FreeRunUIConfig
    version: string
    lastUpdated: string
}

export class FreeRunConfigManager {
    private static instance: FreeRunConfigManager
    private config: FreeRunConfig
    private configKey = 'freeRunConfig'
    private defaultConfig: FreeRunConfig

    private constructor() {
        this.defaultConfig = this.createDefaultConfig()
        this.config = { ...this.defaultConfig }
    }

    public static getInstance(): FreeRunConfigManager {
        if (!FreeRunConfigManager.instance) {
            FreeRunConfigManager.instance = new FreeRunConfigManager()
        }
        return FreeRunConfigManager.instance
    }

    private createDefaultConfig(): FreeRunConfig {
        return {
            api: {
                endpoints: {
                    submit: '/totoro/platform/recreord/freeRun',
                    query: '/totoro/platform/recreord/freeRun/list',
                    detail: '/totoro/platform/recreord/freeRun/detail',
                    batch: '/totoro/platform/recreord/freeRun/batch'
                },
                encryption: {
                    algorithm: 'RSA',
                    keySize: 2048,
                    padding: 'OAEP'
                },
                timeout: 30000,
                retryConfig: {
                    maxAttempts: 3,
                    backoffStrategy: 'exponential',
                    baseDelay: 1000,
                    maxDelay: 10000,
                    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR']
                }
            },
            dataGeneration: {
                defaultTemplates: [
                    {
                        id: 'easy',
                        name: '轻松跑',
                        description: '适合日常锻炼的轻松配速',
                        defaultParams: {
                            distance: 3,
                            avgSpeed: 7
                        },
                        speedRange: [6, 8],
                        distanceRange: [2, 5]
                    },
                    {
                        id: 'standard',
                        name: '标准跑',
                        description: '标准的跑步训练强度',
                        defaultParams: {
                            distance: 5,
                            avgSpeed: 10
                        },
                        speedRange: [8, 12],
                        distanceRange: [3, 8]
                    },
                    {
                        id: 'challenge',
                        name: '挑战跑',
                        description: '高强度的挑战性跑步',
                        defaultParams: {
                            distance: 10,
                            avgSpeed: 12.5
                        },
                        speedRange: [10, 15],
                        distanceRange: [5, 20]
                    }
                ],
                validationRules: {
                    distance: {
                        min: 0.5,
                        max: 2000
                    },
                    speed: {
                        min: 3,
                        max: 25
                    },
                    duration: {
                        min: 300, // 5 minutes
                        max: 14400 // 4 hours
                    },
                    batch: {
                        maxCount: 10,
                        minInterval: 1,
                        maxInterval: 60
                    }
                },
                randomizationConfig: {
                    distanceVariation: 0.1,
                    speedVariation: 0.5,
                    timeVariation: 30,
                    calorieFormula: 'distance * 60 + speed * 2',
                    stepsPerKm: {
                        min: 1150,
                        max: 1250
                    }
                }
            },
            ui: {
                defaultParams: {
                    distance: 3,
                    avgSpeed: 8,
                    template: 'easy'
                },
                validationMessages: {
                    'distance.required': '请输入跑步距离',
                    'distance.min': '距离不能少于0.5公里',
                    'distance.max': '距离不能超过2000公里',
                    'speed.required': '请输入平均速度',
                    'speed.min': '速度不能低于3公里/小时',
                    'speed.max': '速度不能超过25公里/小时',
                    'batch.count.max': '批量次数不能超过10次',
                    'batch.interval.min': '间隔时间不能少于1分钟',
                    'batch.interval.max': '间隔时间不能超过60分钟'
                },
                progressUpdateInterval: 1000,
                autoSaveInterval: 5000,
                theme: {
                    primaryColor: '#1976d2',
                    successColor: '#4caf50',
                    errorColor: '#f44336',
                    warningColor: '#ff9800'
                }
            },
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
        }
    }

    public getConfig(): FreeRunConfig {
        return { ...this.config }
    }

    public updateConfig(updates: Partial<FreeRunConfig>): void {
        this.config = {
            ...this.config,
            ...updates,
            lastUpdated: new Date().toISOString()
        }
        this.saveConfig()
    }

    public updateApiConfig(updates: Partial<FreeRunApiConfig>): void {
        this.config.api = {
            ...this.config.api,
            ...updates
        }
        this.config.lastUpdated = new Date().toISOString()
        this.saveConfig()
    }

    public updateDataConfig(updates: Partial<FreeRunDataConfig>): void {
        this.config.dataGeneration = {
            ...this.config.dataGeneration,
            ...updates
        }
        this.config.lastUpdated = new Date().toISOString()
        this.saveConfig()
    }

    public updateUIConfig(updates: Partial<FreeRunUIConfig>): void {
        this.config.ui = {
            ...this.config.ui,
            ...updates
        }
        this.config.lastUpdated = new Date().toISOString()
        this.saveConfig()
    }

    public resetConfig(): void {
        this.config = { ...this.defaultConfig }
        this.saveConfig()
    }

    public validateConfig(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // Validate API endpoints
        if (!this.config.api.endpoints.submit) {
            errors.push('API submit endpoint is required')
        }
        if (!this.config.api.endpoints.query) {
            errors.push('API query endpoint is required')
        }

        // Validate timeout
        if (this.config.api.timeout <= 0) {
            errors.push('API timeout must be positive')
        }

        // Validate retry config
        if (this.config.api.retryConfig.maxAttempts < 1) {
            errors.push('Max retry attempts must be at least 1')
        }

        // Validate validation rules
        const rules = this.config.dataGeneration.validationRules
        if (rules.distance.min >= rules.distance.max) {
            errors.push('Distance min must be less than max')
        }
        if (rules.speed.min >= rules.speed.max) {
            errors.push('Speed min must be less than max')
        }

        // Validate templates
        if (this.config.dataGeneration.defaultTemplates.length === 0) {
            errors.push('At least one default template is required')
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    public loadConfig(): void {
        if (process.client) {
            try {
                const stored = localStorage.getItem(this.configKey)
                if (stored) {
                    const parsedConfig = JSON.parse(stored)

                    // Merge with default config to ensure all properties exist
                    this.config = this.mergeWithDefault(parsedConfig)

                    // Validate loaded config
                    const validation = this.validateConfig()
                    if (!validation.isValid) {
                        console.warn('Invalid config loaded, using defaults:', validation.errors)
                        this.config = { ...this.defaultConfig }
                    }
                }
            } catch (error) {
                console.error('Failed to load config:', error)
                this.config = { ...this.defaultConfig }
            }
        }
    }

    public saveConfig(): void {
        if (process.client) {
            try {
                localStorage.setItem(this.configKey, JSON.stringify(this.config))
            } catch (error) {
                console.error('Failed to save config:', error)
            }
        }
    }

    private mergeWithDefault(loaded: any): FreeRunConfig {
        return {
            api: {
                ...this.defaultConfig.api,
                ...loaded.api,
                endpoints: {
                    ...this.defaultConfig.api.endpoints,
                    ...loaded.api?.endpoints
                },
                encryption: {
                    ...this.defaultConfig.api.encryption,
                    ...loaded.api?.encryption
                },
                retryConfig: {
                    ...this.defaultConfig.api.retryConfig,
                    ...loaded.api?.retryConfig
                }
            },
            dataGeneration: {
                ...this.defaultConfig.dataGeneration,
                ...loaded.dataGeneration,
                validationRules: {
                    ...this.defaultConfig.dataGeneration.validationRules,
                    ...loaded.dataGeneration?.validationRules
                },
                randomizationConfig: {
                    ...this.defaultConfig.dataGeneration.randomizationConfig,
                    ...loaded.dataGeneration?.randomizationConfig
                }
            },
            ui: {
                ...this.defaultConfig.ui,
                ...loaded.ui,
                defaultParams: {
                    ...this.defaultConfig.ui.defaultParams,
                    ...loaded.ui?.defaultParams
                },
                theme: {
                    ...this.defaultConfig.ui.theme,
                    ...loaded.ui?.theme
                }
            },
            version: loaded.version || this.defaultConfig.version,
            lastUpdated: loaded.lastUpdated || new Date().toISOString()
        }
    }

    // Utility methods for common config access
    public getApiEndpoint(type: keyof FreeRunApiConfig['endpoints']): string {
        return this.config.api.endpoints[type]
    }

    public getValidationRule(type: string): any {
        const rules = this.config.dataGeneration.validationRules as any
        return rules[type]
    }

    public getTemplate(id: string): RunTemplate | undefined {
        return this.config.dataGeneration.defaultTemplates.find(t => t.id === id)
    }

    public getValidationMessage(key: string): string {
        return this.config.ui.validationMessages[key] || '验证失败'
    }

    public isRetryableError(error: string): boolean {
        return this.config.api.retryConfig.retryableErrors.includes(error)
    }
}

export default FreeRunConfigManager