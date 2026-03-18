<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Layers, Copy, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { getManifest, getBlob, isManifestList } from '@/api/registry'
import type { HistoryLayer, ManifestV2, ManifestList } from '@/api/types'
import { useRegistry } from '@/composables/useRegistry'

const route = useRoute()
const router = useRouter()
const { registryUrl } = useRegistry()

const image = computed(() => route.params.image as string)
const tag = computed(() => route.params.tag as string)

const layers = ref<HistoryLayer[]>([])
const platforms = ref<Array<{ os: string; architecture: string; variant?: string; digest: string }>>([])
const selectedPlatform = ref('')
const loading = ref(true)
const error = ref<string | null>(null)
const copiedCmd = ref(false)
const dockerfile = ref('')

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function parseCommand(createdBy: string): string {
  return createdBy
    .replace(/\/bin\/sh -c #\(nop\)\s+/, '')
    .replace(/\/bin\/sh -c\s+/, 'RUN ')
    .trim()
}

async function copyPullCommand() {
  const cmd = `docker pull ${registryUrl.value}/${image.value}:${tag.value}`
  await navigator.clipboard.writeText(cmd)
  copiedCmd.value = true
  setTimeout(() => { copiedCmd.value = false }, 2000)
}

async function loadHistory(manifestRef?: string) {
  loading.value = true
  error.value = null
  try {
    const ref = manifestRef || tag.value
    const { manifest } = await getManifest(registryUrl.value, image.value, ref)

    if (isManifestList(manifest)) {
      const ml = manifest as ManifestList
      platforms.value = ml.manifests.map(m => ({
        os: m.platform.os,
        architecture: m.platform.architecture,
        variant: m.platform.variant,
        digest: m.digest,
      }))
      if (platforms.value.length > 0) {
        const first = platforms.value[0]
        selectedPlatform.value = first.digest
        await loadHistory(first.digest)
        return
      }
    }

    const mv2 = manifest as ManifestV2
    const config = await getBlob(registryUrl.value, image.value, mv2.config.digest)
    const layerSizes = mv2.layers.map(l => l.size)

    let sizeIdx = 0
    layers.value = config.history.map(h => {
      const size = h.empty_layer ? 0 : (layerSizes[sizeIdx++] || 0)
      return {
        created: h.created,
        createdBy: h.created_by,
        size,
        emptyLayer: !!h.empty_layer,
        comment: h.comment,
      }
    }).reverse()

    dockerfile.value = config.history
      .map(h => parseCommand(h.created_by))
      .reverse()
      .join('\n')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load history'
  } finally {
    loading.value = false
  }
}

async function switchPlatform(digest: string) {
  selectedPlatform.value = digest
  await loadHistory(digest)
}

onMounted(() => loadHistory())
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" @click="router.push({ name: 'taglist', params: { image } })">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold tracking-tight">{{ image }}:{{ tag }}</h1>
        <p class="text-muted-foreground">Layer history</p>
      </div>
      <div class="flex gap-2">
        <Dialog>
          <DialogTrigger as-child>
            <Button variant="outline" size="sm" :disabled="!dockerfile">Dockerfile</Button>
          </DialogTrigger>
          <DialogContent class="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Reconstructed Dockerfile</DialogTitle>
            </DialogHeader>
            <pre class="bg-muted p-4 rounded-md text-sm font-mono whitespace-pre-wrap">{{ dockerfile }}</pre>
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" @click="copyPullCommand">
          <component :is="copiedCmd ? Check : Copy" class="h-4 w-4 mr-1" />
          Pull command
        </Button>
      </div>
    </div>

    <!-- Platform tabs -->
    <Tabs v-if="platforms.length > 1" :model-value="selectedPlatform" @update:model-value="switchPlatform($event as string)">
      <TabsList>
        <TabsTrigger
          v-for="p in platforms"
          :key="p.digest"
          :value="p.digest"
        >
          {{ p.os }}/{{ p.architecture }}{{ p.variant ? `/${p.variant}` : '' }}
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 6" :key="i" class="h-20 w-full" />
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive">{{ error }}</p>
    </div>

    <div v-else class="space-y-3">
      <Card v-for="(layer, idx) in layers" :key="idx" :class="{ 'opacity-60': layer.emptyLayer }">
        <CardContent class="p-4">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <Badge :variant="layer.emptyLayer ? 'outline' : 'secondary'" class="text-xs shrink-0">
                  {{ layer.emptyLayer ? 'metadata' : formatSize(layer.size) }}
                </Badge>
                <span class="text-xs text-muted-foreground">{{ formatDate(layer.created) }}</span>
              </div>
              <code class="text-sm font-mono break-all leading-relaxed">
                {{ parseCommand(layer.createdBy) }}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      <div v-if="layers.length === 0" class="text-center py-12 text-muted-foreground">
        <Layers class="h-12 w-12 mx-auto mb-3" />
        <p>No layer history available.</p>
      </div>
    </div>
  </div>
</template>
