import { ref } from 'vue'
import { codeToHtml } from 'shiki'

export async function highlight(code: string, lang = 'dockerfile') {
  return codeToHtml(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  })
}

export function useHighlighter() {
  const highlighted = ref('')
  const loading = ref(false)

  async function highlightCode(code: string, lang = 'dockerfile') {
    loading.value = true
    highlighted.value = await highlight(code, lang)
    loading.value = false
  }

  return { highlighted, loading, highlightCode }
}
