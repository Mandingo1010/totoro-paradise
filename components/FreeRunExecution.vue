<template>
  <div class="free-run-execution">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="mdi-run" />
        自由跑进行中
      </VCardTitle>
      <VCardText>
        <!-- 跑步信息显示 -->
        <VCard v-if="runData" variant="tonal" class="mb-4">
          <VCardText>
            <VRow dense>
              <VCol cols="6" sm="3">
                <div class="text-caption">距离</div>
                <div class="text-h6">{{ runData.distance }} km</div>
              </VCol>
              <VCol cols="6" sm="3">
                <div class="text-caption">目标时间</div>
                <div class="text-h6">{{ formatTime(totalTime) }}</div>
              </VCol>
              <VCol cols="6" sm="3">
                <div class="text-caption">平均速度</div>
                <div class="text-h6">{{ runData.avgSpeed }} km/h</div>
              </VCol>
              <VCol cols="6" sm="3">
                <div class="text-caption">预计卡路里</div>
                <div class="text-h6">{{ runData.calorie }} kcal</div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- 加载中 -->
        <div v-else class="d-flex justify-center align-center pa-4">
          <VProgressCircular indeterminate color="primary" />
          <span class="ml-2">正在准备跑步数据...</span>
        </div>

        <!-- 进度显示 -->
        <div class="mb-4">
          <div class="d-flex justify-space-between mb-2">
            <span class="text-h6">{{ formatTime(elapsedTime) }}</span>
            <span class="text-h6">{{ Math.round(progressPercentage) }}%</span>
          </div>
          <VProgressLinear
            :model-value="progressPercentage"
            color="primary"
            height="12"
            rounded
          />
          <div class="d-flex justify-space-between mt-1 text-caption">
            <span>已用时间</span>
            <span>剩余: {{ formatTime(remainingTime) }}</span>
          </div>
        </div>

        <!-- 状态显示 -->
        <VAlert
          v-if="status === 'running'"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <template #prepend>
            <VProgressCircular indeterminate size="20" />
          </template>
          跑步进行中，请不要关闭页面...
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
          跑步完成！数据已成功提交到服务器。
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
          {{ errorMessage || '提交失败，请重试' }}
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
            重试
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- 离开确认对话框 -->
    <VDialog v-model="showLeaveDialog" max-width="400">
      <VCard>
        <VCardTitle>确认离开</VCardTitle>
        <VCardText>
          跑步还未完成，确定要离开吗？离开后当前进度将丢失。
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn variant="text" @click="showLeaveDialog = false">
            取消
          </VBtn>
          <VBtn color="error" @click="confirmLeave">
            确认离开
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNow } from '@vueuse/core'
import type { FreeRunParams } from '~/src/types/requestTypes/FreeRunRequest'
import { FreeRunDataGenerator } from '~/src/classes/FreeRunDataGenerator'
import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper'
import generateRoute from '~/src/utils/generateRoute'

// Props and emits
interface Props {
  params: FreeRunParams
}

