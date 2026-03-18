import { watch } from 'vue'
import { useStorage, usePreferredDark } from '@vueuse/core'

type Theme = 'light' | 'dark' | 'auto'

const theme = useStorage<Theme>('theme', 'auto')
const prefersDark = usePreferredDark()

function applyTheme(t: Theme) {
  const dark = t === 'auto' ? prefersDark.value : t === 'dark'
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  watch([theme, prefersDark], () => applyTheme(theme.value), { immediate: true })

  function toggleTheme() {
    const modes: Theme[] = ['light', 'dark', 'auto']
    const idx = modes.indexOf(theme.value)
    theme.value = modes[(idx + 1) % modes.length]
  }

  return { theme, toggleTheme }
}
