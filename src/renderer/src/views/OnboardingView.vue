<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type Gender = 'male' | 'female'
type Step = 'welcome' | 'name' | 'preferredName' | 'gender' | 'birthDate'

const router = useRouter()
const route = useRoute()
const steps: Step[] = ['welcome', 'name', 'preferredName', 'gender', 'birthDate']
const step = ref<Step>('welcome')
const name = ref('')
const gender = ref<Gender>()
const birthDate = ref('')
const preferredName = ref('')
const errorMessage = ref('')
const isSaving = ref(false)
const isCalendarOpen = ref(false)
const calendarCursor = ref(new Date())
const calendarField = ref<HTMLElement>()

const stepIndex = computed(() => steps.indexOf(step.value))
const isWelcome = computed(() => step.value === 'welcome')
const isAddingUser = computed(() => route.query.mode === 'add-user')
const isLastStep = computed(() => step.value === 'birthDate')
const canGoBack = computed(() => !isWelcome.value && step.value !== 'name')
const canContinue = computed(() => {
  if (step.value === 'name') return Boolean(name.value.trim())
  if (step.value === 'preferredName') return Boolean(preferredName.value.trim())
  if (step.value === 'gender') return gender.value !== undefined
  if (step.value === 'birthDate') return Boolean(birthDate.value)
  return true
})
const currentYear = new Date().getFullYear()
const calendarYears = Array.from({ length: currentYear - 1919 }, (_, index) => currentYear - index)
const calendarMonths = Array.from({ length: 12 }, (_, index) => index)
const calendarTitle = computed(
  () => `${calendarCursor.value.getFullYear()} 年 ${calendarCursor.value.getMonth() + 1} 月`
)
const calendarDays = computed(() => {
  const year = calendarCursor.value.getFullYear()
  const month = calendarCursor.value.getMonth()
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const firstVisibleDate = new Date(year, month, 1 - firstDayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDate)
    date.setDate(firstVisibleDate.getDate() + index)
    return {
      date,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      key: formatDateValue(date)
    }
  })
})

const getNextStep = (): Step => steps[stepIndex.value + 1]
const nextStep = (): void => {
  errorMessage.value = ''
  if (!canContinue.value) {
    errorMessage.value = '这个问题还没有回答哦。'
    return
  }
  step.value = getNextStep()
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const changeCalendarMonth = (delta: number): void => {
  calendarCursor.value = new Date(
    calendarCursor.value.getFullYear(),
    calendarCursor.value.getMonth() + delta,
    1
  )
}

const updateCalendarYear = (event: Event): void => {
  calendarCursor.value = new Date(
    Number((event.target as HTMLSelectElement).value),
    calendarCursor.value.getMonth(),
    1
  )
}

const updateCalendarMonth = (event: Event): void => {
  calendarCursor.value = new Date(
    calendarCursor.value.getFullYear(),
    Number((event.target as HTMLSelectElement).value),
    1
  )
}

const openCalendar = (): void => {
  if (!isCalendarOpen.value && birthDate.value) {
    calendarCursor.value = new Date(`${birthDate.value}T00:00:00`)
  }
  isCalendarOpen.value = !isCalendarOpen.value
}

const selectDate = (date: Date): void => {
  birthDate.value = formatDateValue(date)
  calendarCursor.value = new Date(date)
  isCalendarOpen.value = false
}

const closeCalendarOnOutsideClick = (event: PointerEvent): void => {
  if (calendarField.value?.contains(event.target as Node)) return
  isCalendarOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', closeCalendarOnOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeCalendarOnOutsideClick)
})

const previousStep = (): void => {
  errorMessage.value = ''
  isCalendarOpen.value = false
  step.value = steps[stepIndex.value - 1]
}

const cancelAddingUser = async (): Promise<void> => {
  if (!isAddingUser.value) return
  await router.replace({ name: 'xiaoke-memory-section', params: { section: 'profile' } })
}

