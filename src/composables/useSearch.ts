import { ref, computed } from 'vue'

const searchQuery = ref('')

export function useSearch() {
  const query = computed(() => searchQuery.value.toLowerCase().trim())

  function setSearch(value: string) {
    searchQuery.value = value
  }

  function clearSearch() {
    searchQuery.value = ''
  }

  function matches(text: string): boolean {
    if (!query.value) return true
    return text.toLowerCase().includes(query.value)
  }

  return { searchQuery, query, setSearch, clearSearch, matches }
}