interface Emits {
  (e: 'completed', recordId?: string): void
  (e: 'error', error: string): void
  (e: 'back-to-setup'): void
  (e: 'view-records'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Reactive data
const status = ref<'running' | 'completed' | 'error'>('running')
const errorMessage = ref<string>()
const startTime = ref<Date>()
const totalTime = ref(0) // in milliseconds
const showLeaveDialog = ref(false)
const runData = ref<any>()
const recordId = ref<string>()

// Time tracking
const now = useNow({ interval: 1000 })

// 已用时间：当达到预定时间后停止计时
const elapsedTime = computed(() => {
  if (!startTime.value) return 0
  const elapsed = Number(now.value) - Number(startTime.value)
  // 当已用时间达到预定时间时，停止计时（不超过 totalTime）
  return Math.min(elapsed, totalTime.value)
})

const remainingTime = computed(() => {
  return Math.max(0, totalTime.value - elapsedTime.value)
})

const progressPercentage = computed(() => {
  if (totalTime.value === 0) return 0
  return Math.min(100, (elapsedTime.value / totalTime.value) * 100)
})

// Services
const dataGenerator = new FreeRunDataGenerator()
const session = useSession()
const sunRunPaper = useSunRunPaper()

// Methods
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const startRun = async () => {
  try {
    // Debug: Log session state
    console.log('Session state:', session.value)
    
    // Validate session
    if (!session.value) {
      throw new Error('会话未初始化，请重新登录')
    }
    
    if (!session.value.stuNumber) {
      throw new Error('学号未设置，请重新登录')
    }

    // Generate run data with student number
    runData.value = await dataGenerator.generateRunData(
      props.params,
      session.value.stuNumber,
      65, // default weight
      new Date()
    )
    
    // Calculate total time for display (but we'll submit immediately)
    const durationInSeconds = parseInt(runData.value.duration)
    totalTime.value = durationInSeconds * 1000
    
    // Set start time
    startTime.value = new Date()
    
    // 立即提交数据，不等待计时器
    // Submit immediately instead of waiting
    await submitRunData()
    
  } catch (error) {
    console.error('Error starting run:', error)
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '启动跑步失败，请重试'
    emit('error', errorMessage.value)
  }
}

const submitRunData = async () => {
  try {
    if (!runData.value) {
      throw new Error('No run data available')
    }

    if (!session.value?.token) {
      throw new Error('会话无效，请重新登录')
    }

    // 获取真实的路线数据
    let routeId = 'freerun_' + Date.now()
    let taskId = 'freerun_task_' + Date.now()
    let routePoints: Array<{ longitude: string; latitude: string }> = []
    
    // 优先使用用户选择的路线
    const selectedRouteId = (props.params as any).selectedRouteId
    const selectedRouteInfo = (props.params as any).selectedRouteInfo
    
    console.log('Selected route from params:', selectedRouteId)
    console.log('sunRunPaper value:', sunRunPaper.value)
    
    // 查找选中的路线或使用第一个路线
    let targetRoute = null
    if (selectedRouteId && sunRunPaper.value?.runPointList?.length > 0) {
      targetRoute = sunRunPaper.value.runPointList.find(r => r.pointId === selectedRouteId)
    }
    if (!targetRoute && sunRunPaper.value?.runPointList?.length > 0) {
      targetRoute = sunRunPaper.value.runPointList[0]
    }
    
    if (targetRoute) {
      routeId = targetRoute.pointId
      taskId = targetRoute.taskId
      
      console.log('✅ Using route data:')
      console.log('  - routeId (pointId):', routeId)
      console.log('  - taskId:', taskId)
      console.log('  - pointName:', targetRoute.pointName)
      
      // 使用真实的路线点生成模拟路线
      try {
        const generatedRoute = generateRoute(runData.value.distance, targetRoute)
        routePoints = generatedRoute.mockRoute
        console.log('  - Generated', routePoints.length, 'route points')
      } catch (routeError) {
        console.warn('Failed to generate route from sunRunPaper, using mock route:', routeError)
        routePoints = generateMockRoute(parseFloat(runData.value.distance))
      }
    } else {
      console.log('⚠️ No sunRunPaper data available!')
      console.log('  - Using FAKE routeId and taskId (records may not appear in app)')
      console.log('  - Please scan QR code first to get real route data')
      routePoints = generateMockRoute(parseFloat(runData.value.distance))
    }

    // 第一步：通知服务器开始跑步
    console.log('Step 1: Calling getRunBegin...')
    await TotoroApiWrapper.getRunBegin({
      campusId: session.value.campusId,
      schoolId: session.value.schoolId,
      stuNumber: session.value.stuNumber,
      token: session.value.token,
    })
    console.log('getRunBegin completed')

    // Build the full FreeRunRequest with session data
    // 注意：使用真实的 routeId 和 taskId
    const freeRunRequest = {
      // From session (BasicRequest)
      token: session.value.token,
      schoolId: session.value.schoolId,
      campusId: session.value.campusId,
      stuNumber: session.value.stuNumber,
      // From generated run data
      distance: runData.value.distance,
      duration: runData.value.duration,
      avgSpeed: runData.value.avgSpeed,
      avgPace: runData.value.avgPace,
      calorie: runData.value.calorie,
      steps: runData.value.steps,
      startTime: runData.value.startTime,
      endTime: runData.value.endTime,
      mac: runData.value.mac,
      deviceInfo: runData.value.deviceInfo,
      runType: '1' as const, // 自由跑标识
      // 使用真实的路线ID和任务ID
      routeId,
      taskId,
    }

    // 第二步：提交跑步数据
    console.log('Step 2: Submitting run data:')
    console.log('  - routeId:', routeId)
    console.log('  - taskId:', taskId)
    console.log('  - distance:', runData.value.distance)
    console.log('  - duration:', runData.value.duration)
    const response = await TotoroApiWrapper.submitFreeRun(freeRunRequest)
    
    // Debug: Log the actual response
    console.log('API Response (full):', JSON.stringify(response, null, 2))
    
    // Check for success - the API returns status '00' for success
    // The record ID might be in scantronId (from SunRunExercisesResponse) or data.recordId
    if (response && response.status === '00') {
      // Try to get record ID from different possible locations
      const responseAny = response as any
      const scantronId = responseAny.scantronId || responseAny.data?.recordId
      recordId.value = scantronId || 'success'
      
      // 第三步：提交路线详情 - 这是让记录在手机客户端显示的关键步骤
      if (scantronId) {
        try {
          console.log('Step 3: Submitting route detail with', routePoints.length, 'points...')
          
          await TotoroApiWrapper.sunRunExercisesDetail({
            pointList: routePoints,
            scantronId: scantronId,
            breq: {
              campusId: session.value.campusId,
              schoolId: session.value.schoolId,
              stuNumber: session.value.stuNumber,
              token: session.value.token,
            },
          })
          console.log('Route detail submitted successfully')
        } catch (detailError) {
          console.warn('Failed to submit route detail:', detailError)
          // 即使路线详情提交失败，主记录已经提交成功，所以不抛出错误
        }
      }
      
      status.value = 'completed'
      
      // 发送浏览器通知提醒用户
      if ('Notification' in window) {
        const notifyUser = () => {
          new Notification('🦫 Totoro Paradise - 跑步完成！', {
            body: `距离: ${runData.value.distance}km | 时间: ${formatTime(totalTime.value)}\n点击返回查看详情`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">🦫</text></svg>',
            tag: 'freerun-complete',
            requireInteraction: true,
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">✓</text></svg>'
          })
        }
        
        if (Notification.permission === 'granted') {
          notifyUser()
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              notifyUser()
            }
          })
        }
      }
      
      emit('completed', recordId.value)
    } else {
      const errorMsg = response?.message || '服务器返回错误'
      throw new Error(errorMsg)
    }
  } catch (error) {
    console.error('Error submitting run data:', error)
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '提交失败，请重试'
    emit('error', errorMessage.value)
  }
}

