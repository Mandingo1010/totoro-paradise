<script setup lang="ts">
import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper';

const sunrunPaper = useSunRunPaper();
const session = useSession();
const selectValue = ref('');
const runMode = ref<'sunshine' | 'free'>('sunshine'); // 跑步模式选择
const data = ref<any>(null);
const loading = ref(true);

// 检查session是否有效
const isSessionValid = computed(() => {
  return session.value && session.value.token;
});

// 异步加载数据
onMounted(async () => {
  if (!isSessionValid.value) {
    navigateTo('/');
    return;
  }
  
  try {
    const result = await TotoroApiWrapper.getSunRunPaper({
      token: session.value!.token,
      campusId: session.value!.campusId,
      schoolId: session.value!.schoolId,
      stuNumber: session.value!.stuNumber,
    });
    data.value = result;
    if (result) {
      sunrunPaper.value = result;
    }
  } catch (error) {
    console.error('Failed to load sun run paper:', error);
  } finally {
    loading.value = false;
  }
});

const handleUpdate = (target: string) => {
  selectValue.value = target;
};

const handleModeChange = (mode: 'sunshine' | 'free') => {
  runMode.value = mode;
  selectValue.value = ''; // 重置选择
};

const navigateToFreeRun = () => {
  navigateTo('/freerun');
};
</script>
<template>
  <!-- 加载中 -->
  <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 200px;">
    <VProgressCircular indeterminate color="primary" />
  </div>

  <!-- 未登录提示 -->
  <div v-else-if="!isSessionValid" class="text-center pa-4">
    <VAlert type="warning">
      请先扫码登录
    </VAlert>
    <VBtn color="primary" class="mt-4" @click="navigateTo('/')">
      返回首页
    </VBtn>
  </div>

  <!-- 主内容 -->
  <template v-else>
    <p>请核对个人信息</p>
    <VTable density="compact" class="mb-6 mt-4">
      <tbody>
        <tr>
          <td>学校</td>
          <td>{{ session?.campusName }}</td>
        </tr>
        <tr>
          <td>学院</td>
          <td>{{ session?.collegeName }}</td>
        </tr>
        <tr>
          <td>学号</td>
          <td>{{ session?.stuNumber }}</td>
        </tr>
        <tr>
          <td>姓名</td>
          <td>{{ session?.stuName }}</td>
        </tr>
      </tbody>
    </VTable>

    <!-- 跑步模式选择 -->
    <VCard class="mb-4">
      <VCardTitle>选择跑步模式</VCardTitle>
      <VCardText>
        <VRow>
          <VCol cols="12" md="6">
            <VCard
              :variant="runMode === 'sunshine' ? 'elevated' : 'outlined'"
              :color="runMode === 'sunshine' ? 'primary' : undefined"
              class="cursor-pointer"
              @click="handleModeChange('sunshine')"
            >
              <VCardText class="text-center">
                <VIcon size="48" class="mb-2">mdi-map-marker-path</VIcon>
                <div class="text-h6">阳光跑</div>
                <div class="text-body-2">固定路线跑步</div>
                <div class="text-caption mt-2">
                  选择学校预设路线进行跑步，系统将自动生成路径数据
                </div>
              </VCardText>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard
              :variant="runMode === 'free' ? 'elevated' : 'outlined'"
              :color="runMode === 'free' ? 'primary' : undefined"
              class="cursor-pointer"
              @click="handleModeChange('free')"
            >
              <VCardText class="text-center">
                <VIcon size="48" class="mb-2">mdi-run-fast</VIcon>
                <div class="text-h6">自由跑</div>
                <div class="text-body-2">自定义距离和时间</div>
                <div class="text-caption mt-2">
                  自由设置跑步距离和目标时间，支持批量执行和模板选择
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- 阳光跑设置 -->
    <template v-if="data && runMode === 'sunshine'">
      <VSelect
        v-model="selectValue"
        :items="data.runPointList"
        item-title="pointName"
        item-value="pointId"
        variant="underlined"
        label="路线"
        class="mt-2"
      />
      <div class="flex gap-4">
        <VBtn
          variant="outlined"
          color="primary"
          append-icon="i-mdi-gesture"
          @click="
            selectValue =
              data!.runPointList[Math.floor(Math.random() * data!.runPointList.length)].pointId
          "
        >
          随机路线
        </VBtn>
        <NuxtLink v-if="selectValue" :to="`/run/${encodeURIComponent(selectValue)}`">
          <VBtn class="ml-auto" color="primary" append-icon="i-mdi-arrow-right"> 开始跑步 </VBtn>
        </NuxtLink>
        <VBtn v-else class="ml-auto" color="primary" append-icon="i-mdi-arrow-right" disabled>
          开始跑步
        </VBtn>
      </div>
      <p class="mb-2 mt-6 text-xs">地图中的路线仅为展示路线生成效果，不等于最终路线</p>
      <div class="h-50vh w-50vw">
        <ClientOnly>
          <AMap :target="selectValue" @update:target="handleUpdate" />
        </ClientOnly>
      </div>
    </template>

    <!-- 自由跑设置 -->
    <template v-if="runMode === 'free'">
      <div class="d-flex gap-2 mt-4">
        <VBtn
          color="primary"
          append-icon="i-mdi-arrow-right"
          @click="navigateToFreeRun"
        >
          开始自由跑
        </VBtn>
      </div>
      <VAlert type="info" variant="tonal" class="mt-4">
        <VIcon icon="mdi-information" />
        <div class="ml-2">
          <div class="font-weight-medium">自由跑功能说明</div>
          <ul class="mt-2 text-body-2">
            <li>可自定义跑步距离（0.5-20公里）和目标时间</li>
            <li>系统自动生成真实的跑步数据（速度、配速、卡路里、步数等）</li>
            <li>支持预设模板（轻松跑、标准跑、挑战跑）</li>
            <li>支持批量执行，一次性完成多次跑步记录</li>
            <li>所有数据将提交到龙猫服务器，与阳光跑记录分开管理</li>
          </ul>
        </div>
      </VAlert>
    </template>
  </template>
</template>
