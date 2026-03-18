<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useTheme } from '@/composables/useTheme'

useTheme()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground">
    <AppHeader />
    <main class="flex-1 px-6 py-6">
      <RouterView />
    </main>
  </div>
</template>
