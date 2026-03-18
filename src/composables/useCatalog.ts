import { ref, computed } from 'vue'
import { getCatalog } from '@/api/registry'
import { useRegistry } from './useRegistry'
import { useSearch } from './useSearch'

export interface CatalogNode {
  name: string
  path: string
  isRepo: boolean
  children: CatalogNode[]
  expanded: boolean
}

const repositories = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

function buildTree(repos: string[]): CatalogNode[] {
  const root: CatalogNode[] = []

  for (const repo of repos) {
    const parts = repo.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const path = parts.slice(0, i + 1).join('/')
      const isRepo = i === parts.length - 1

      let existing = current.find(n => n.name === name && n.path === path)
      if (!existing) {
        existing = { name, path, isRepo, children: [], expanded: false }
        current.push(existing)
      }
      if (isRepo) existing.isRepo = true
      current = existing.children
    }
  }

  return root
}

export function useCatalog() {
  const { registryUrl } = useRegistry()
  const { matches } = useSearch()

  const tree = computed(() => buildTree(repositories.value.filter(r => matches(r))))
  const repoCount = computed(() => repositories.value.length)

  async function fetchCatalog() {
    if (!registryUrl.value) return
    loading.value = true
    error.value = null
    try {
      const data = await getCatalog(registryUrl.value)
      repositories.value = data.repositories.sort()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch catalog'
    } finally {
      loading.value = false
    }
  }

  return { repositories, tree, repoCount, loading, error, fetchCatalog }
}
