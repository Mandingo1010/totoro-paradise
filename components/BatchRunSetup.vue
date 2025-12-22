<template>
  <div class="batch-run-setup">
    <VCard class="mb-4">
      <VCardTitle>批量自由跑设置</VCardTitle>
      <VCardText>
        <p class="text-body-2 mb-4">
          批量执行多次自由跑，系统将自动为每次跑步生成不同的参数，模拟真实的跑步变化。
        </p>

        <VForm ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
          <!-- 基础参数设置 -->
          <VCard variant="outlined" class="mb-4">
            <VCardTitle class="text-h6">基础参数</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model.number="batchParams.baseParams.distance"
                    label="基础距离 (公里)"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="20"
                    :rules="distanceRules"
                    variant="outlined"
                    required
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model.number="baseTargetTimeMinutes"
                    label="基础目标时间 (分钟)"
                    type="number"
                    step="1"
                    min="1"
                    max="300"
                    :rules="timeRules"
                    variant="outlined"
                    hint="每次跑步将在此基础上随机变化"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- 批量设置 -->
          <VCard variant="outlined" class="mb-4">
            <VCardTitle class="text-h6">批量设置</VCardTitle>
            <VCardText>
              <VRow>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model.number="batchParams.count"
                    label="执行次数"
                    type="number"
                    min="1"
                    max="10"
                    :rules="countRules"
                    variant="outlined"
                    required
                  />
                </VCol>
                <VCol cols="12" md="6">
                  <VTextField
                    v-model.number="batchParams.interval"
                    label="间隔时间 (分钟)"
                    type="number"
                    min="1"
                    max="60"
                    :rules="intervalRules"
                    variant="outlined"
                    required
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- 随机化设置 -->
          <VCard variant="outlined" class="mb-4">
            <VCardTitle class="text-h6">随机化设置</VCardTitle>
            <VCardText>
              <p class="text-body-2 mb-3">
                为了模拟真实跑步的变化，每次执行时参数将在以下范围内随机变化：
              </p>
              <VRow>
                <VCol cols="12" md="4">
                  <VTextField
                    v-model.number="batchParams.randomization.distanceVariation"
                    label="距离变化 (±公里)"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    variant="outlined"
                    hint="例如：0.2表示距离在±0.2公里范围内变化"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VTextField
                    v-model.number="batchParams.randomization.speedVariation"
                    label="速度变化 (±km/h)"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    variant="outlined"
                    hint="例如：1.0表示速度在±1km/h范围内变化"
                  />
                </VCol>
                <VCol cols="12" md="4">
                  <VTextField
                    v-model.number="batchParams.randomization.timeVariation"
                    label="时间变化 (±分钟)"
                    type="number"
                    step="1"
                    min="0"
                    max="30"
                    variant="outlined"
                    hint="例如：5表示时间在±5分钟范围内变化"
                  />
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- 预览信息 -->
          <VCard v-if="previewData" variant="tonal" class="mb-4">
            <VCardTitle class="text-h6">执行预览</VCardTitle>
            <VCardText>
              <VRow dense>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-caption">总执行次数</div>
                  <div class="text-h6">{{ batchParams.count }} 次</div>
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-caption">总耗时</div>
                  <div class="text-h6">{{ formatTotalTime() }}</div>
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-caption">距离范围</div>
                  <div class="text-h6">{{ formatDistanceRange() }} km</div>
                </VCol>
                <VCol cols="12" sm="6" md="3">
                  <div class="text-caption">时间范围</div>
                  <div class="text-h6">{{ formatTimeRange() }}</div>
                </VCol>
              </VRow>
            </VCardText>
          </VCard>

          <!-- 操作按钮 -->
          <div class="d-flex gap-2">
            <VBtn
              variant="outlined"
              @click="$emit('back')"
            >
              返回
            </VBtn>
            <VSpacer />
            <VBtn
              color="primary"
              :disabled="!canStartBatch"
              @click="handleStartBatch"
            >
              开始批量执行
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { BatchRunParams, FreeRunParams } from '~/src/types/requestTypes/FreeRunRequest'
import { ParameterValidator } from '~/src/classes/ParameterValidator'

// Props and emits
interface Props {
  modelValue?: BatchRunParams
}

interface Emits {
  (e: 'update:modelValue', value: BatchRunParams): void
  (e: 'start-batch', params: BatchRunParams): void
  (e: 'back'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    count: 3,
    interval: 10,
    baseParams: {
      distance: 3,
      targetTime: undefined,
      avgSpeed: undefined,
      template: undefined
    },
    randomization: {
      distanceVariation: 0.2,
      speedVariation: 1.0,
      timeVariation: 5
    }
  })
})

const emit = defineEmits<Emits>()

// Reactive data
const formRef = ref()
const formValid = ref(false)
const batchParams = ref<BatchRunParams>({ ...props.modelValue })
const baseTargetTimeMinutes = ref<number>()

// Initialize services
const validator = new ParameterValidator()

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

const countRules = computed(() => [
  (v: number) => {
    const result = validator.validateBatchParams({
      ...batchParams.value,
      count: v
    })
    return result.isValid || result.errors.find(e => e.includes('次数')) || true
  }
])

const intervalRules = computed(() => [
  (v: number) => {
    const result = validator.validateBatchParams({
      ...batchParams.value,
      interval: v
    })
    return result.isValid || result.errors.find(e => e.includes('间隔')) || true
  }
])

// Computed properties
const previewData = computed(() => {
  if (!batchParams.value.baseParams.distance || !batchParams.value.count) {
    return null
  }
  return batchParams.value
})

const canStartBatch = computed(() => {
  if (!formValid.value) return false
  
  const result = validator.validateBatchParams(batchParams.value)
  return result.isValid
})

// Methods
const formatTotalTime = (): string => {
  const singleRunTime = baseTargetTimeMinutes.value || 30 // Default estimate
  const totalMinutes = (singleRunTime * batchParams.value.count) + 
                      (batchParams.value.interval * (batchParams.value.count - 1))
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟`
}

const formatDistanceRange = (): string => {
  const base = batchParams.value.baseParams.distance
  const variation = batchParams.value.randomization.distanceVariation
  const min = Math.max(0.5, base - variation)
  const max = Math.min(20, base + variation)
  return `${min.toFixed(1)}-${max.toFixed(1)}`
}

const formatTimeRange = (): string => {
  if (!baseTargetTimeMinutes.value) return '自动计算'
  
  const base = baseTargetTimeMinutes.value
  const variation = batchParams.value.randomization.timeVariation
  const min = Math.max(1, base - variation)
  const max = base + variation
  return `${min}-${max}分钟`
}

const handleStartBatch = () => {
  if (!canStartBatch.value) return
  
  // Update target time from minutes input
  if (baseTargetTimeMinutes.value) {
    batchParams.value.baseParams.targetTime = baseTargetTimeMinutes.value * 60
  }
  
  emit('start-batch', { ...batchParams.value })
}

const handleSubmit = () => {
  handleStartBatch()
}

// Watch for changes and emit updates
watch(batchParams, (newParams) => {
  emit('update:modelValue', { ...newParams })
}, { deep: true })

// Initialize target time from props
watch(() => props.modelValue.baseParams.targetTime, (newTime) => {
  if (newTime) {
    baseTargetTimeMinutes.value = Math.round(newTime / 60)
  }
}, { immediate: true })
</script>

<style scoped>
.batch-run-setup {
  max-width: 900px;
  margin: 0 auto;
}
</style>