// 生成模拟路线点
const generateMockRoute = (distanceKm: number): Array<{ longitude: string; latitude: string }> => {
  // 使用一个默认的起点（可以是学校的大致位置）
  // 这里使用北京的一个坐标作为示例
  const centerLat = 39.9042
  const centerLng = 116.4074
  
  // 根据距离计算需要多少个点（每100米一个点）
  const numPoints = Math.max(10, Math.floor(distanceKm * 10))
  
  // 计算圆形路线的半径（单位：度）
  // 1度约等于111公里，所以半径 = 距离 / (2 * PI) / 111
  const radiusDeg = distanceKm / (2 * Math.PI) / 111
  
  const points: Array<{ longitude: string; latitude: string }> = []
  
  for (let i = 0; i <= numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints
    // 添加一些随机偏移使路线看起来更自然
    const randomOffset = (Math.random() - 0.5) * 0.0001
    const lat = centerLat + radiusDeg * Math.sin(angle) + randomOffset
    const lng = centerLng + radiusDeg * Math.cos(angle) + randomOffset
    
    points.push({
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    })
  }
  
  return points
}

const handleRetry = () => {
  status.value = 'running'
  errorMessage.value = undefined
  startRun()
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (status.value === 'running') {
    event.preventDefault()
    event.returnValue = '跑步还未完成，确定要离开吗？'
    return '跑步还未完成，确定要离开吗？'
  }
}

const handlePopState = (event: PopStateEvent) => {
  if (status.value === 'running') {
    event.preventDefault()
    showLeaveDialog.value = true
    // Push the current state back to prevent navigation
    history.pushState(null, '', window.location.href)
  }
}

const confirmLeave = () => {
  showLeaveDialog.value = false
  // Remove event listeners before leaving
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('popstate', handlePopState)
  emit('back-to-setup')
}

// Lifecycle
onMounted(() => {
  // Add event listeners for page leave prevention
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('popstate', handlePopState)
  
  // Push initial state to handle back button
  history.pushState(null, '', window.location.href)
  
  // Start the run
  startRun()
})

onUnmounted(() => {
  // Clean up event listeners
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('popstate', handlePopState)
})

// Watch for status changes
watch(status, (newStatus) => {
  if (newStatus !== 'running') {
    // Remove event listeners when run is complete or failed
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('popstate', handlePopState)
  }
})
</script>

<style scoped>
.free-run-execution {
  max-width: 600px;
  margin: 0 auto;
}
</style>