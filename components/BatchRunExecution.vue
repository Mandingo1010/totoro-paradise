<template>
  <div class="batch-run-execution">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="mdi-format-list-numbered" />
        批量自由跑执行中
      </VCardTitle>
      <VCardText>
        <!-- 总体进度 -->
        <VCard variant="tonal" class="mb-4">
          <VCardText>
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-h6">总体进度</span>
              <span class="text-h6">{{ completedCount }}/{{ params.count }}</span>
            </div>
            <VProgressLinear
              :model-value="overallProgress"
              color="primary"
              height="12"
              rounded
            />
            <div class="d-flex justify-space-between mt-2 text-caption">
              <span>已完成: {{ completedCount }} 次</span>
              <span>剩余: {{ params.count - completedCount }} 次</span>
            </div>
          </VCardText>
        </VCard>

        <!-- 当前执行状态 -->
        <VCard v-if="currentExecution" variant="outlined" class="mb-4">
          <VCardTitle class="text-h6">
            当前执行 - 第 {{ currentExecution.index + 1 }} 次
          </VCardTitle>
          <VCardText>
            <VRow dense>
              <VCol cols="6" sm="3">
                <div class="text-caption">距离</div>
                <div class="text-body-1">{{ currentExecution.params.distance }} km</div>
              </VCol>
              <VCol cols="6" sm="3">
                <div class="text-caption">目标时间</div>
                <div class="text-body-1">{{ formatTime(currentExecution.params.targetTime || 0) }}</div>
              </VCol>
              <VCol cols="6" sm="3">
                <div class="text-caption">状态</div>
                <VChip
                  :color="getStatusColor(currentExecution.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ getStatusText(currentExecution.status) }}
                </VChip>
              </VCol>
              <VCol cols="6" sm="3">
                <div class="text-caption">进度</div>
                <div class="text-body-1">{{ Math.round(currentExecution.progress) }}%</div>
              </VCol>
            </VRow>

            <!-- 当前执行进度条 -->
            <VProgressLinear
              v-if="currentExecution.status === 'running'"
              :model-value="currentExecution.progress"
              color="secondary"
              height="8"
              rounded
              class="mt-2"
            />
          </VCardText>
        </VCard>

        <!-- 下次执行倒计时 -->
        <VCard v-if="nextExecutionCountdown > 0" variant="outlined" class="mb-4">
          <VCardText class="text-center">
            <VIcon icon="mdi-timer-sand" size="24" class="mb-2" />
            <div class="text-h6">下次执行倒计时</div>
            <div class="text-h4 text-primary">{{ formatCountdown(nextExecutionCountdown) }}</div>
          </VCardText>
        </VCard>

        <!-- 执行结果列表 -->
        <VExpansionPanels v-if="results.length > 0" class="mb-4">
          <VExpansionPanel>
            <VExpansionPanelTitle>
              执行结果 ({{ results.filter(r => r.success).length }}/{{ results.length }} 成功)
            </VExpansionPanelTitle>
            <VExpansionPanelText>
              <VList density="compact">
                <VListItem
                  v-for="result in results"
                  :key="result.index"
                  :prepend-icon="result.success ? 'mdi-check-circle' : 'mdi-alert-circle'"
                  :color="result.success ? 'success' : 'error'"
                >
                  <VListItemTitle>
                    第 {{ result.index + 1 }} 次 - {{ result.success ? '成功' : '失败' }}
                  </VListItemTitle>
                  <VListItemSubtitle v-if="result.recordId">
                    记录ID: {{ result.recordId }}
                  </VListItemSubtitle>
                  <VListItemSubtitle v-else-if="result.error">
                    错误: {{ result.error }}
                  </VListItemSubtitle>
                </VListItem>
              </VList>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>

        <!-- 状态提示 -->
        <VAlert
          v-if="status === 'running'"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <template #prepend>
            <VProgressCircular indeterminate size="20" />
          </template>
          批量执行进行中，请不要关闭页面...
        </VAlert>

        <VAlert
          v-else-if="status === 'completed'"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          <template #prepend>
            <VIcon icon="mdi-check-circle" />
          </template>
          批量执行完成！成功: {{ results.filter(r => r.success).length }}/{{ results.length }}
        </VAlert>

        <VAlert
          v-else-if="status === 'error'"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          <template #prepend>
            <VIcon icon="mdi-alert-circle" />
          </template>
          批量执行出现错误，部分任务可能未完成
        </VAlert>

        <!-- 操作按钮 -->
        <div class="d-flex gap-2">
          <VBtn
            v-if="status === 'completed' || status === 'error'"
            variant="outlined"
            @click="$emit('back-to-setup')"
          >
            返回设置
          </VBtn>
          <VBtn
            v-if="status === 'running'"
            variant="outlined"
            color="error"
            @click="handleStop"
          >
            停止执行
          </VBtn>
          <VSpacer />
          <VBtn
            v-if="status === 'completed'"
            color="primary"
            @click="$emit('view-records')"
          >
            查看记录
          </VBtn>
          <VBtn
            v-if="status === 'error'"
            color="primary"
            @click="handleRetry"
          >
            重试失败项
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNow } from '@vueuse/core'
import type { BatchRunParams, FreeRunParams } from '~/src/types/requestTypes/FreeRunRequest'
import { BatchDataGenerator } from '~/src/classes/BatchDataGenerator'

// Props and emits
interface Props {
  params: BatchRunParams
}

