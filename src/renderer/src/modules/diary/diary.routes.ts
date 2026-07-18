import type { RouteRecordRaw } from 'vue-router'
import DiaryLayout from './DiaryLayout.vue'
import DiaryTodayPage from './pages/DiaryTodayPage.vue'
import DiaryCalendarPage from './pages/DiaryCalendarPage.vue'
import DiaryTimelinePage from './pages/DiaryTimelinePage.vue'

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
        component: DiaryTimelinePage
      },
      {
        path: 'favorites',
        name: 'xiaoke-diary-favorites',
        component: DiaryTimelinePage,
        props: { favoriteOnly: true }
      }
    ]
  }
]
