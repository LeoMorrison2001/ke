import { createRouter, createWebHashHistory } from 'vue-router'
import AppsPage from '../modules/app-center/AppsPage.vue'
import PluginHostPage from '../modules/plugin-host/PluginHostPage.vue'
import PluginManagerPage from '../modules/plugin-host/PluginManagerPage.vue'
import { diaryRoutes } from '../modules/diary/diary.routes'
import { memoryRoutes } from '../modules/memory/memory.routes'
import HomePage from '../pages/HomePage.vue'
import OnboardingPage from '../pages/OnboardingPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingPage
    },
    {
      path: '/applications',
      name: 'applications',
      component: AppsPage
    },
    {
      path: '/plugins/:pluginId',
      name: 'plugin-host',
      component: PluginHostPage
    },
    { path: '/plugins', name: 'plugin-manager', component: PluginManagerPage },
    ...memoryRoutes,
    ...diaryRoutes,
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage
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
