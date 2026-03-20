import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { setActiveRegistry } from '@/api/registry'

export interface Registry {
  url: string
  name: string
}

const registries = useLocalStorage<Registry[]>('registries', [])
const activeUrl = useLocalStorage<string>('active-registry', '')

export function useRegistries() {
  const activeRegistry = computed(() =>
    registries.value.find((r) => r.url === activeUrl.value) ?? null,
  )

  function addRegistry(url: string, name: string) {
    const normalized = url.replace(/\/$/, '')
    if (registries.value.find((r) => r.url === normalized)) return
    const displayName = name.trim() || new URL(normalized).hostname
    registries.value = [...registries.value, { url: normalized, name: displayName }]
  }

  function removeRegistry(url: string) {
    registries.value = registries.value.filter((r) => r.url !== url)
    if (activeUrl.value === url) {
      const next = registries.value[0]?.url ?? ''
      activeUrl.value = next
      setActiveRegistry(next)
    }
  }

  function setActive(url: string) {
    activeUrl.value = url
    setActiveRegistry(url)
  }

  return { registries, activeUrl, activeRegistry, addRegistry, removeRegistry, setActive }
}
