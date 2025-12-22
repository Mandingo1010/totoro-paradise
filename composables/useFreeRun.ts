import type { FreeRunParams, BatchRunParams, RunTemplate } from '~/src/types/requestTypes/FreeRunRequest'
import type { FreeRunRecord, FreeRunDetail, BatchResponse } from '~/src/types/responseTypes/FreeRunResponse'

interface FreeRunState {
    // Current run state
    currentParams: FreeRunParams | null
    currentBatchParams: BatchRunParams | null
    isRunning: boolean
    isBatchRunning: boolean

    // Records and history
    records: FreeRunRecord[]
    recordsLoading: boolean
    recordsError: string | null

    // Templates
    templates: RunTemplate[]
    selectedTemplate: RunTemplate | null

    // UI state
    currentView: 'setup' | 'execution' | 'batch-setup' | 'batch-execution'
    showError: boolean
    showSuccess: boolean
    errorMessage: string
    successMessage: string

    // Progress tracking
    executionProgress: number
    batchProgress: {
        current: number
        total: number
        results: Array<{
            index: number
            success: boolean
            recordId?: string
            error?: string
        }>
    }

    // Configuration
    config: {
        autoSave: boolean
        defaultTemplate: string | null
        maxRetries: number
        retryDelay: number
    }
}

const defaultState: FreeRunState = {
    currentParams: null,
    currentBatchParams: null,
    isRunning: false,
    isBatchRunning: false,

    records: [],
    recordsLoading: false,
    recordsError: null,

    templates: [],
    selectedTemplate: null,

    currentView: 'setup',
    showError: false,
    showSuccess: false,
    errorMessage: '',
    successMessage: '',

    executionProgress: 0,
    batchProgress: {
        current: 0,
        total: 0,
        results: []
    },

    config: {
        autoSave: true,
        defaultTemplate: null,
        maxRetries: 3,
        retryDelay: 1000
    }
}

