import { computed } from 'vue'

const registryUrl = computed(() => import.meta.env.VITE_REGISTRY_URL.replace(/\/$/, ''))

export function useRegistry() {
  return { registryUrl }
}
