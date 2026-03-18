import { ref, computed } from 'vue'
import { getCatalog, getTagList } from '@/api/registry'
import { useSearch } from './useSearch'

export interface CatalogNode {
  name: string
  path: string
  isRepo: boolean
  children: CatalogNode[]
  expanded: boolean
  latestTag?: string
}

const repositories = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const expandedPaths = ref(new Set<string>())
const latestTags = ref(new Map<string, string>())

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
        existing = { name, path, isRepo, children: [], expanded: expandedPaths.value.has(path), latestTag: latestTags.value.get(path) }
        current.push(existing)
      }
      if (isRepo) existing.isRepo = true
      current = existing.children
    }
  }

  return root
}

export function useCatalog() {
  const { matches } = useSearch()

  const tree = computed(() => buildTree(repositories.value.filter(r => matches(r))))
  const repoCount = computed(() => repositories.value.length)

  function toggleNode(node: CatalogNode) {
    node.expanded = !node.expanded
    if (node.expanded) {
      expandedPaths.value.add(node.path)
    } else {
      expandedPaths.value.delete(node.path)
    }
  }

  async function fetchLatestTags() {
    for (const repo of repositories.value) {
      try {
        const data = await getTagList(repo)
        if (data.tags?.length) {
          latestTags.value.set(repo, data.tags.sort().reverse()[0])
        }
      } catch { /* ignore */ }
    }
  }

  async function fetchCatalog() {
    loading.value = true
    error.value = null
    try {
      const data = await getCatalog()
      repositories.value = data.repositories.sort()
      fetchLatestTags()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch catalog'
    } finally {
      loading.value = false
    }
  }

  return { repositories, tree, repoCount, loading, error, fetchCatalog, toggleNode }
}