const createUser = async (): Promise<void> => {
  if (!canContinue.value || isSaving.value) return
  if (!gender.value) {
    errorMessage.value = '请选择你的性别。'
    return
  }
  errorMessage.value = ''
  isSaving.value = true
  try {
    const input = {
      name: name.value,
      gender: gender.value,
      birthDate: birthDate.value,
      preferredName: preferredName.value
    }
    if (isAddingUser.value) {
      await window.api.user.create(input)
      await router.replace({ name: 'xiaoke-memory-section', params: { section: 'profile' } })
    } else {
      await window.api.user.createInitial(input)
      await router.replace({ name: 'home' })
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '出了点小问题，请再试一次。'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <main class="onboarding-view">
    <section class="onboarding-content" :class="{ 'is-welcome': isWelcome }">
      <div v-if="!isWelcome" class="progress" aria-label="配置进度">
        <span v-for="item in steps.slice(1)" :key="item" :class="{ active: item === step }"></span>
      </div>

      <div v-if="isWelcome" class="welcome-content">
        <h1>你好呀！我叫小可，很高兴认识你。</h1>
        <p>接下来花一点时间，让我先了解一下你吧。</p>
        <div :class="['welcome-actions', { 'with-cancel': isAddingUser }]">
          <button v-if="isAddingUser" class="back-button" type="button" @click="cancelAddingUser">
            取消
          </button>
          <button class="primary-button" type="button" @click="nextStep">开始</button>
        </div>
      </div>

      <form v-else @submit.prevent="isLastStep ? createUser() : nextStep()">
        <template v-if="step === 'name'">
          <h1>你叫什么名字呢？</h1>
          <label class="sr-only" for="name">你的名字</label>
          <input id="name" v-model="name" autofocus maxlength="40" placeholder="请输入你的名字" />
        </template>

        <template v-else-if="step === 'preferredName'">
          <h1>你想让我怎么称呼你呢？</h1>
          <label class="sr-only" for="preferred-name">小可对你的称呼</label>
          <input
            id="preferred-name"
            v-model="preferredName"
            autofocus
            maxlength="40"
            placeholder="例如：小明、老板、宝贝"
          />
        </template>

        <template v-else-if="step === 'gender'">
          <h1>你是男生还是女生呢？</h1>
          <div class="choice-group" role="radiogroup" aria-label="性别">
            <button
              :class="{ selected: gender === 'male' }"
              role="radio"
              :aria-checked="gender === 'male'"
              type="button"
              @click="gender = 'male'"
            >
              男生
            </button>
            <button
              :class="{ selected: gender === 'female' }"
              role="radio"
              :aria-checked="gender === 'female'"
              type="button"
              @click="gender = 'female'"
            >
              女生
            </button>
          </div>
        </template>

        <template v-else>
          <h1>你什么时候出生的呢？</h1>
          <div ref="calendarField" class="calendar-field">
            <button
              :aria-expanded="isCalendarOpen"
              aria-haspopup="dialog"
              class="calendar-trigger"
              type="button"
              @click="openCalendar"
            >
              <span :class="{ placeholder: !birthDate }">{{ birthDate || '请选择出生日期' }}</span>
              <CalendarDays :size="18" :stroke-width="1.8" />
            </button>

            <section
              v-if="isCalendarOpen"
              aria-label="选择出生日期"
              class="calendar-popover"
              role="dialog"
            >
              <header class="calendar-header">
                <button aria-label="上一个月" type="button" @click="changeCalendarMonth(-1)">
                  <ChevronLeft :size="18" :stroke-width="1.8" />
                </button>
                <div class="calendar-selects">
                  <select
                    :value="calendarCursor.getFullYear()"
                    aria-label="年份"
                    @change="updateCalendarYear"
                  >
                    <option v-for="year in calendarYears" :key="year" :value="year">
                      {{ year }} 年
                    </option>
                  </select>
                  <select
                    :value="calendarCursor.getMonth()"
                    aria-label="月份"
                    @change="updateCalendarMonth"
                  >
                    <option v-for="month in calendarMonths" :key="month" :value="month">
                      {{ month + 1 }} 月
                    </option>
                  </select>
                </div>
                <button aria-label="下一个月" type="button" @click="changeCalendarMonth(1)">
                  <ChevronRight :size="18" :stroke-width="1.8" />
                </button>
              </header>
              <p class="sr-only">{{ calendarTitle }}</p>
              <div class="calendar-weekdays" aria-hidden="true">
                <span v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">{{
                  day
                }}</span>
              </div>
              <div class="calendar-days">
                <button
                  v-for="calendarDay in calendarDays"
                  :key="calendarDay.key"
                  :class="{
                    muted: !calendarDay.isCurrentMonth,
                    selected: birthDate === calendarDay.key
                  }"
                  :aria-label="calendarDay.key"
                  type="button"
                  @click="selectDate(calendarDay.date)"
                >
                  {{ calendarDay.day }}
                </button>
              </div>
            </section>
          </div>
        </template>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <div :class="['actions', { 'single-action': !canGoBack }]">
          <button v-if="canGoBack" class="back-button" type="button" @click="previousStep">
            上一步
          </button>
          <button :disabled="!canContinue || isSaving" class="primary-button" type="submit">
            {{ isLastStep ? (isSaving ? '正在准备…' : '完成设置') : '下一步' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style>
.onboarding-view {
  display: grid;
  height: 100%;
  padding: 32px;
  place-items: center;
  color: #252525;
  background: #fff;
}

.onboarding-content {
  box-sizing: border-box;
  width: min(100%, 540px);
}

.onboarding-content:not(.is-welcome) {
  transform: translateY(-64px);
}

.onboarding-content.is-welcome {
  display: grid;
  place-items: center;
}

.welcome-content {
  width: 100%;
  text-align: center;
}

.progress {
  display: flex;
  gap: 7px;
  margin-bottom: 36px;
}

.progress span {
  width: 32px;
  height: 4px;
  border-radius: 99px;
  background: #dedede;
}

.progress span.active {
  background: #4a4a4a;
}

.onboarding-content .eyebrow {
  margin: 0 0 10px;
  color: #6e6e6e;
  font-size: 14px;
  font-weight: 700;
}

.onboarding-content h1 {
  margin: 0;
  color: #252525;
  font-size: 32px;
  line-height: 1.35;
}

.welcome-content > p:not(.eyebrow),
.onboarding-content .description {
  margin: 14px 0 32px;
  color: #6f6f6f;
  line-height: 1.6;
}

.welcome-content > p:not(.eyebrow) {
  margin-bottom: 28px;
}

.welcome-actions {
  display: flex;
  justify-content: center;
}

.welcome-actions.with-cancel {
  gap: 10px;
}

.onboarding-content form {
  display: flex;
  flex-direction: column;
}

.onboarding-content input {
  box-sizing: border-box;
  width: 100%;
  margin-top: 12px;
  padding: 13px 14px;
  color: #252525;
  font: inherit;
  font-size: 16px;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #fff;
}

.onboarding-content input:focus {
  outline: 2px solid #d0d0d0;
  border-color: #8a8a8a;
}

.calendar-field {
  position: relative;
  margin-top: 12px;
}

.calendar-trigger {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 50px;
  padding: 0 14px;
  align-items: center;
  justify-content: space-between;
  color: #252525;
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  text-align: left;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #fff;
}

.calendar-trigger:hover,
.calendar-trigger:focus-visible {
  outline: 2px solid #d0d0d0;
  border-color: #8a8a8a;
}

.calendar-trigger .placeholder {
  color: #6f6f6f;
}

.calendar-popover {
  position: absolute;
  z-index: 3;
  top: calc(100% + 8px);
  left: 0;
  box-sizing: border-box;
  width: 320px;
  padding: 12px;
  color: #252525;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 28px rgb(0 0 0 / 14%);
}

.calendar-header {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  gap: 4px;
  align-items: center;
}

.calendar-header > button {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  align-items: center;
  justify-content: center;
  color: #4a4a4a;
  cursor: pointer;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.calendar-header > button:hover {
  background: #f3f3f3;
}

.calendar-selects {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.calendar-selects select {
  max-width: 96px;
  padding: 5px 4px;
  color: #252525;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  border: 0;
  border-radius: 6px;
  background: transparent;
}

.calendar-selects select:hover,
.calendar-selects select:focus-visible {
  outline: none;
  background: #f3f3f3;
}

.calendar-weekdays,
.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
}

.calendar-weekdays {
  margin-top: 12px;
  color: #6e6e6e;
  font-size: 12px;
}

.calendar-days {
  gap: 2px;
  margin-top: 5px;
}

.calendar-days button {
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  color: #303030;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.calendar-days button:hover {
  background: #f3f3f3;
}

.calendar-days button.muted {
  color: #a5a5a5;
}

.calendar-days button.selected,
.calendar-days button.selected:hover {
  color: #fff;
  background: #252525;
}

.choice-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.onboarding-content .choice-group button {
  padding: 13px 14px;
  color: #4a4a4a;
  cursor: pointer;
  text-align: center;
  font: inherit;
  font-size: 16px;
  border: 1px solid #dedede;
  border-radius: 10px;
  background: #fff;
}

.onboarding-content .choice-group button:hover,
.onboarding-content .choice-group button.selected {
  color: #252525;
  border-color: #bdbdbd;
  background: #f3f3f3;
}

.actions {
  display: flex;
  margin-top: 30px;
  justify-content: space-between;
}

.actions.single-action {
  justify-content: flex-end;
}

.primary-button,
.back-button {
  padding: 12px 18px;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  border-radius: 10px;
}

.primary-button {
  color: var(--color-on-accent);
  border: 0;
  background: var(--color-accent);
}

.primary-button:hover {
  background: var(--color-accent-hover);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.back-button {
  color: #4a4a4a;
  border: 1px solid #dedede;
  background: #fff;
}

.error {
  margin: 14px 0 0;
  color: #c54343;
  font-size: 14px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

html[data-theme='dark'] .onboarding-view {
  color: #e4e8ee;
  background: #141414;
}

html[data-theme='dark'] .onboarding-content h1 {
  color: #e4e8ee;
}

html[data-theme='dark'] .onboarding-content .eyebrow {
  color: #aeb7c3;
}

html[data-theme='dark'] .welcome-content > p:not(.eyebrow),
html[data-theme='dark'] .onboarding-content .description {
  color: #aeb7c3;
}

html[data-theme='dark'] .progress span {
  background: #303030;
}

html[data-theme='dark'] .progress span.active {
  background: #d8dee8;
}

html[data-theme='dark'] .onboarding-content input,
html[data-theme='dark'] .onboarding-content .choice-group button {
  color: #e4e8ee;
  border-color: #303030;
  background: #181818;
  color-scheme: dark;
}

html[data-theme='dark'] .onboarding-content input::placeholder {
  color: #777f8b;
}

html[data-theme='dark'] .calendar-trigger,
html[data-theme='dark'] .calendar-popover {
  color: #e4e8ee;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .calendar-trigger .placeholder,
html[data-theme='dark'] .calendar-weekdays {
  color: #aeb7c3;
}

html[data-theme='dark'] .calendar-header > button,
html[data-theme='dark'] .calendar-selects select,
html[data-theme='dark'] .calendar-days button {
  color: #d8dee8;
}

html[data-theme='dark'] .calendar-header > button:hover,
html[data-theme='dark'] .calendar-selects select:hover,
html[data-theme='dark'] .calendar-selects select:focus-visible,
html[data-theme='dark'] .calendar-days button:hover {
  background: #303030;
}

html[data-theme='dark'] .calendar-days button.muted {
  color: #777f8b;
}

html[data-theme='dark'] .calendar-days button.selected,
html[data-theme='dark'] .calendar-days button.selected:hover {
  color: #141414;
  background: #e4e8ee;
}

html[data-theme='dark'] .onboarding-content .choice-group button:hover,
html[data-theme='dark'] .onboarding-content .choice-group button.selected {
  color: #e4e8ee;
  border-color: #303030;
  background: #303030;
}

html[data-theme='dark'] .back-button {
  color: #d8dee8;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .error {
  color: #f08b8b;
}

@media (max-width: 640px) {
  .choice-group {
    grid-template-columns: 1fr;
  }
}
</style>
