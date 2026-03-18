import { ref, computed } from 'vue'
import type { RegistryConfig } from '@/api/types'

const DEFAULT_URL = import.meta.env.VITE_REGISTRY_URL || ''

const registries = ref<RegistryConfig[]>([])
const currentUrl = ref(DEFAULT_URL)

export function useRegistry() {
  const registryUrl = computed(() => currentUrl.value.replace(/\/$/, ''))

  function setRegistryUrl(url: string) {
    currentUrl.value = url.replace(/\/$/, '')
  }

  function addRegistry(config: RegistryConfig) {
    if (!registries.value.find(r => r.url === config.url)) {
      registries.value.push(config)
    }
    setRegistryUrl(config.url)
  }

  function removeRegistry(url: string) {
    registries.value = registries.value.filter(r => r.url !== url)
    if (currentUrl.value === url && registries.value.length > 0) {
      currentUrl.value = registries.value[0].url
    }
  }

  function initFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const url = params.get('url')
    if (url) setRegistryUrl(url)
  }

  return {
    registryUrl,
    registries,
    currentUrl,
    setRegistryUrl,
    addRegistry,
    removeRegistry,
    initFromUrl,
  }
}
