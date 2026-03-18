<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClipboard } from '@vueuse/core'
import { ArrowLeft, Trash2, Copy, Check, History, Package } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getTagList, getManifest, getBlob, deleteManifest, isManifestList } from '@/api/registry'
import type { TagDetail, ManifestV2, ManifestList } from '@/api/types'
import { useRegistry } from '@/composables/useRegistry'
import { useSearch } from '@/composables/useSearch'

const route = useRoute()
const router = useRouter()
const { registryUrl } = useRegistry()
const { matches } = useSearch()

const image = computed(() => route.params.image as string)
const tags = ref<TagDetail[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedTags = ref<Set<string>>(new Set())
const { copy, copied, text: copiedText } = useClipboard({ copiedDuring: 2000 })
const deleting = ref(false)

const PAGE_SIZE = 25
const currentPage = ref(1)

const filteredTags = computed(() => tags.value.filter(t => matches(t.tag)))
const totalPages = computed(() => Math.ceil(filteredTags.value.length / PAGE_SIZE))
const paginatedTags = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredTags.value.slice(start, start + PAGE_SIZE)
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}


function toggleSelect(tag: string, event?: MouseEvent) {
  if (event?.altKey) {
    if (selectedTags.value.size === paginatedTags.value.length) {
      selectedTags.value.clear()
    } else {
      selectedTags.value = new Set(paginatedTags.value.map(t => t.tag))
    }
    return
  }
  if (selectedTags.value.has(tag)) {
    selectedTags.value.delete(tag)
  } else {
    selectedTags.value.add(tag)
  }
}

async function deleteSelected() {
  if (!registryUrl.value || selectedTags.value.size === 0) return
  deleting.value = true
  const toDelete = tags.value.filter(t => selectedTags.value.has(t.tag))
  try {
    for (const tag of toDelete) {
      if (tag.contentDigest) {
        await deleteManifest(registryUrl.value, image.value, tag.contentDigest)
      }
    }
    selectedTags.value.clear()
    await fetchTags()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Delete failed'
  } finally {
    deleting.value = false
  }
}

async function fetchTags() {
  if (!registryUrl.value) return
  loading.value = true
  error.value = null
  try {
    const data = await getTagList(registryUrl.value, image.value)
    if (!data.tags || data.tags.length === 0) {
      tags.value = []
      return
    }

    tags.value = data.tags.sort().reverse().map(tag => ({
      tag,
      digest: '',
      contentDigest: '',
      size: 0,
      createdAt: '',
      isManifestList: false,
    }))

    // Load metadata in background for visible tags
    loadMetadata()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch tags'
  } finally {
    loading.value = false
  }
}

async function loadMetadata() {
  for (const tagDetail of tags.value) {
    try {
      const { manifest, contentDigest } = await getManifest(registryUrl.value, image.value, tagDetail.tag)
      tagDetail.contentDigest = contentDigest

      if (isManifestList(manifest)) {
        tagDetail.isManifestList = true
        const ml = manifest as ManifestList
        tagDetail.platforms = ml.manifests.map(m => ({
          architecture: m.platform.architecture,
          os: m.platform.os,
          variant: m.platform.variant,
          digest: m.digest,
          size: m.size,
        }))
        tagDetail.size = ml.manifests.reduce((sum, m) => sum + m.size, 0)
        // Get date from first platform manifest
        if (ml.manifests.length > 0) {
          try {
            const first = ml.manifests[0]
            const { manifest: platManifest } = await getManifest(registryUrl.value, image.value, first.digest)
            if (!isManifestList(platManifest)) {
              const mv2 = platManifest as ManifestV2
              tagDetail.size = mv2.layers.reduce((sum, l) => sum + l.size, 0)
              const config = await getBlob(registryUrl.value, image.value, mv2.config.digest)
              tagDetail.createdAt = config.created
              tagDetail.architecture = first.platform.architecture
              tagDetail.os = first.platform.os
            }
          } catch { /* ignore */ }
        }
      } else {
        const mv2 = manifest as ManifestV2
        tagDetail.size = mv2.layers.reduce((sum, l) => sum + l.size, 0)
        tagDetail.digest = mv2.config.digest
        try {
          const config = await getBlob(registryUrl.value, image.value, mv2.config.digest)
          tagDetail.createdAt = config.created
          tagDetail.architecture = config.architecture
          tagDetail.os = config.os
        } catch { /* ignore */ }
      }
    } catch { /* ignore individual failures */ }
  }
}

