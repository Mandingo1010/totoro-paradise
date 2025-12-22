<template>
  <div class="records-page">
    <FreeRunRecords />
  </div>
</template>

<script setup lang="ts">
// Page metadata
definePageMeta({
  title: '跑步记录'
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
.records-page {
  min-height: 100vh;
}
</style>