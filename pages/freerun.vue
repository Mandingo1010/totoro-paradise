<template>
  <div class="freerun-page">
    <!-- 加载路线数据中 -->
    <VAlert
      v-if="loadingSunRunPaper"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      <template #prepend>
        <VProgressCircular indeterminate size="20" />
      </template>
      正在加载路线数据...
    </VAlert>

    <!-- 单次自由跑设置 -->
    <FreeRunSetup
      v-if="currentView === 'setup'"
      v-model="freeRunParams"
      @start-run="handleStartRun"
      @back="handleBack"
    />

    <!-- 跑步执行 -->
    <FreeRunExecution
      v-else-if="currentView === 'execution'"
      :params="freeRunParams"
      @completed="handleRunCompleted"
      @error="handleRunError"
      @back-to-setup="handleBackToSetup"
      @view-records="handleViewRecords"
    />

    <!-- 批量执行设置 -->
    <BatchRunSetup
      v-else-if="currentView === 'batch-setup'"
      v-model="batchParams"
      @start-batch="handleStartBatch"
      @back="handleBackFromBatch"
    />

    <!-- 批量执行进度 -->
    <BatchRunExecution
      v-else-if="currentView === 'batch-execution'"
      :params="batchParams"
      @completed="handleBatchCompleted"
      @error="handleBatchError"
      @back-to-setup="handleBackToBatchSetup"
      @view-records="handleViewRecords"
    />

    <!-- 浮动操作按钮 -->
    <VBtn
      v-if="currentView === 'setup'"
      icon="mdi-format-list-numbered"
      position="fixed"
      location="bottom end"
      size="small"
      color="secondary"
      class="ma-4"
      @click="showBatchSetup"
    />

    <!-- 错误提示 -->
    <VSnackbar
      v-model="showError"
      color="error"
      :timeout="5000"
    >
      {{ errorMessage }}
      <template #actions>
        <VBtn variant="text" @click="showError = false">
          关闭
        </VBtn>
      </template>
    </VSnackbar>

    <!-- 成功提示 -->
    <VSnackbar
      v-model="showSuccess"
      color="success"
      :timeout="3000"
    >
      {{ successMessage }}
      <template #actions>
        <VBtn variant="text" @click="showSuccess = false">
          关闭
        </VBtn>
      </template>
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import type { FreeRunParams, BatchRunParams } from '~/src/types/requestTypes/FreeRunRequest'
import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper'

// Page metadata
definePageMeta({
  title: '自由跑'
})

// Composables
const freeRun = useFreeRun()
const freeRunConfig = useFreeRunConfig()
const session = useSession()
const sunRunPaper = useSunRunPaper()

// Loading state for sunRunPaper
const loadingSunRunPaper = ref(false)

// Reactive data from composables
const currentView = computed({
  get: () => freeRun.getCurrentView.value,
  set: (value) => freeRun.setCurrentView(value)
})

const showError = computed({
  get: () => freeRun.getShowError.value,
  set: (value) => value ? null : freeRun.hideError()
})

const showSuccess = computed({
  get: () => freeRun.getShowSuccess.value,
  set: (value) => value ? null : freeRun.hideSuccess()
})

const errorMessage = computed(() => freeRun.getErrorMessage.value)
const successMessage = computed(() => freeRun.getSuccessMessage.value)

// Form data with defaults from config
const defaultParams = computed(() => freeRunConfig.getUIConfig.value.defaultParams)

const freeRunParams = computed({
  get: () => freeRun.getCurrentParams.value || {
    distance: defaultParams.value.distance,
    avgSpeed: defaultParams.value.avgSpeed,
    template: freeRunConfig.getDefaultTemplate.value
  },
  set: (value) => freeRun.setCurrentParams(value)
})

const batchParams = computed({
  get: () => freeRun.getCurrentBatchParams.value || {
    count: 3,
    interval: 10,
    baseParams: {
      distance: defaultParams.value.distance,
      avgSpeed: defaultParams.value.avgSpeed,
      template: freeRunConfig.getDefaultTemplate.value
    },
    randomization: {
      distanceVariation: freeRunConfig.getRandomizationConfig().distanceVariation,
      speedVariation: freeRunConfig.getRandomizationConfig().speedVariation,
      timeVariation: freeRunConfig.getRandomizationConfig().timeVariation
    }
  },
  set: (value) => freeRun.setCurrentBatchParams(value)
})