onMounted(fetchTags)
watch(() => route.params.image, fetchTags)
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="router.push('/')">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ image }}</h1>
        <p class="text-muted-foreground">
          <span v-if="!loading">{{ filteredTags.length }} tags</span>
          <span v-else>Loading tags...</span>
        </p>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 6" :key="i" class="h-12 w-full" />
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive">{{ error }}</p>
    </div>

    <div v-else-if="tags.length === 0" class="text-center py-20">
      <Package class="h-16 w-16 mx-auto text-muted-foreground mb-4" />
      <p class="text-lg text-muted-foreground">No tags found for this image.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Delete bar -->
      <div v-if="selectedTags.size > 0" class="flex items-center gap-4 p-3 bg-destructive/10 rounded-lg">
        <span class="text-sm font-medium">{{ selectedTags.size }} tag(s) selected</span>
        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button variant="destructive" size="sm" :disabled="deleting">
              <Trash2 class="h-4 w-4 mr-1" />
              Delete selected
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {{ selectedTags.size }} tag(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the manifest references. Run garbage-collect on the registry to reclaim disk space.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction @click="deleteSelected">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <!-- Table -->
      <div class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10"></TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Digest</TableHead>
              <TableHead class="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="tag in paginatedTags"
              :key="tag.tag"
              :class="{ 'bg-accent/30': selectedTags.has(tag.tag) }"
            >
              <TableCell>
                <input
                  type="checkbox"
                  :checked="selectedTags.has(tag.tag)"
                  class="rounded border-input"
                  @click="toggleSelect(tag.tag, $event as MouseEvent)"
                />
              </TableCell>
              <TableCell class="font-medium">
                {{ tag.tag }}
                <Badge v-if="tag.isManifestList" variant="secondary" class="ml-2 text-xs">
                  multi-arch
                </Badge>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">
                {{ formatDate(tag.createdAt) }}
              </TableCell>
              <TableCell class="text-sm">{{ tag.size ? formatSize(tag.size) : '-' }}</TableCell>
              <TableCell class="text-sm">
                <template v-if="tag.platforms && tag.platforms.length > 0">
                  <Badge v-for="p in tag.platforms.slice(0, 3)" :key="p.digest" variant="outline" class="mr-1 text-xs">
                    {{ p.os }}/{{ p.architecture }}{{ p.variant ? `/${p.variant}` : '' }}
                  </Badge>
                  <span v-if="tag.platforms.length > 3" class="text-xs text-muted-foreground">
                    +{{ tag.platforms.length - 3 }}
                  </span>
                </template>
                <template v-else-if="tag.os">
                  {{ tag.os }}/{{ tag.architecture }}
                </template>
                <template v-else>-</template>
              </TableCell>
              <TableCell>
                <TooltipProvider v-if="tag.contentDigest">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        class="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                        @click="copy(tag.contentDigest)"
                      >
                        {{ tag.contentDigest.substring(0, 19) }}...
                        <component :is="copied && copiedText === tag.contentDigest ? Check : Copy" class="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="font-mono text-xs">{{ tag.contentDigest }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span v-else class="text-muted-foreground">-</span>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8"
                  @click="router.push({ name: 'history', params: { image: image, tag: tag.tag } })"
                >
                  <History class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        >
          Previous
        </Button>
        <span class="text-sm text-muted-foreground">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
