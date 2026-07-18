import type { RouteRecordRaw } from 'vue-router'
import MemoryLayout from './MemoryLayout.vue'
import ConversationMemoryPage from './pages/ConversationMemoryPage.vue'
import MemorySectionPage from './pages/MemorySectionPage.vue'
import UserInformationPage from './pages/UserInformationPage.vue'

export const memoryRoutes: RouteRecordRaw[] = [
  {
    path: '/memory',
    name: 'xiaoke-memory',
    component: MemoryLayout,
    redirect: { name: 'xiaoke-memory-profile' },
    children: [
      {
        path: 'profile',
        name: 'xiaoke-memory-profile',
        component: UserInformationPage
      },
      {
        path: 'long-term',
        name: 'xiaoke-memory-long-term',
        component: MemorySectionPage,
        props: { title: '长期记忆' }
      },
      {
        path: 'short-term',
        name: 'xiaoke-memory-short-term',
        component: MemorySectionPage,
        props: { title: '短期记忆' }
      },
      {
        path: 'conversation',
        name: 'xiaoke-memory-conversation',
        component: ConversationMemoryPage
      },
      {
        path: 'scheduled',
        name: 'xiaoke-memory-scheduled',
        component: MemorySectionPage,
        props: { title: '定时记忆' }
      }
    ]
  }
]
