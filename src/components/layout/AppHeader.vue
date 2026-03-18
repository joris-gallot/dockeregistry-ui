<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Server, Moon, Sun, Monitor } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useSearch } from '@/composables/useSearch'
import { useTheme } from '@/composables/useTheme'
import { useRegistry } from '@/composables/useRegistry'

const router = useRouter()
const { searchQuery, setSearch } = useSearch()
const { theme, toggleTheme } = useTheme()
const { registries, setRegistryUrl } = useRegistry()

const newUrl = ref('')

function goHome() {
  router.push('/')
}

function addRegistryUrl() {
  if (newUrl.value.trim()) {
    setRegistryUrl(newUrl.value.trim())
    newUrl.value = ''
  }
}

const themeIcon = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
}
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="flex h-14 items-center gap-4 px-6">
      <button class="flex items-center gap-2 font-semibold text-lg tracking-tight" @click="goHome">
        <Server class="h-5 w-5" />
        <span>Docker Registry</span>
      </button>

      <div class="flex-1 max-w-md mx-auto">
        <div class="relative">
          <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            :model-value="searchQuery"
            placeholder="Search repositories or tags..."
            class="pl-9 h-9"
            @update:model-value="setSearch($event as string)"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="h-9 w-9">
              <Server class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-72">
            <div class="p-2">
              <p class="text-sm font-medium mb-2">Registry URL</p>
              <div class="flex gap-2">
                <Input
                  v-model="newUrl"
                  placeholder="http://localhost:5000"
                  class="h-8 text-sm"
                  @keyup.enter="addRegistryUrl"
                />
                <Button size="sm" class="h-8" @click="addRegistryUrl">Go</Button>
              </div>
            </div>
            <DropdownMenuSeparator v-if="registries.length > 0" />
            <DropdownMenuItem
              v-for="reg in registries"
              :key="reg.url"
              @click="setRegistryUrl(reg.url)"
            >
              <Server class="mr-2 h-4 w-4" />
              {{ reg.name || reg.url }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" class="h-9 w-9" @click="toggleTheme">
          <component :is="themeIcon[theme]" class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
</template>
