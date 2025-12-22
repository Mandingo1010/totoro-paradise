<template>
  <div class="record-detail-page">
    <FreeRunDetail />
  </div>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  title: '自由跑详情'
})

// Check session on mount
onMounted(() => {
  const session = useSession()
  if (!session.value?.token) {
    navigateTo('/')
  }
})
</script>

<style scoped>
.record-detail-page {
  min-height: 100vh;
}
</style>