export const useFreeRun = () => {
    const state = useState<FreeRunState>('freeRunState', () => ({ ...defaultState }))

    // Getters
    const getCurrentParams = computed(() => state.value.currentParams)
    const getCurrentBatchParams = computed(() => state.value.currentBatchParams)
    const getIsRunning = computed(() => state.value.isRunning)
    const getIsBatchRunning = computed(() => state.value.isBatchRunning)
    const getRecords = computed(() => state.value.records)
    const getRecordsLoading = computed(() => state.value.recordsLoading)
    const getTemplates = computed(() => state.value.templates)
    const getSelectedTemplate = computed(() => state.value.selectedTemplate)
    const getCurrentView = computed(() => state.value.currentView)
    const getExecutionProgress = computed(() => state.value.executionProgress)
    const getBatchProgress = computed(() => state.value.batchProgress)
    const getConfig = computed(() => state.value.config)

    // UI state getters
    const getShowError = computed(() => state.value.showError)
    const getShowSuccess = computed(() => state.value.showSuccess)
    const getErrorMessage = computed(() => state.value.errorMessage)
    const getSuccessMessage = computed(() => state.value.successMessage)

    // Actions
    const setCurrentParams = (params: FreeRunParams | null) => {
        state.value.currentParams = params
        if (state.value.config.autoSave) {
            persistState()
        }
    }

    const setCurrentBatchParams = (params: BatchRunParams | null) => {
        state.value.currentBatchParams = params
        if (state.value.config.autoSave) {
            persistState()
        }
    }

    const setRunning = (running: boolean) => {
        state.value.isRunning = running
    }

    const setBatchRunning = (running: boolean) => {
        state.value.isBatchRunning = running
    }

    const setCurrentView = (view: FreeRunState['currentView']) => {
        state.value.currentView = view
    }

    const setExecutionProgress = (progress: number) => {
        state.value.executionProgress = Math.max(0, Math.min(100, progress))
    }

    const updateBatchProgress = (current: number, total: number, results?: Array<any>) => {
        state.value.batchProgress.current = current
        state.value.batchProgress.total = total
        if (results) {
            state.value.batchProgress.results = [...results]
        }
    }

    const addRecord = (record: FreeRunRecord) => {
        state.value.records.unshift(record)
        if (state.value.config.autoSave) {
            persistState()
        }
    }

    const updateRecord = (recordId: string, updates: Partial<FreeRunRecord>) => {
        const index = state.value.records.findIndex(r => r.recordId === recordId)
        if (index !== -1) {
            state.value.records[index] = { ...state.value.records[index], ...updates }
            if (state.value.config.autoSave) {
                persistState()
            }
        }
    }

    const setRecords = (records: FreeRunRecord[]) => {
        state.value.records = [...records]
        if (state.value.config.autoSave) {
            persistState()
        }
    }

    const setRecordsLoading = (loading: boolean) => {
        state.value.recordsLoading = loading
    }

    const setRecordsError = (error: string | null) => {
        state.value.recordsError = error
    }

    const setTemplates = (templates: RunTemplate[]) => {
        state.value.templates = [...templates]
    }

    const setSelectedTemplate = (template: RunTemplate | null) => {
        state.value.selectedTemplate = template
    }

    const updateConfig = (updates: Partial<FreeRunState['config']>) => {
        state.value.config = { ...state.value.config, ...updates }
        if (state.value.config.autoSave) {
            persistState()
        }
    }

    // UI actions
    const showError = (message: string) => {
        state.value.errorMessage = message
        state.value.showError = true
    }

    const hideError = () => {
        state.value.showError = false
        state.value.errorMessage = ''
    }

    const showSuccess = (message: string) => {
        state.value.successMessage = message
        state.value.showSuccess = true
    }

    const hideSuccess = () => {
        state.value.showSuccess = false
        state.value.successMessage = ''
    }

    // State management
    const resetState = () => {
        Object.assign(state.value, { ...defaultState })
        clearPersistedState()
    }

    const resetRunState = () => {
        state.value.currentParams = null
        state.value.currentBatchParams = null
        state.value.isRunning = false
        state.value.isBatchRunning = false
        state.value.executionProgress = 0
        state.value.batchProgress = {
            current: 0,
            total: 0,
            results: []
        }
        state.value.currentView = 'setup'
        hideError()
        hideSuccess()
    }

    // Persistence
    const persistState = () => {
        if (process.client) {
            try {
                const persistData = {
                    currentParams: state.value.currentParams,
                    currentBatchParams: state.value.currentBatchParams,
                    records: state.value.records,
                    templates: state.value.templates,
                    selectedTemplate: state.value.selectedTemplate,
                    config: state.value.config
                }
                localStorage.setItem('freeRunState', JSON.stringify(persistData))
            } catch (error) {
                console.warn('Failed to persist free run state:', error)
            }
        }
    }

    const restoreState = () => {
        if (process.client) {
            try {
                const stored = localStorage.getItem('freeRunState')
                if (stored) {
                    const persistData = JSON.parse(stored)

                    // Restore only persistent data, not UI state
                    if (persistData.currentParams) {
                        state.value.currentParams = persistData.currentParams
                    }
                    if (persistData.currentBatchParams) {
                        state.value.currentBatchParams = persistData.currentBatchParams
                    }
                    if (persistData.records) {
                        state.value.records = persistData.records
                    }
                    if (persistData.templates) {
                        state.value.templates = persistData.templates
                    }
                    if (persistData.selectedTemplate) {
                        state.value.selectedTemplate = persistData.selectedTemplate
                    }
                    if (persistData.config) {
                        state.value.config = { ...state.value.config, ...persistData.config }
                    }
                }
            } catch (error) {
                console.warn('Failed to restore free run state:', error)
            }
        }
    }

    const clearPersistedState = () => {
        if (process.client) {
            try {
                localStorage.removeItem('freeRunState')
            } catch (error) {
                console.warn('Failed to clear persisted free run state:', error)
            }
        }
    }

    // Utility functions
    const getRecordById = (recordId: string): FreeRunRecord | undefined => {
        return state.value.records.find(r => r.recordId === recordId)
    }

    const getRecordsByDateRange = (startDate: Date, endDate: Date): FreeRunRecord[] => {
        return state.value.records.filter(record => {
            const recordDate = new Date(record.submitTime)
            return recordDate >= startDate && recordDate <= endDate
        })
    }

    const getTotalDistance = (): number => {
        return state.value.records.reduce((total, record) => {
            return total + parseFloat(record.distance || '0')
        }, 0)
    }

    const getTotalDuration = (): number => {
        return state.value.records.reduce((total, record) => {
            return total + parseFloat(record.duration || '0')
        }, 0)
    }

    const getAverageSpeed = (): number => {
        if (state.value.records.length === 0) return 0
        const totalSpeed = state.value.records.reduce((total, record) => {
            return total + parseFloat(record.avgSpeed || '0')
        }, 0)
        return totalSpeed / state.value.records.length
    }

    return {
        // State
        state: readonly(state),

        // Getters
        getCurrentParams,
        getCurrentBatchParams,
        getIsRunning,
        getIsBatchRunning,
        getRecords,
        getRecordsLoading,
        getTemplates,
        getSelectedTemplate,
        getCurrentView,
        getExecutionProgress,
        getBatchProgress,
        getConfig,
        getShowError,
        getShowSuccess,
        getErrorMessage,
        getSuccessMessage,

        // Actions
        setCurrentParams,
        setCurrentBatchParams,
        setRunning,
        setBatchRunning,
        setCurrentView,
        setExecutionProgress,
        updateBatchProgress,
        addRecord,
        updateRecord,
        setRecords,
        setRecordsLoading,
        setRecordsError,
        setTemplates,
        setSelectedTemplate,
        updateConfig,

        // UI actions
        showError,
        hideError,
        showSuccess,
        hideSuccess,

        // State management
        resetState,
        resetRunState,
        persistState,
        restoreState,
        clearPersistedState,

        // Utility functions
        getRecordById,
        getRecordsByDateRange,
        getTotalDistance,
        getTotalDuration,
        getAverageSpeed
    }
}

// Also export as default for compatibility
export default useFreeRun