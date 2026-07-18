<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

type DiaryMoodCode = 'happy' | 'calm' | 'content' | 'low' | 'irritable' | 'tired'

interface CalendarDay {
  date: Date
  dateText: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  mood?: DiaryMoodCode
}

const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']
const moodEmojis: Record<DiaryMoodCode, string> = {
  happy: '😁',
  calm: '😌',
  content: '🥰',
  low: '😔',
  irritable: '😟',
  tired: '🥱'
}

const router = useRouter()
const today = new Date()
const displayedMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const moodByDate = ref<Record<string, DiaryMoodCode>>({})
const loadError = ref('')
const tipMessage = ref('')
let tipTimer: ReturnType<typeof setTimeout> | undefined

const toDateText = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const monthText = computed(
  () => `${displayedMonth.value.getFullYear()}年${displayedMonth.value.getMonth() + 1}月`
)
const monthKey = computed(
  () =>
    `${displayedMonth.value.getFullYear()}-${String(displayedMonth.value.getMonth() + 1).padStart(2, '0')}`
)

const calendarDays = computed<CalendarDay[]>(() => {
  const firstDay = displayedMonth.value
  const firstWeekday = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstWeekday)
  const todayText = toDateText(today)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    const dateText = toDateText(date)
    return {
      date,
      dateText,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === displayedMonth.value.getMonth(),
      isToday: dateText === todayText,
      mood: moodByDate.value[dateText]
    }
  })
})

const loadEntries = async (): Promise<void> => {
  const requestedMonth = monthKey.value
  loadError.value = ''
  try {
    const entries = await window.api.diary.listCalendarEntries(requestedMonth)
    if (requestedMonth !== monthKey.value) return
    moodByDate.value = Object.fromEntries(entries.map((entry) => [entry.entryDate, entry.moodCode]))
  } catch (error) {
    if (requestedMonth !== monthKey.value) return
    moodByDate.value = {}
    loadError.value = error instanceof Error ? error.message : '日历加载失败，请稍后重试。'
  }
}

const moveMonth = (offset: number): void => {
  displayedMonth.value = new Date(
    displayedMonth.value.getFullYear(),
    displayedMonth.value.getMonth() + offset,
    1
  )
}

const returnToToday = (): void => {
  displayedMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
}

const openDiary = (day: CalendarDay): void => {
  if (!day.mood) {
    tipMessage.value = '今天没有写日记哦'
    clearTimeout(tipTimer)
    tipTimer = setTimeout(() => {
      tipMessage.value = ''
      tipTimer = undefined
    }, 2200)
    return
  }

  void router.push({ name: 'xiaoke-diary-entry', params: { entryDate: day.dateText } })
}

watch(monthKey, () => void loadEntries(), { immediate: true })

onBeforeUnmount(() => clearTimeout(tipTimer))
</script>

<template>
  <section class="diary-calendar">
    <header class="diary-calendar__header">
      <h2>{{ monthText }}</h2>
      <div class="calendar-controls" aria-label="切换月份">
        <button type="button" aria-label="上个月" @click="moveMonth(-1)">
          <ChevronLeft :size="18" :stroke-width="1.6" />
        </button>
        <button type="button" class="today-button" @click="returnToToday">今天</button>
        <button type="button" aria-label="下个月" @click="moveMonth(1)">
          <ChevronRight :size="18" :stroke-width="1.6" />
        </button>
      </div>
    </header>

    <section class="calendar-grid" aria-label="日记日历">
      <div v-for="weekday in weekdayNames" :key="weekday" class="weekday">{{ weekday }}</div>
      <button
        v-for="day in calendarDays"
        :key="day.dateText"
        type="button"
        :class="[
          'calendar-day',
          {
            'calendar-day--outside': !day.isCurrentMonth,
            'calendar-day--today': day.isToday
          }
        ]"
        :aria-label="`${day.dateText}，双击查看日记`"
        @dblclick="openDiary(day)"
      >
        <span class="calendar-day__number">{{ day.dayNumber }}</span>
        <span v-if="day.mood" class="calendar-day__mood" :title="`${day.dateText} 的日记`">
          {{ moodEmojis[day.mood] }}
        </span>
      </button>
    </section>

    <footer class="diary-calendar__footer">
      <span>双击任意日期，查看当天日记</span>
      <span v-if="loadError" class="calendar-error">{{ loadError }}</span>
    </footer>
    <Transition name="calendar-tip">
      <p v-if="tipMessage" class="calendar-tip" role="status">{{ tipMessage }}</p>
    </Transition>
  </section>
</template>

<style scoped>
.diary-calendar {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  padding: 30px 32px 16px;
  gap: 18px;
  flex-direction: column;
}

.diary-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
}

.calendar-controls {
  display: flex;
  gap: 8px;
}

.calendar-controls button {
  display: grid;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-muted);
  cursor: pointer;
  place-items: center;
  font: inherit;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-surface);
}

.calendar-controls button:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.calendar-controls .today-button {
  width: auto;
  padding: 0 13px;
}

.calendar-grid {
  display: grid;
  min-height: 504px;
  flex: 1;
  overflow: hidden;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: 42px repeat(6, minmax(74px, 1fr));
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

.weekday {
  display: grid;
  color: var(--color-text-subtle);
  place-items: center;
  font-size: 13px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.calendar-day {
  position: relative;
  min-width: 0;
  padding: 18px 20px;
  color: var(--color-text);
  cursor: default;
  font: inherit;
  font-size: 14px;
  text-align: left;
  border: 0;
  border-right: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  background: transparent;
}

.calendar-day:nth-child(7n) {
  border-right: 0;
}

.calendar-day:hover {
  background: var(--color-surface-hover);
}

.calendar-day--outside {
  color: var(--color-text-subtle);
}

.calendar-day__number {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
}

.calendar-day--today .calendar-day__number {
  color: var(--color-calendar-today-text);
  font-weight: 700;
  background: var(--color-calendar-today-background);
}

.calendar-day__mood {
  position: absolute;
  right: 12px;
  bottom: 10px;
  font-size: 19px;
  line-height: 1;
}

.diary-calendar__footer {
  display: flex;
  min-height: 22px;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-subtle);
  font-size: 12px;
}

.calendar-error {
  color: var(--color-danger);
}

.calendar-tip {
  position: fixed;
  z-index: 20;
  bottom: 42px;
  left: 50%;
  margin: 0;
  padding: 10px 16px;
  color: var(--color-tip-text);
  font-size: 13px;
  border-radius: 9px;
  background: var(--color-tip-background);
  box-shadow: 0 8px 20px rgb(0 0 0 / 16%);
  transform: translateX(-50%);
}

.calendar-tip-enter-active,
.calendar-tip-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.calendar-tip-enter-from,
.calendar-tip-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 700px) {
  .diary-calendar {
    padding: 24px 20px 14px;
  }

  h2 {
    font-size: 26px;
  }

  .calendar-day {
    padding: 12px 8px;
  }
}
</style>
