import { createRouter, createWebHashHistory } from 'vue-router'
import AppsView from '../views/AppsView.vue'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import XiaokeMemoryView from '../views/XiaokeMemoryView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingView
    },
    {
      path: '/applications',
      name: 'applications',
      component: AppsView
    },
    {
      path: '/applications/xiaoke-memory',
      name: 'xiaoke-memory',
      redirect: { name: 'xiaoke-memory-section', params: { section: 'profile' } }
    },
    {
      path: '/applications/xiaoke-memory/:section(profile|long-term|short-term|conversation|scheduled)',
      name: 'xiaoke-memory-section',
      component: XiaokeMemoryView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

router.beforeEach(async (to) => {
  const activeUser = await window.api.user.getActive()
  if (!activeUser && to.name !== 'onboarding') return { name: 'onboarding' }
  if (activeUser && to.name === 'onboarding' && to.query.mode !== 'add-user')
    return { name: 'home' }
  return true
})

export default router
