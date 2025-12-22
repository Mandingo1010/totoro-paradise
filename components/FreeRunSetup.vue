<template>
  <div class="free-run-setup">
    <VCard class="mb-4">
      <VCardTitle>自由跑参数设置</VCardTitle>
      <VCardText>
        <p class="text-body-2 mb-4">自定义您的跑步距离和目标时间，系统将自动生成真实的跑步数据。</p>
        
        <!-- 路线选择 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">选择路线</div>
          <VSelect
            v-model="selectedRoute"
            :items="availableRoutes"
            item-title="pointName"
            item-value="pointId"
            variant="outlined"
            label="跑步路线"
            :loading="loadingRoutes"
            :disabled="!availableRoutes.length"
            clearable
          >
            <template #prepend-item>
              <VListItem @click="selectRandomRoute">
                <template #prepend>
                  <VIcon icon="mdi-shuffle-variant" />
                </template>
                <VListItemTitle>随机选择路线</VListItemTitle>
              </VListItem>
              <VDivider class="mt-2" />
            </template>
          </VSelect>
          <p v-if="selectedRouteInfo" class="text-caption text-medium-emphasis mt-1">
            已选择: {{ selectedRouteInfo.pointName }}
          </p>
          <p v-else-if="!loadingRoutes && !availableRoutes.length" class="text-caption text-warning mt-1">
            未能加载路线数据，将使用默认路线
          </p>
        </div>

        <!-- 模板选择 -->
        <div class="mb-6">
          <div class="text-subtitle-2 mb-2">快速模板</div>
          <VChipGroup v-model="selectedTemplate" mandatory class="mb-4">
            <VChip
              v-for="template in templates"
              :key="template.id"
              :value="template.id"
              variant="outlined"
              @click="applyTemplate(template)"
            >
              {{ template.name }}
            </VChip>
          </VChipGroup>
          <p v-if="selectedTemplateInfo" class="text-caption text-medium-emphasis">
            {{ selectedTemplateInfo.description }}
          </p>
        </div>

        <!-- 参数设置表单 -->
        <VForm ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="params.distance"
                label="跑步距离 (公里)"
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                :rules="distanceRules"
                :error-messages="distanceErrors"
                variant="outlined"
                required
              />
            </VCol>
            <VCol cols="12" md="6">
              <VTextField
                v-model.number="targetTimeMinutes"
                label="目标时间 (分钟)"
                type="number"
                step="1"
                min="1"
                max="300"
                :rules="timeRules"
                :error-messages="timeErrors"
                variant="outlined"
                hint="留空将根据合理速度自动计算"
              />
            </VCol>
          </VRow>

          <!-- 计算结果显示 -->
          <VCard v-if="calculatedData" variant="tonal" class="mt-4">
            <VCardText>
              <div class="text-subtitle-2 mb-2">预计跑步数据</div>
              <VRow dense>
                <VCol cols="6" sm="3">
                  <div class="text-caption">平均速度</div>
                  <div class="text-h6">{{ calculatedData.avgSpeed }} km/h</div>
                </VCol>
                <VCol cols="6" sm="3">
                  <div class="text-caption">平均配速</div>
                  <div class="text-h6">{{ calculatedData.avgPace }}</div>
                </VCol>
                <VCol cols="6" sm="3">
                  <div class="text-caption">预计卡路里</div>
                  <div class="text-h6">{{ calculatedData.calorie }} kcal</div>
                </VCol>
                <VCol cols="6" sm="3">
                  <div class="text-caption">预计步数</div>
                  <div class="text-h6">{{ calculatedData.steps }} 步</div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- 高级设置 -->
          <VExpansionPanels class="mt-4">
            <VExpansionPanel>
              <VExpansionPanelTitle>高级设置</VExpansionPanelTitle>
              <VExpansionPanelText>
                <VRow>
                  <VCol cols="12" md="6">
                    <VTextField
                      v-model.number="params.avgSpeed"
                      label="指定平均速度 (km/h)"
                      type="number"
                      step="0.1"
                      min="3"
                      max="25"
                      :rules="speedRules"
                      variant="outlined"
                      hint="留空将自动计算合理速度"
                    />
                  </VCol>
                </VRow>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>

          <!-- 操作按钮 -->
          <div class="d-flex gap-2 mt-6">
            <VBtn
              variant="outlined"
              @click="$emit('back')"
            >
              返回
            </VBtn>
            <VSpacer />
            <VBtn
              color="primary"
              :disabled="!canStartRun"
              @click="handleStartRun"
            >
              开始跑步
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FreeRunParams, RunTemplate } from '~/src/types/requestTypes/FreeRunRequest'
import { ParameterValidator } from '~/src/classes/ParameterValidator'
import { TemplateManager } from '~/src/classes/TemplateManager'
import { RunCalculator } from '~/src/classes/RunCalculator'

// Props and emits
interface Props {
  modelValue?: FreeRunParams
}

interface Emits {
  (e: 'update:modelValue', value: FreeRunParams): void
  (e: 'start-run', params: FreeRunParams): void
  (e: 'back'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    distance: 3,
    targetTime: undefined,
    avgSpeed: undefined,
    template: undefined
  })
})

