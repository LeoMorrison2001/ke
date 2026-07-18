import type { RouteRecordRaw } from 'vue-router'
import DiaryLayout from './DiaryLayout.vue'
import DiarySectionPage from './pages/DiarySectionPage.vue'
import DiaryTodayPage from './pages/DiaryTodayPage.vue'
import DiaryCalendarPage from './pages/DiaryCalendarPage.vue'

export const diaryRoutes: RouteRecordRaw[] = [
  {
    path: '/applications/xiaoke-diary',
    name: 'xiaoke-diary',
    component: DiaryLayout,
    redirect: { name: 'xiaoke-diary-today' },
    children: [
      {
        path: 'today',
        name: 'xiaoke-diary-today',
        component: DiaryTodayPage
      },
      {
        path: 'calendar',
        name: 'xiaoke-diary-calendar',
        component: DiaryCalendarPage
      },
      {
        path: 'entry/:entryDate',
        name: 'xiaoke-diary-entry',
        component: DiaryTodayPage,
        props: (route) => ({ entryDate: route.params.entryDate, readOnly: true })
      },
      {
        path: 'timeline',
        name: 'xiaoke-diary-timeline',
        component: DiarySectionPage,
        props: { title: '时间线' }
      },
      {
        path: 'favorites',
        name: 'xiaoke-diary-favorites',
        component: DiarySectionPage,
        props: { title: '收藏' }
      }
    ]
  }
]
