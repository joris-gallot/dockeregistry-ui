<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { theme } = useTheme()
</script>

<template>
  <footer class="border-t py-4 px-6">
    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span>Docker Registry UI v2</span>
      <span>Theme: {{ theme }}</span>
    </div>
  </footer>
</template>