// Navigation methods
const handleBack = () => {
  freeRun.resetRunState()
  navigateTo('/scanned')
}

const handleBackToSetup = () => {
  currentView.value = 'setup'
}

const handleBackFromBatch = () => {
  currentView.value = 'setup'
}

const handleBackToBatchSetup = () => {
  currentView.value = 'batch-setup'
}

const handleViewRecords = () => {
  navigateTo('/records?tab=free')
}

// Single run methods
const handleStartRun = (params: FreeRunParams) => {
  freeRun.setCurrentParams(params)
  currentView.value = 'execution'
}

const handleRunCompleted = (recordId?: string) => {
  const message = recordId 
    ? `跑步完成！记录ID: ${recordId}` 
    : '跑步完成！'
  freeRun.showSuccess(message)
  
  // Update session stats if available
  if (session.value && recordId) {
    const currentStats = session.value.freeRunStats || {
      totalRuns: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageSpeed: 0
    }
    
    const params = freeRun.getCurrentParams.value
    if (params) {
      currentStats.totalRuns += 1
      currentStats.totalDistance += params.distance
      currentStats.lastRunDate = new Date().toISOString()
      
      session.value.freeRunStats = currentStats
    }
  }
}

const handleRunError = (error: string) => {
  freeRun.showError(error)
}

// Batch run methods
const showBatchSetup = () => {
  // Copy current single run params as base for batch
  const currentParams = freeRun.getCurrentParams.value
  if (currentParams) {
    const currentBatch = freeRun.getCurrentBatchParams.value || batchParams.value
    currentBatch.baseParams = { ...currentParams }
    freeRun.setCurrentBatchParams(currentBatch)
  }
  currentView.value = 'batch-setup'
}

const handleStartBatch = (params: BatchRunParams) => {
  freeRun.setCurrentBatchParams(params)
  currentView.value = 'batch-execution'
}

const handleBatchCompleted = (results: any) => {
  const successCount = results.successCount || 0
  const totalCount = results.totalSubmitted || 0
  const message = `批量执行完成！成功: ${successCount}/${totalCount}`
  freeRun.showSuccess(message)
  
  // Update session stats
  if (session.value && successCount > 0) {
    const currentStats = session.value.freeRunStats || {
      totalRuns: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageSpeed: 0
    }
    
    currentStats.totalRuns += successCount
    currentStats.lastRunDate = new Date().toISOString()
    
    session.value.freeRunStats = currentStats
  }
}

const handleBatchError = (error: string) => {
  freeRun.showError(error)
}

// Check session on mount and restore state
onMounted(async () => {
  const sessionValue = useSession()
  if (!sessionValue.value?.token) {
    navigateTo('/')
    return
  }
  
  // Restore free run state from localStorage
  freeRun.restoreState()
  
  // Load configuration
  freeRunConfig.reloadConfig()
  
  // Load sunRunPaper data if not already loaded
  // This is needed for getting real routeId and taskId
  if (!sunRunPaper.value?.runPointList?.length) {
    loadingSunRunPaper.value = true
    try {
      const result = await TotoroApiWrapper.getSunRunPaper({
        token: sessionValue.value.token,
        campusId: sessionValue.value.campusId,
        schoolId: sessionValue.value.schoolId,
        stuNumber: sessionValue.value.stuNumber,
      })
      if (result) {
        sunRunPaper.value = result
        console.log('Loaded sunRunPaper data:', result.runPointList?.length, 'routes')
      }
    } catch (error) {
      console.warn('Failed to load sunRunPaper data:', error)
      // Don't block the user, they can still use free run with mock data
    } finally {
      loadingSunRunPaper.value = false
    }
  } else {
    console.log('sunRunPaper data already loaded:', sunRunPaper.value.runPointList?.length, 'routes')
  }
})
</script>

<style scoped>
.freerun-page {
  min-height: 100vh;
  padding: 16px;
}
</style>