<template>
  <div class="free-run-records">
    <!-- Header with tabs -->
    <VCard class="mb-4">
      <VCardTitle class="d-flex align-center">
        <VIcon icon="mdi-run" class="me-2" />
        跑步记录
      </VCardTitle>
      
      <VTabs v-model="activeTab" class="px-4">
        <VTab value="sun">阳光跑</VTab>
        <VTab value="free">自由跑</VTab>
      </VTabs>
    </VCard>

    <!-- Free Run Records Content -->
    <VTabsWindow v-model="activeTab">
      <VTabsWindowItem value="free">
        <!-- Search and Filter Controls -->
        <VCard class="mb-4">
          <VCardText>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="searchQuery"
                  label="搜索记录"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @input="handleSearch"
                />
              </VCol>
              <VCol cols="12" md="3">
                <VSelect
                  v-model="statusFilter"
                  :items="statusOptions"
                  label="状态筛选"
                  clearable
                />
              </VCol>
              <VCol cols="12" md="3">
                <VBtn
                  color="primary"
                  variant="outlined"
                  @click="showFilters = !showFilters"
                >
                  <VIcon icon="mdi-filter" class="me-1" />
                  高级筛选
                </VBtn>
              </VCol>
            </VRow>

            <!-- Advanced Filters -->
            <VExpandTransition>
              <VRow v-if="showFilters" class="mt-2">
                <VCol cols="12" md="4">
                  <VTextField
                    v-model="distanceFilter.min"
                    label="最小距离 (km)"
                    type="number"
                    step="0.1"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VTextField
                    v-model="distanceFilter.max"
                    label="最大距离 (km)"
                    type="number"
                    step="0.1"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VBtn
                    color="secondary"
                    @click="applyFilters"
                  >
                    应用筛选
                  </VBtn>
                </VCol>
              </VRow>
            </VExpandTransition>
          </VCardText>
        </VCard>

        <!-- Records List -->
        <VCard>
          <VCardText>
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-8">
              <VProgressCircular indeterminate color="primary" />
              <p class="mt-2">加载记录中...</p>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredRecords.length === 0" class="text-center py-8">
              <VIcon icon="mdi-run" size="64" color="grey-lighten-1" />
              <p class="text-h6 mt-2">暂无自由跑记录</p>
              <p class="text-body-2 text-grey">
                {{ searchQuery ? '没有找到匹配的记录' : '开始你的第一次自由跑吧！' }}
              </p>
              <VBtn
                v-if="!searchQuery"
                color="primary"
                class="mt-4"
                @click="$router.push('/freerun')"
              >
                开始自由跑
              </VBtn>
            </div>

            <!-- Records Table -->
            <div v-else>
              <!-- Statistics Summary -->
              <VRow class="mb-4">
                <VCol cols="6" md="3">
                  <VCard variant="outlined">
                    <VCardText class="text-center">
                      <div class="text-h4 text-primary">{{ stats.totalRuns }}</div>
                      <div class="text-caption">总次数</div>
                    </VCardText>
                  </VCard>
                </VCol>
                <VCol cols="6" md="3">
                  <VCard variant="outlined">
                    <VCardText class="text-center">
                      <div class="text-h4 text-success">{{ stats.totalDistance.toFixed(1) }}</div>
                      <div class="text-caption">总距离 (km)</div>
                    </VCardText>
                  </VCard>
                </VCol>
                <VCol cols="6" md="3">
                  <VCard variant="outlined">
                    <VCardText class="text-center">
                      <div class="text-h4 text-info">{{ formatTime(stats.totalTime) }}</div>
                      <div class="text-caption">总时间</div>
                    </VCardText>
                  </VCard>
                </VCol>
                <VCol cols="6" md="3">
                  <VCard variant="outlined">
                    <VCardText class="text-center">
                      <div class="text-h4 text-warning">{{ stats.avgSpeed.toFixed(1) }}</div>
                      <div class="text-caption">平均速度 (km/h)</div>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>

              <!-- Records List -->
              <VDataTable
                :headers="headers"
                :items="paginatedRecords"
                :loading="loading"
                class="elevation-1"
                @click:row="handleRowClick"
              >
                <template #item.startTime="{ item }">
                  {{ formatDate(item.startTime) }}
                </template>
                
                <template #item.distance="{ item }">
                  {{ parseFloat(item.distance).toFixed(1) }} km
                </template>
                
                <template #item.duration="{ item }">
                  {{ formatTime(parseInt(item.duration)) }}
                </template>
                
                <template #item.avgSpeed="{ item }">
                  {{ parseFloat(item.avgSpeed).toFixed(1) }} km/h
                </template>
                
                <template #item.calorie="{ item }">
                  {{ item.calorie }} 卡
                </template>
                
                <template #item.status="{ item }">
                  <VChip
                    :color="getStatusColor(item.status)"
                    size="small"
                    variant="flat"
                  >
                    {{ getStatusText(item.status) }}
                  </VChip>
                </template>

                <template #item.actions="{ item }">
                  <VBtn
                    icon="mdi-eye"
                    size="small"
                    variant="text"
                    @click.stop="viewDetail(item)"
                  />
                  <VBtn
                    icon="mdi-download"
                    size="small"
                    variant="text"
                    @click.stop="exportRecord(item)"
                  />
                </template>
              </VDataTable>

              <!-- Pagination -->
              <div class="d-flex justify-center mt-4">
                <VPagination
                  v-model="currentPage"
                  :length="totalPages"
                  :total-visible="7"
                />
              </div>
            </div>
          </VCardText>
        </VCard>
      </VTabsWindowItem>

      <VTabsWindowItem value="sun">
        <VCard>
          <VCardText class="text-center py-8">
            <VIcon icon="mdi-weather-sunny" size="64" color="orange" />
            <p class="text-h6 mt-2">阳光跑记录</p>
            <p class="text-body-2 text-grey">阳光跑记录功能开发中...</p>
          </VCardText>
        </VCard>
      </VTabsWindowItem>
    </VTabsWindow>

    <!-- Export Dialog -->
    <VDialog v-model="showExportDialog" max-width="400">
      <VCard>
        <VCardTitle>导出记录</VCardTitle>
        <VCardText>
          <p>确定要导出选中的记录吗？</p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn @click="showExportDialog = false">取消</VBtn>
          <VBtn color="primary" @click="confirmExport">确定</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Error Snackbar -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { RecordManager } from '~/src/classes/RecordManager'