interface Emits {
  (e: 'completed', results: BatchExecutionResult): void
  (e: 'error', error: string): void
  (e: 'back-to-setup'): void
  (e: 'view-records'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Types
interface ExecutionItem {
  index: number
  params: FreeRunParams
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  startTime?: Date
  endTime?: Date
  recordId?: string
  error?: string
}

interface BatchExecutionResult {
  totalSubmitted: number
  successCount: number
  failureCount: number
  results: Array<{
    index: number
    success: boolean
    recordId?: string
    error?: string
  }>
}

// Reactive data
const status = ref<'running' | 'completed' | 'error'>('running')
const executions = ref<ExecutionItem[]>([])
const currentExecutionIndex = ref(0)
const nextExecutionTime = ref<Date>()
const results = ref<any[]>([])

// Time tracking
const now = useNow({ interval: 1000 })

// Services
const batchGenerator = new BatchDataGenerator()
const session = useSession()

// Computed properties
const completedCount = computed(() => 
  executions.value.filter(e => e.status === 'completed' || e.status === 'failed').length
)

const overallProgress = computed(() => {
  if (props.params.count === 0) return 0
  return (completedCount.value / props.params.count) * 100
})

const currentExecution = computed(() => {
  if (currentExecutionIndex.value >= executions.value.length) return null
  return executions.value[currentExecutionIndex.value]
})

const nextExecutionCountdown = computed(() => {
  if (!nextExecutionTime.value || status.value !== 'running') return 0
  return Math.max(0, Number(nextExecutionTime.value) - Number(now.value))
})

// Methods
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'running': return 'primary'
    case 'completed': return 'success'
    case 'failed': return 'error'
    default: return 'default'
  }
}

const getStatusText = (status: string): string => {
  switch (status) {
    case 'pending': return '等待中'
    case 'running': return '执行中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return '未知'
  }
}

const initializeExecutions = async () => {
  try {
    // Generate batch data
    const batchData = await batchGenerator.generateBatchData(props.params)
    
    // Initialize execution items
    executions.value = batchData.map((data, index) => ({
      index,
      params: {
        distance: parseFloat(data.distance),
        targetTime: parseInt(data.duration),
        avgSpeed: parseFloat(data.avgSpeed)
      },
      status: 'pending' as const,
      progress: 0
    }))
    
    // Start first execution
    executeNext()
  } catch (error) {
    console.error('Error initializing batch execution:', error)
    status.value = 'error'
    emit('error', '初始化批量执行失败')
  }
}

const executeNext = async () => {
  if (currentExecutionIndex.value >= executions.value.length) {
    // All executions completed
    completeExecution()
    return
  }

  const execution = executions.value[currentExecutionIndex.value]
  execution.status = 'running'
  execution.startTime = new Date()

  try {
    // Simulate run execution with progress updates
    const duration = execution.params.targetTime || 1800 // Default 30 minutes
    const progressInterval = setInterval(() => {
      if (execution.status !== 'running') {
        clearInterval(progressInterval)
        return
      }

      const elapsed = Date.now() - Number(execution.startTime)
      execution.progress = Math.min(100, (elapsed / (duration * 1000)) * 100)
    }, 1000)

    // Wait for the run duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000))
    
    clearInterval(progressInterval)

    // Mark as completed (in real implementation, this would submit to server)
    execution.status = 'completed'
    execution.endTime = new Date()
    execution.progress = 100
    execution.recordId = `FR${Date.now()}_${execution.index}`

    results.value.push({
      index: execution.index,
      success: true,
      recordId: execution.recordId
    })

  } catch (error) {
    execution.status = 'failed'
    execution.error = error instanceof Error ? error.message : '执行失败'
    
    results.value.push({
      index: execution.index,
      success: false,
      error: execution.error
    })
  }

  // Move to next execution
  currentExecutionIndex.value++

  if (currentExecutionIndex.value < executions.value.length) {
    // Schedule next execution
    const intervalMs = props.params.interval * 60 * 1000
    nextExecutionTime.value = new Date(Date.now() + intervalMs)
    
    setTimeout(() => {
      nextExecutionTime.value = undefined
      executeNext()
    }, intervalMs)
  } else {
    completeExecution()
  }
}

const completeExecution = () => {
  status.value = 'completed'
  
  const result: BatchExecutionResult = {
    totalSubmitted: results.value.length,
    successCount: results.value.filter(r => r.success).length,
    failureCount: results.value.filter(r => !r.success).length,
    results: results.value
  }
  
  emit('completed', result)
}

const handleStop = () => {
  status.value = 'error'
  
  // Stop current execution
  if (currentExecution.value) {
    currentExecution.value.status = 'failed'
    currentExecution.value.error = '用户停止'
  }
  
  emit('error', '批量执行已停止')
}

const handleRetry = () => {
  // Reset failed executions
  const failedExecutions = executions.value.filter(e => e.status === 'failed')
  failedExecutions.forEach(e => {
    e.status = 'pending'
    e.progress = 0
    e.error = undefined
  })
  
  // Remove failed results
  results.value = results.value.filter(r => r.success)
  
  // Find first pending execution
  currentExecutionIndex.value = executions.value.findIndex(e => e.status === 'pending')
  
  if (currentExecutionIndex.value !== -1) {
    status.value = 'running'
    executeNext()
  }
}

// Lifecycle
onMounted(() => {
  initializeExecutions()
})
</script>

<style scoped>
.batch-run-execution {
  max-width: 800px;
  margin: 0 auto;
}
</style>