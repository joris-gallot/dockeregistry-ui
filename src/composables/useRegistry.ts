import { computed } from 'vue'

const registryUrl = computed(() => import.meta.env.VITE_REGISTRY_URL.replace(/\/$/, ''))

export function useRegistry() {
  return { registryUrl }
}

export function getApiBaseUrl(): string {
  return import.meta.env.DEV ? '' : import.meta.env.VITE_REGISTRY_URL.replace(/\/$/, '')
}
