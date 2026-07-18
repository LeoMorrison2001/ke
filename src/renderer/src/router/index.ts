import { createRouter, createWebHashHistory } from 'vue-router'
import AppsView from '../views/AppsView.vue'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import OnboardingView from '../views/OnboardingView.vue'
import XiaokeMemoryView from '../views/XiaokeMemoryView.vue'
import XiaokeDiaryView from '../views/XiaokeDiaryView.vue'
import MemorySectionView from '../views/MemorySectionView.vue'
import UserInformationPanel from '../views/UserInformationPanel.vue'
import ConversationMemoryPanel from '../views/ConversationMemoryPanel.vue'
import DiarySectionView from '../views/DiarySectionView.vue'
import DiaryTodayView from '../views/DiaryTodayView.vue'

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
      component: XiaokeMemoryView,
      redirect: { name: 'xiaoke-memory-profile' },
      children: [
        {
          path: 'profile',
          name: 'xiaoke-memory-profile',
          component: UserInformationPanel
        },
        {
          path: 'long-term',
          name: 'xiaoke-memory-long-term',
          component: MemorySectionView,
          props: { title: '长期记忆' }
        },
        {
          path: 'short-term',
          name: 'xiaoke-memory-short-term',
          component: MemorySectionView,
          props: { title: '短期记忆' }
        },
        {
          path: 'conversation',
          name: 'xiaoke-memory-conversation',
          component: ConversationMemoryPanel
        },
        {
          path: 'scheduled',
          name: 'xiaoke-memory-scheduled',
          component: MemorySectionView,
          props: { title: '定时记忆' }
        }
      ]
    },
    {
      path: '/applications/xiaoke-diary',
      name: 'xiaoke-diary',
      component: XiaokeDiaryView,
      redirect: { name: 'xiaoke-diary-today' },
      children: [
        {
          path: 'today',
          name: 'xiaoke-diary-today',
          component: DiaryTodayView
        },
        {
          path: 'calendar',
          name: 'xiaoke-diary-calendar',
          component: DiarySectionView,
          props: { title: '日历' }
        },
        {
          path: 'timeline',
          name: 'xiaoke-diary-timeline',
          component: DiarySectionView,
          props: { title: '时间线' }
        },
        {
          path: 'favorites',
          name: 'xiaoke-diary-favorites',
          component: DiarySectionView,
          props: { title: '收藏' }
        }
      ]
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
