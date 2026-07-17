import { createRouter, createWebHashHistory } from 'vue-router'
import AppsView from '../views/AppsView.vue'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import OnboardingView from '../views/OnboardingView.vue'

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
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

router.beforeEach(async (to) => {
  const activeUser = await window.api.user.getActive()
  if (!activeUser && to.name !== 'onboarding') return { name: 'onboarding' }
  if (activeUser && to.name === 'onboarding') return { name: 'home' }
  return true
})

export default router
