import FreeRunConfigManager, { type FreeRunConfig, type FreeRunApiConfig, type FreeRunDataConfig, type FreeRunUIConfig } from '~/src/classes/FreeRunConfig'

export const useFreeRunConfig = () => {
    const configManager = FreeRunConfigManager.getInstance()

    // Reactive config state
    const config = ref<FreeRunConfig>(configManager.getConfig())

    // Load config on initialization
    onMounted(() => {
        configManager.loadConfig()
        config.value = configManager.getConfig()
    })

    // Getters
    const getConfig = computed(() => config.value)
    const getApiConfig = computed(() => config.value.api)
    const getDataConfig = computed(() => config.value.dataGeneration)
    const getUIConfig = computed(() => config.value.ui)
    const getVersion = computed(() => config.value.version)
    const getLastUpdated = computed(() => config.value.lastUpdated)

    // API endpoint getters
    const getSubmitEndpoint = computed(() => configManager.getApiEndpoint('submit'))
    const getQueryEndpoint = computed(() => configManager.getApiEndpoint('query'))
    const getDetailEndpoint = computed(() => configManager.getApiEndpoint('detail'))
    const getBatchEndpoint = computed(() => configManager.getApiEndpoint('batch'))

    // Validation rule getters
    const getDistanceRules = computed(() => configManager.getValidationRule('distance'))
    const getSpeedRules = computed(() => configManager.getValidationRule('speed'))
    const getDurationRules = computed(() => configManager.getValidationRule('duration'))
    const getBatchRules = computed(() => configManager.getValidationRule('batch'))

    // Template getters
    const getTemplates = computed(() => config.value.dataGeneration.defaultTemplates)
    const getDefaultTemplate = computed(() => {
        const defaultId = config.value.ui.defaultParams.template
        return defaultId ? configManager.getTemplate(defaultId) : null
    })

    // Actions
    const updateConfig = (updates: Partial<FreeRunConfig>) => {
        configManager.updateConfig(updates)
        config.value = configManager.getConfig()
    }

    const updateApiConfig = (updates: Partial<FreeRunApiConfig>) => {
        configManager.updateApiConfig(updates)
        config.value = configManager.getConfig()
    }

    const updateDataConfig = (updates: Partial<FreeRunDataConfig>) => {
        configManager.updateDataConfig(updates)
        config.value = configManager.getConfig()
    }

    const updateUIConfig = (updates: Partial<FreeRunUIConfig>) => {
        configManager.updateUIConfig(updates)
        config.value = configManager.getConfig()
    }

    const resetConfig = () => {
        configManager.resetConfig()
        config.value = configManager.getConfig()
    }

    const validateConfig = () => {
        return configManager.validateConfig()
    }

    const reloadConfig = () => {
        configManager.loadConfig()
        config.value = configManager.getConfig()
    }

    // Utility functions
    const getTemplate = (id: string) => {
        return configManager.getTemplate(id)
    }

    const getValidationMessage = (key: string) => {
        return configManager.getValidationMessage(key)
    }

    const isRetryableError = (error: string) => {
        return configManager.isRetryableError(error)
    }

    const getRetryConfig = () => {
        return config.value.api.retryConfig
    }

    const getRandomizationConfig = () => {
        return config.value.dataGeneration.randomizationConfig
    }

    const getThemeConfig = () => {
        return config.value.ui.theme
    }

    // Validation helpers
    const validateDistance = (distance: number): { isValid: boolean; message?: string } => {
        const rules = getDistanceRules.value
        if (distance < rules.min) {
            return {
                isValid: false,
                message: getValidationMessage('distance.min')
            }
        }
        if (distance > rules.max) {
            return {
                isValid: false,
                message: getValidationMessage('distance.max')
            }
        }
        return { isValid: true }
    }

    const validateSpeed = (speed: number): { isValid: boolean; message?: string } => {
        const rules = getSpeedRules.value
        if (speed < rules.min) {
            return {
                isValid: false,
                message: getValidationMessage('speed.min')
            }
        }
        if (speed > rules.max) {
            return {
                isValid: false,
                message: getValidationMessage('speed.max')
            }
        }
        return { isValid: true }
    }

    const validateBatchCount = (count: number): { isValid: boolean; message?: string } => {
        const rules = getBatchRules.value
        if (count > rules.maxCount) {
            return {
                isValid: false,
                message: getValidationMessage('batch.count.max')
            }
        }
        return { isValid: true }
    }

    const validateBatchInterval = (interval: number): { isValid: boolean; message?: string } => {
        const rules = getBatchRules.value
        if (interval < rules.minInterval) {
            return {
                isValid: false,
                message: getValidationMessage('batch.interval.min')
            }
        }
        if (interval > rules.maxInterval) {
            return {
                isValid: false,
                message: getValidationMessage('batch.interval.max')
            }
        }
        return { isValid: true }
    }

    return {
        // State
        config: readonly(config),

        // Getters
        getConfig,
        getApiConfig,
        getDataConfig,
        getUIConfig,
        getVersion,
        getLastUpdated,

        // API endpoints
        getSubmitEndpoint,
        getQueryEndpoint,
        getDetailEndpoint,
        getBatchEndpoint,

        // Validation rules
        getDistanceRules,
        getSpeedRules,
        getDurationRules,
        getBatchRules,

        // Templates
        getTemplates,
        getDefaultTemplate,

        // Actions
        updateConfig,
        updateApiConfig,
        updateDataConfig,
        updateUIConfig,
        resetConfig,
        validateConfig,
        reloadConfig,

        // Utility functions
        getTemplate,
        getValidationMessage,
        isRetryableError,
        getRetryConfig,
        getRandomizationConfig,
        getThemeConfig,

        // Validation helpers
        validateDistance,
        validateSpeed,
        validateBatchCount,
        validateBatchInterval
    }
}

// Also export as default for compatibility
export default useFreeRunConfig