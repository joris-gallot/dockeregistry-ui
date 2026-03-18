<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search, Server, Moon, Sun, Monitor, LogIn, LogOut } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { useSearch } from '@/composables/useSearch'
import { useTheme } from '@/composables/useTheme'
import { setBasicAuth, resetAuth } from '@/api/registry'

const route = useRoute()
const router = useRouter()
const { searchQuery, setSearch, clearSearch } = useSearch()

watch(() => route.path, () => clearSearch())
const { theme, toggleTheme } = useTheme()

const authUser = ref('')
const authPass = ref('')
const authDialogOpen = ref(false)
const isAuthenticated = ref(false)

function goHome() {
  router.push('/')
}

function login() {
  if (authUser.value && authPass.value) {
    setBasicAuth(authUser.value, authPass.value)
    isAuthenticated.value = true
    authDialogOpen.value = false
    authUser.value = ''
    authPass.value = ''
    window.location.reload()
  }
}

function logout() {
  resetAuth()
  isAuthenticated.value = false
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
        <!-- Auth -->
        <Dialog v-model:open="authDialogOpen">
          <DialogTrigger as-child>
            <Button v-if="!isAuthenticated" variant="ghost" size="icon" class="h-9 w-9">
              <LogIn class="h-4 w-4" />
            </Button>
          </DialogTrigger>
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

        <Button v-if="isAuthenticated" variant="ghost" size="icon" class="h-9 w-9" @click="logout">
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
