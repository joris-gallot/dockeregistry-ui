<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Server, Moon, Sun, Monitor, LogIn, LogOut, Globe, ChevronDown, Plus, Check } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSearch } from '@/composables/useSearch'
import { useTheme } from '@/composables/useTheme'
import { useRegistries } from '@/composables/useRegistries'
import { setBasicAuth, resetAuth, isAuthenticated as checkAuth } from '@/api/registry'

const route = useRoute()
const router = useRouter()
const { searchQuery, setSearch, clearSearch } = useSearch()

watch(() => route.path, () => clearSearch())
const { theme, toggleTheme } = useTheme()

const { registries, activeUrl, activeRegistry, addRegistry, removeRegistry, setActive } = useRegistries()

// --- Auth ---
const authUser = ref('')
const authPass = ref('')
const authDialogOpen = ref(false)
const authenticated = ref(checkAuth())

function login() {
  if (authUser.value && authPass.value) {
    setBasicAuth(authUser.value, authPass.value)
    authenticated.value = true
    authDialogOpen.value = false
    authUser.value = ''
    authPass.value = ''
    window.location.reload()
  }
}

function logout() {
  resetAuth()
  authenticated.value = false
  window.location.reload()
}

// --- Registry management ---
const addRegistryDialogOpen = ref(false)
const newRegistryUrl = ref('')
const newRegistryName = ref('')
const newRegistryError = ref('')

function switchRegistry(url: string) {
  if (url === activeUrl.value) return
  setActive(url)
  window.location.reload()
}

function openAddRegistry() {
  newRegistryUrl.value = ''
  newRegistryName.value = ''
  newRegistryError.value = ''
  addRegistryDialogOpen.value = true
}

function confirmAddRegistry() {
  newRegistryError.value = ''
  const raw = newRegistryUrl.value.trim()
  if (!raw) return

  let url = raw
  try {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }
    new URL(url) // validate
  } catch {
    newRegistryError.value = 'Invalid URL'
    return
  }

  addRegistry(url, newRegistryName.value)
  setActive(url.replace(/\/$/, ''))
  addRegistryDialogOpen.value = false
  window.location.reload()
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
      <button class="flex items-center gap-2 font-semibold text-lg tracking-tight" @click="router.push('/')">
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
        <!-- Registry selector -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="h-9 gap-1.5 max-w-44">
              <Globe class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ activeRegistry?.name ?? 'No registry' }}</span>
              <ChevronDown class="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-72">
            <DropdownMenuLabel>Registries</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup :model-value="activeUrl" @update:model-value="switchRegistry($event as string)">
              <DropdownMenuRadioItem
                v-for="r in registries"
                :key="r.url"
                :value="r.url"
                class="flex items-start gap-2 py-2"
              >
                <div class="flex flex-col min-w-0">
                  <span class="font-medium">{{ r.name }}</span>
                  <span class="text-xs text-muted-foreground truncate">{{ r.url }}</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator v-if="registries.length > 0" />
            <DropdownMenuItem v-if="registries.length > 0 && activeRegistry" class="text-destructive focus:text-destructive" @click="removeRegistry(activeUrl)">
              Remove current registry
            </DropdownMenuItem>
            <DropdownMenuItem @click="openAddRegistry">
              <Plus class="h-4 w-4 mr-2" />
              Add registry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- Add registry dialog -->
        <Dialog v-model:open="addRegistryDialogOpen">
          <DialogContent class="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Registry</DialogTitle>
            </DialogHeader>
            <div class="space-y-3 py-2">
              <Input
                v-model="newRegistryUrl"
                placeholder="https://registry.example.com"
                @keyup.enter="confirmAddRegistry"
              />
              <Input
                v-model="newRegistryName"
                placeholder="Name (optional)"
                @keyup.enter="confirmAddRegistry"
              />
              <p v-if="newRegistryError" class="text-sm text-destructive">{{ newRegistryError }}</p>
            </div>
            <DialogFooter>
              <Button @click="confirmAddRegistry" class="w-full">
                <Check class="h-4 w-4 mr-2" />
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <!-- Auth -->
        <Dialog v-model:open="authDialogOpen">
          <Button v-if="!authenticated" variant="ghost" size="icon" class="h-9 w-9" @click="authDialogOpen = true">
            <LogIn class="h-4 w-4" />
          </Button>
          <DialogContent class="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Registry Authentication</DialogTitle>
            </DialogHeader>
            <div class="space-y-3 py-2">
              <Input v-model="authUser" placeholder="Username" @keyup.enter="login" />
              <Input v-model="authPass" type="password" placeholder="Password" @keyup.enter="login" />
            </div>
            <DialogFooter>
              <Button @click="login" class="w-full">Login</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button v-if="authenticated" variant="ghost" size="icon" class="h-9 w-9" @click="logout">
          <LogOut class="h-4 w-4" />
        </Button>

        <!-- Theme toggle -->
        <Button variant="ghost" size="icon" class="h-9 w-9" @click="toggleTheme">
          <component :is="themeIcon[theme]" class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
</template>
