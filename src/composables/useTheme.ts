import { ref, watch, onMounted } from 'vue'

type Theme = 'light' | 'dark' | 'auto'

const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'auto')

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', t === 'dark')
  }
}

export function useTheme() {
  onMounted(() => {
    applyTheme(theme.value)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'auto') applyTheme('auto')
    })
  })

  watch(theme, (val) => {
    localStorage.setItem('theme', val)
    applyTheme(val)
  })

  function toggleTheme() {
    const modes: Theme[] = ['light', 'dark', 'auto']
    const idx = modes.indexOf(theme.value)
    theme.value = modes[(idx + 1) % modes.length]
  }

  return { theme, toggleTheme }
}