const emit = defineEmits<Emits>()

// Reactive data
const formRef = ref()
const formValid = ref(false)
const selectedTemplate = ref<string>()
const params = ref<FreeRunParams>({ ...props.modelValue })
const targetTimeMinutes = ref<number>()

// Route selection
const sunRunPaper = useSunRunPaper()
const loadingRoutes = ref(false)
const selectedRoute = ref<string>()

// Available routes from sunRunPaper
const availableRoutes = computed(() => {
  return sunRunPaper.value?.runPointList || []
})

// Selected route info
const selectedRouteInfo = computed(() => {
  if (!selectedRoute.value) return null
  return availableRoutes.value.find(r => r.pointId === selectedRoute.value)
})

// Select random route
const selectRandomRoute = () => {
  if (availableRoutes.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableRoutes.value.length)
    selectedRoute.value = availableRoutes.value[randomIndex].pointId
  }
}

// Initialize services
const validator = new ParameterValidator()
const templateManager = new TemplateManager()
const calculator = new RunCalculator()

// Templates
const templates = computed(() => templateManager.getAvailableTemplates())
const selectedTemplateInfo = computed(() => 
  templates.value.find(t => t.id === selectedTemplate.value)
)

// Validation rules
const distanceRules = computed(() => [
  (v: number) => {
    const result = validator.validateDistance(v)
    return result.isValid || result.errors[0]
  }
])

const timeRules = computed(() => [
  (v: number) => {
    if (!v) return true // Optional field
    return (v >= 1 && v <= 300) || '时间必须在1-300分钟之间'
  }
])

const speedRules = computed(() => [
  (v: number) => {
    if (!v) return true // Optional field
    const result = validator.validateSpeed(v)
    return result.isValid || result.errors[0]
  }
])

// Error messages
const distanceErrors = computed(() => {
  const result = validator.validateDistance(params.value.distance)
  return result.isValid ? [] : result.errors
})

const timeErrors = computed(() => {
  if (!targetTimeMinutes.value) return []
  const timeInSeconds = targetTimeMinutes.value * 60
  const speed = params.value.distance / (timeInSeconds / 3600)
  const speedResult = validator.validateSpeed(speed)
  return speedResult.isValid ? [] : ['此时间对应的速度超出合理范围']
})

// Calculated data
const calculatedData = computed(() => {
  if (!params.value.distance) return null
  
  try {
    // Calculate target time if not provided
    let targetTime = params.value.targetTime
    if (targetTimeMinutes.value) {
      targetTime = targetTimeMinutes.value * 60
    }
    
    const data = calculator.calculateRunData({
      distance: params.value.distance,
      targetTime,
      avgSpeed: params.value.avgSpeed
    })
    
    return data
  } catch (error) {
    console.error('Error calculating run data:', error)
    return null
  }
})

// Can start run validation
const canStartRun = computed(() => {
  // Check distance is valid
  if (!params.value.distance || params.value.distance <= 0) return false
  
  const distanceResult = validator.validateDistance(params.value.distance)
  if (!distanceResult.isValid) return false
  
  // Check speed if specified
  if (params.value.avgSpeed) {
    const speedResult = validator.validateSpeed(params.value.avgSpeed)
    if (!speedResult.isValid) return false
  }
  
  // Check calculated speed if time is specified
  if (targetTimeMinutes.value) {
    const timeInSeconds = targetTimeMinutes.value * 60
    const speed = params.value.distance / (timeInSeconds / 3600)
    const speedResult = validator.validateSpeed(speed)
    if (!speedResult.isValid) return false
  }
  
  return true
})

// Methods
const applyTemplate = (template: RunTemplate) => {
  params.value = { ...template.defaultParams }
  selectedTemplate.value = template.id
  
  // Calculate reasonable target time for the template
  const avgSpeed = (template.speedRange[0] + template.speedRange[1]) / 2
  const timeInHours = params.value.distance / avgSpeed
  targetTimeMinutes.value = Math.round(timeInHours * 60)
}

const handleStartRun = () => {
  if (!canStartRun.value) return
  
  // Update target time from minutes input
  if (targetTimeMinutes.value) {
    params.value.targetTime = targetTimeMinutes.value * 60
  }
  
  // Add selected route info to params
  const finalParams = { 
    ...params.value,
    selectedRouteId: selectedRoute.value,
    selectedRouteInfo: selectedRouteInfo.value
  }
  
  emit('start-run', finalParams)
}

const handleSubmit = () => {
  handleStartRun()
}

// Watch for changes and emit updates
watch(params, (newParams) => {
  emit('update:modelValue', { ...newParams })
}, { deep: true })

// Initialize target time from props
watch(() => props.modelValue.targetTime, (newTime) => {
  if (newTime) {
    targetTimeMinutes.value = Math.round(newTime / 60)
  }
}, { immediate: true })
</script>

<style scoped>
.free-run-setup {
  max-width: 800px;
  margin: 0 auto;
}
</style>