import type { FreeRunRecord } from '~/src/types/responseTypes/FreeRunResponse'
import type { RecordFilters } from '~/src/classes/RecordManager'

// Page metadata
definePageMeta({
  title: '跑步记录'
})

// Router
const router = useRouter()

// Reactive data
const activeTab = ref('free')
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showFilters = ref(false)
const showExportDialog = ref(false)
const selectedRecord = ref<FreeRunRecord | null>(null)

// Search and filter
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const distanceFilter = ref({
  min: null as number | null,
  max: null as number | null
})

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Data
const records = ref<FreeRunRecord[]>([])
const recordManager = new RecordManager()

// Status options
const statusOptions = [
  { title: '已完成', value: 'completed' },
  { title: '失败', value: 'failed' },
  { title: '进行中', value: 'pending' }
]

// Table headers
const headers = [
  { title: '日期', key: 'startTime', sortable: true },
  { title: '距离', key: 'distance', sortable: true },
  { title: '用时', key: 'duration', sortable: true },
  { title: '平均速度', key: 'avgSpeed', sortable: true },
  { title: '卡路里', key: 'calorie', sortable: true },
  { title: '状态', key: 'status', sortable: true },
  { title: '操作', key: 'actions', sortable: false }
]

// Computed properties
const filteredRecords = computed(() => {
  let result = records.value

  // Apply search
  if (searchQuery.value) {
    result = recordManager.searchRecords(result, searchQuery.value)
  }

  // Apply filters
  const filters: RecordFilters = {}
  if (statusFilter.value) {
    filters.status = statusFilter.value as 'completed' | 'failed' | 'pending'
  }
  if (distanceFilter.value.min !== null) {
    filters.minDistance = distanceFilter.value.min
  }
  if (distanceFilter.value.max !== null) {
    filters.maxDistance = distanceFilter.value.max
  }

  if (Object.keys(filters).length > 0) {
    result = recordManager.filterRecords(result, filters)
  }

  return result
})

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredRecords.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredRecords.value.length / itemsPerPage.value)
})

const stats = computed(() => {
  return recordManager.calculateStats(filteredRecords.value)
})

// Methods
const loadRecords = async () => {
  loading.value = true
  try {
    const session = useSession()
    if (!session.value?.token) {
      throw new Error('用户未登录')
    }

    const response = await recordManager.getFreeRunRecords(session.value)
    records.value = response
  } catch (error) {
    console.error('Failed to load records:', error)
    errorMessage.value = error instanceof Error ? error.message : '加载记录失败'
    showError.value = true
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1 // Reset to first page when searching
}

const applyFilters = () => {
  currentPage.value = 1 // Reset to first page when filtering
}

const handleRowClick = (event: Event, { item }: { item: FreeRunRecord }) => {
  viewDetail(item)
}

const viewDetail = (record: FreeRunRecord) => {
  router.push(`/records/free/${record.recordId}`)
}

const exportRecord = (record: FreeRunRecord) => {
  selectedRecord.value = record
  showExportDialog.value = true
}

const confirmExport = () => {
  if (selectedRecord.value) {
    const exported = recordManager.exportRecords([selectedRecord.value])
    
    // Create and download file
    const blob = new Blob([exported], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `free-run-record-${selectedRecord.value.recordId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  showExportDialog.value = false
  selectedRecord.value = null
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
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

// Watchers
watch(statusFilter, () => {
  currentPage.value = 1
})

watch(activeTab, (newTab) => {
  if (newTab === 'free') {
    loadRecords()
  }
})

// Lifecycle
onMounted(() => {
  if (activeTab.value === 'free') {
    loadRecords()
  }
})
</script>

<style scoped>
.free-run-records {
  padding: 16px;
}

.v-data-table >>> tbody tr {
  cursor: pointer;
}

.v-data-table >>> tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>