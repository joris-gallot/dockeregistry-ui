<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useRegistry } from '@/composables/useRegistry'
import { useTheme } from '@/composables/useTheme'

const { initFromUrl } = useRegistry()
useTheme()

onMounted(() => {
  initFromUrl()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground">
    <AppHeader />
    <main class="flex-1 px-6 py-6">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
