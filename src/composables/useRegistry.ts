import { ref } from 'vue'

const registryUrl = ref('')

async function loadConfig() {
  if (import.meta.env.DEV) {
    registryUrl.value = (import.meta.env.VITE_REGISTRY_URL || '').replace(/\/$/, '')
    return
  }
  try {
    const res = await fetch('/config.json')
    const config = await res.json()
    registryUrl.value = (config.registryUrl || '').replace(/\/$/, '')
  } catch {
    registryUrl.value = window.location.origin
  }
}

const configReady = loadConfig()

export function useRegistry() {
  return { registryUrl, configReady }
}
