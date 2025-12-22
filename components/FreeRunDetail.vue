<template>
  <div class="free-run-detail">
    <!-- Header -->
    <VCard class="mb-4">
      <VCardTitle class="d-flex align-center">
        <VBtn
          icon="mdi-arrow-left"
          variant="text"
          @click="goBack"
        />
        <VIcon icon="mdi-run" class="me-2" />
        自由跑详情
        <VSpacer />
        <VBtn
          icon="mdi-share"
          variant="text"
          @click="shareRecord"
        />
        <VBtn
          icon="mdi-download"
          variant="text"
          @click="exportRecord"
        />
      </VCardTitle>
    </VCard>

    <!-- Loading State -->
    <VCard v-if="loading">
      <VCardText class="text-center py-8">
        <VProgressCircular indeterminate color="primary" />
        <p class="mt-2">加载详情中...</p>
      </VCardText>
    </VCard>

    <!-- Error State -->
    <VCard v-else-if="error">
      <VCardText class="text-center py-8">
        <VIcon icon="mdi-alert-circle" size="64" color="error" />
        <p class="text-h6 mt-2">加载失败</p>
        <p class="text-body-2 text-grey">{{ error }}</p>
        <VBtn color="primary" class="mt-4" @click="loadDetail">
          重试
        </VBtn>
      </VCardText>
    </VCard>

    <!-- Detail Content -->
    <div v-else-if="record">
      <!-- Basic Information -->
      <VCard class="mb-4">
        <VCardTitle>
          <VIcon icon="mdi-information" class="me-2" />
          基本信息
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <VList>
                <VListItem>
                  <VListItemTitle>记录ID</VListItemTitle>
                  <VListItemSubtitle>{{ record.recordId }}</VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>开始时间</VListItemTitle>
                  <VListItemSubtitle>{{ formatDateTime(record.startTime) }}</VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>结束时间</VListItemTitle>
                  <VListItemSubtitle>{{ formatDateTime(record.endTime) }}</VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>提交时间</VListItemTitle>
                  <VListItemSubtitle>{{ formatDateTime(record.submitTime) }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </VCol>
            <VCol cols="12" md="6">
              <VList>
                <VListItem>
                  <VListItemTitle>状态</VListItemTitle>
                  <VListItemSubtitle>
                    <VChip
                      :color="getStatusColor(record.status)"
                      size="small"
                      variant="flat"
                    >
                      {{ getStatusText(record.status) }}
                    </VChip>
                  </VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>学号</VListItemTitle>
                  <VListItemSubtitle>{{ record.stuNumber }}</VListItemSubtitle>
                </VListItem>
                <VListItem>
                  <VListItemTitle>学校ID</VListItemTitle>
                  <VListItemSubtitle>{{ record.schoolId }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <!-- Performance Metrics -->
      <VCard class="mb-4">
        <VCardTitle>
          <VIcon icon="mdi-chart-line" class="me-2" />
          运动数据
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="6" md="3">
              <VCard variant="outlined" class="text-center pa-4">
                <VIcon icon="mdi-map-marker-distance" size="32" color="primary" class="mb-2" />
                <div class="text-h4 text-primary">{{ parseFloat(record.distance).toFixed(1) }}</div>
                <div class="text-caption">距离 (km)</div>
              </VCard>
            </VCol>
            <VCol cols="6" md="3">
              <VCard variant="outlined" class="text-center pa-4">
                <VIcon icon="mdi-clock" size="32" color="success" class="mb-2" />
                <div class="text-h4 text-success">{{ formatTime(parseInt(record.duration)) }}</div>
                <div class="text-caption">用时</div>
              </VCard>
            </VCol>
            <VCol cols="6" md="3">
              <VCard variant="outlined" class="text-center pa-4">
                <VIcon icon="mdi-speedometer" size="32" color="info" class="mb-2" />
                <div class="text-h4 text-info">{{ parseFloat(record.avgSpeed).toFixed(1) }}</div>
                <div class="text-caption">平均速度 (km/h)</div>
              </VCard>
            </VCol>
            <VCol cols="6" md="3">
              <VCard variant="outlined" class="text-center pa-4">
                <VIcon icon="mdi-timer" size="32" color="warning" class="mb-2" />
                <div class="text-h4 text-warning">{{ record.avgPace }}</div>
                <div class="text-caption">平均配速</div>
              </VCard>
            </VCol>
          </VRow>

          <VRow class="mt-4">
            <VCol cols="6" md="3">
              <VCard variant="outlined" class="text-center pa-4">
                <VIcon icon="mdi-fire" size="32" color="orange" class="mb-2" />
                <div class="text-h4 text-orange">{{ record.calorie }}</div>
                <div class="text-caption">卡路里</div>
              </VCard>
            </VCol>
            <VCol cols="6" md="3">
              <VCard variant="outlined" class="text-center pa-4">
                <VIcon icon="mdi-walk" size="32" color="purple" class="mb-2" />
                <div class="text-h4 text-purple">{{ record.steps }}</div>
                <div class="text-caption">步数</div>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>

      <!-- Additional Information (if available) -->
      <VCard v-if="record.route || record.weather" class="mb-4">
        <VCardTitle>
          <VIcon icon="mdi-information-outline" class="me-2" />
          附加信息
        </VCardTitle>
        <VCardText>
          <VList v-if="record.route || record.weather || record.temperature || record.humidity">
            <VListItem v-if="record.route">
              <VListItemTitle>路线信息</VListItemTitle>
              <VListItemSubtitle>{{ record.route }}</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="record.weather">
              <VListItemTitle>天气</VListItemTitle>
              <VListItemSubtitle>{{ record.weather }}</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="record.temperature">
              <VListItemTitle>温度</VListItemTitle>
              <VListItemSubtitle>{{ record.temperature }}</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="record.humidity">
              <VListItemTitle>湿度</VListItemTitle>
              <VListItemSubtitle>{{ record.humidity }}</VListItemSubtitle>
            </VListItem>
          </VList>
          <p v-else class="text-grey">暂无附加信息</p>
        </VCardText>
      </VCard>

      <!-- Actions -->
      <VCard>
        <VCardTitle>
          <VIcon icon="mdi-cog" class="me-2" />
          操作
        </VCardTitle>
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VBtn
                color="primary"
                variant="outlined"
                block
                @click="shareRecord"
              >
                <VIcon icon="mdi-share" class="me-1" />
                分享记录
              </VBtn>
            </VCol>
            <VCol cols="12" md="4">
              <VBtn
                color="success"
                variant="outlined"
                block
                @click="exportRecord"
              >
                <VIcon icon="mdi-download" class="me-1" />
                导出数据
              </VBtn>
            </VCol>
            <VCol cols="12" md="4">
              <VBtn
                color="info"
                variant="outlined"
                block
                @click="viewAllRecords"
              >
                <VIcon icon="mdi-format-list-bulleted" class="me-1" />
                查看所有记录
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </div>

    <!-- Share Dialog -->
    <VDialog v-model="showShareDialog" max-width="400">
      <VCard>
        <VCardTitle>分享记录</VCardTitle>
        <VCardText>
          <p>选择分享方式：</p>
          <VBtn
            color="primary"
            variant="outlined"
            block
            class="mb-2"
            @click="copyToClipboard"
          >
            <VIcon icon="mdi-content-copy" class="me-1" />
            复制链接
          </VBtn>
          <VBtn
            color="success"
            variant="outlined"
            block
            @click="shareAsImage"
          >
            <VIcon icon="mdi-image" class="me-1" />
            生成图片
          </VBtn>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="showShareDialog = false">关闭</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Success/Error Snackbars -->
    <VSnackbar
      v-model="showSuccess"
      color="success"
      :timeout="3000"
    >
      {{ successMessage }}
    </VSnackbar>

    <VSnackbar
      v-model="showError"
      color="error"
      :timeout="5000"
    >
      {{ errorMessage }}
    </VSnackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { RecordManager } from '~/src/classes/RecordManager'
import type { FreeRunDetail } from '~/src/types/responseTypes/FreeRunResponse'

// Props
interface Props {
  recordId?: string
}

const props = withDefaults(defineProps<Props>(), {
  recordId: ''
})

// Page metadata
definePageMeta({
  title: '自由跑详情'
})

// Router and route
const router = useRouter()
const route = useRoute()

// Reactive data
const loading = ref(false)
const error = ref('')
const record = ref<FreeRunDetail | null>(null)
const showShareDialog = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Record manager
const recordManager = new RecordManager()

// Methods
const loadDetail = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const session = useSession()
    if (!session.value?.token) {
      throw new Error('用户未登录')
    }

    const recordId = props.recordId || route.params.id as string
    if (!recordId) {
      throw new Error('记录ID不能为空')
    }

    const response = await recordManager.getFreeRunDetail(recordId, session.value)
    record.value = response
  } catch (err) {
    console.error('Failed to load record detail:', err)
    error.value = err instanceof Error ? err.message : '加载详情失败'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.back()
}

const shareRecord = () => {
  showShareDialog.value = true
}

const exportRecord = () => {
  if (!record.value) return

  try {
    const exported = recordManager.exportRecords([record.value])
    
    // Create and download file
    const blob = new Blob([exported], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `free-run-detail-${record.value.recordId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    successMessage.value = '导出成功'
    showSuccess.value = true
  } catch (err) {
    console.error('Export failed:', err)
    errorMessage.value = '导出失败'
    showError.value = true
  }
}

const viewAllRecords = () => {
  router.push('/records?tab=free')
}

const copyToClipboard = async () => {
  if (!record.value) return

  try {
    const url = `${window.location.origin}/records/free/${record.value.recordId}`
    await navigator.clipboard.writeText(url)
    
    successMessage.value = '链接已复制到剪贴板'
    showSuccess.value = true
    showShareDialog.value = false
  } catch (err) {
    console.error('Copy failed:', err)
    errorMessage.value = '复制失败'
    showError.value = true
  }
}

const shareAsImage = () => {
  // TODO: Implement image generation functionality
  errorMessage.value = '图片分享功能开发中'
  showError.value = true
  showShareDialog.value = false
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'error'
    case 'pending': return 'warning'
    default: return 'grey'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '已完成'
    case 'failed': return '失败'
    case 'pending': return '进行中'
    default: return '未知'
  }
}

// Lifecycle
onMounted(() => {
  loadDetail()
})
</script>

<style scoped>
.free-run-detail {
  padding: 16px;
}

.text-orange {
  color: #ff9800 !important;
}

.text-purple {
  color: #9c27b0 !important;
}
</style>