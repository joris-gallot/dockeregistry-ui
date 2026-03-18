import { createRouter, createWebHashHistory } from 'vue-router'
import CatalogPage from '@/pages/CatalogPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'catalog',
      component: CatalogPage,
    },
    {
      path: '/taglist/:image(.*)',
      name: 'taglist',
      component: () => import('@/pages/TagListPage.vue'),
    },
    {
      path: '/history/:image(.*)/tag/:tag',
      name: 'history',
      component: () => import('@/pages/TagHistoryPage.vue'),
    },
  ],
})

export default router
