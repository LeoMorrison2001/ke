<script setup lang="ts">
import { Bookmark, Cloud, MapPin, Zap } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ entryDate?: string; readOnly?: boolean }>()

interface MoodOption {
  code: 'happy' | 'calm' | 'content' | 'low' | 'irritable' | 'tired'
  emoji: string
  label: string
}

interface WeatherOption {
  code:
    | 'sunny'
    | 'partly_cloudy'
    | 'cloudy'
    | 'fog'
    | 'light_rain'
    | 'rain'
    | 'thunderstorm'
    | 'snow'
  emoji: string
  label: string
}

const moods: MoodOption[] = [
  { code: 'happy', emoji: '😁', label: '开心' },
  { code: 'calm', emoji: '😌', label: '平静' },
  { code: 'content', emoji: '🥰', label: '满足' },
  { code: 'low', emoji: '😔', label: '低落' },
  { code: 'irritable', emoji: '😟', label: '烦躁' },
  { code: 'tired', emoji: '🥱', label: '疲惫' }
]

const weatherOptions: WeatherOption[] = [
  { code: 'sunny', emoji: '☀️', label: '晴' },
  { code: 'partly_cloudy', emoji: '🌤️', label: '少云' },
  { code: 'cloudy', emoji: '☁️', label: '多云' },
  { code: 'fog', emoji: '🌫️', label: '雾' },
  { code: 'light_rain', emoji: '🌦️', label: '小雨' },
  { code: 'rain', emoji: '🌧️', label: '中雨' },
  { code: 'thunderstorm', emoji: '⛈️', label: '雷雨' },
  { code: 'snow', emoji: '❄️', label: '雪' }
]

const weekdayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const toLocalDate = (dateText?: string): Date => {
  if (!dateText) return new Date()
  const [year, month, date] = dateText.split('-').map(Number)
  const parsedDate = new Date(year, month - 1, date)
  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate
}

const diaryDate = computed(() => toLocalDate(props.entryDate))
const diaryEntryDate = computed(() => {
  const value = diaryDate.value
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
})
const diaryContent = ref('')
const selectedMood = ref<MoodOption>(moods[0])
const selectedWeather = ref<WeatherOption>(weatherOptions[0])
const isMoodPickerOpen = ref(false)
const locationText = ref('')
const isWeatherPickerOpen = ref(false)
const moodPicker = ref<HTMLElement>()
const weatherPicker = ref<HTMLElement>()
const saveStatus = ref<'loading' | 'unsaved' | 'saving' | 'saved' | 'error'>('loading')
const saveError = ref('')
const hasExistingEntry = ref(false)
const isFavorite = ref(false)
const isFavoriteUpdating = ref(false)
let isDiaryReady = false
let isSaving = false
let savedSnapshot: DiarySnapshot | undefined
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let maxWaitTimer: ReturnType<typeof setTimeout> | undefined

interface DiarySnapshot {
  content: string
  locationText: string
  weatherCode: WeatherOption['code']
  moodCode: MoodOption['code']
}

const formattedDate = computed(() => {
  const value = diaryDate.value
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const date = String(value.getDate()).padStart(2, '0')
  return `${year}年${month}月${date}日 ${weekdayNames[value.getDay()]}`
})

const characterCount = computed(() => Array.from(diaryContent.value).length)
const saveStatusText = computed(() => {
  if (props.readOnly) return hasExistingEntry.value ? '只读查看' : '暂无日记'
  if (saveStatus.value === 'loading') return '正在读取'
  if (saveStatus.value === 'unsaved') return '未保存'
  if (saveStatus.value === 'saving') return '保存中'
  if (saveStatus.value === 'error') return '保存失败'
  return '已保存'
})

const getSnapshot = (): DiarySnapshot => ({
  content: diaryContent.value,
  locationText: locationText.value,
  weatherCode: selectedWeather.value.code,
  moodCode: selectedMood.value.code
})

const isSameSnapshot = (left: DiarySnapshot | undefined, right: DiarySnapshot): boolean =>
  left !== undefined &&
  left.content === right.content &&
  left.locationText === right.locationText &&
  left.weatherCode === right.weatherCode &&
  left.moodCode === right.moodCode

const clearSaveTimers = (): void => {
  clearTimeout(debounceTimer)
  clearTimeout(maxWaitTimer)
  debounceTimer = undefined
  maxWaitTimer = undefined
}

const saveDiary = async (): Promise<void> => {
  clearSaveTimers()
  if (!isDiaryReady || isSaving) return

  const snapshot = getSnapshot()
  if (isSameSnapshot(savedSnapshot, snapshot)) {
    saveStatus.value = 'saved'
    return
  }

  isSaving = true
  saveStatus.value = 'saving'
  saveError.value = ''
  try {
    await window.api.diary.saveEntry({ entryDate: diaryEntryDate.value, ...snapshot })
    savedSnapshot = snapshot
    saveStatus.value = isSameSnapshot(savedSnapshot, getSnapshot()) ? 'saved' : 'unsaved'
  } catch (error) {
    saveStatus.value = 'error'
    saveError.value = error instanceof Error ? error.message : '自动保存失败，请稍后重试。'
  } finally {
    isSaving = false
    if (!isSameSnapshot(savedSnapshot, getSnapshot()) && saveStatus.value !== 'error') {
      scheduleSave(1000)
    }
  }
}

const scheduleSave = (delay: number): void => {
  if (!isDiaryReady || props.readOnly) return
  saveStatus.value = 'unsaved'
  saveError.value = ''
  clearTimeout(debounceTimer)
  if (delay === 0) {
    void saveDiary()
    return
  }

  debounceTimer = setTimeout(() => void saveDiary(), delay)
  maxWaitTimer ??= setTimeout(() => void saveDiary(), 5000)
}

const flushSave = (): void => {
  if (props.readOnly) return
  if (!isSameSnapshot(savedSnapshot, getSnapshot())) void saveDiary()
}

const toggleFavorite = async (): Promise<void> => {
  if (!props.readOnly || !hasExistingEntry.value || isFavoriteUpdating.value) return

  isFavoriteUpdating.value = true
  try {
    const entry = await window.api.diary.toggleEntryFavorite(diaryEntryDate.value)
    isFavorite.value = entry.isFavorite
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '更新收藏状态失败，请稍后重试。'
  } finally {
    isFavoriteUpdating.value = false
  }
}

const selectMood = (mood: MoodOption): void => {
  selectedMood.value = mood
  isMoodPickerOpen.value = false
  scheduleSave(0)
}

const toggleMoodPicker = (): void => {
  isMoodPickerOpen.value = !isMoodPickerOpen.value
  isWeatherPickerOpen.value = false
}

const selectWeather = (weather: WeatherOption): void => {
  selectedWeather.value = weather
  isWeatherPickerOpen.value = false
  scheduleSave(0)
}

const toggleWeatherPicker = (): void => {
  isWeatherPickerOpen.value = !isWeatherPickerOpen.value
  isMoodPickerOpen.value = false
}

const closePickersOnOutsideClick = (event: MouseEvent): void => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!moodPicker.value?.contains(target)) isMoodPickerOpen.value = false
  if (!weatherPicker.value?.contains(target)) isWeatherPickerOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', closePickersOnOutsideClick)
  const initializeDiary = async (): Promise<void> => {
    try {
      const entry = props.entryDate
        ? await window.api.diary.getEntry(diaryEntryDate.value)
        : await window.api.diary.ensureEntry(diaryEntryDate.value)
      if (entry) {
        hasExistingEntry.value = true
        isFavorite.value = entry.isFavorite
        diaryContent.value = entry.content
        locationText.value = entry.locationText
        selectedWeather.value = weatherOptions.find((item) => item.code === entry.weatherCode) ?? weatherOptions[0]
        selectedMood.value = moods.find((item) => item.code === entry.moodCode) ?? moods[0]
      }
      savedSnapshot = getSnapshot()
      saveStatus.value = entry ? 'saved' : 'unsaved'
      isDiaryReady = true
    } catch (error) {
      saveStatus.value = 'error'
      saveError.value = error instanceof Error ? error.message : '读取日记失败，请稍后重试。'
    }
  }
  void initializeDiary()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closePickersOnOutsideClick)
  flushSave()
  clearSaveTimers()
})

</script>

<template>
  <section class="diary-today">
    <header class="diary-today__header">
      <div>
        <h2>{{ formattedDate }}</h2>
        <div class="diary-today__details">
          <label class="detail-chip location-input">
            <MapPin :size="15" />
            <input
              v-model="locationText"
              placeholder="输入位置"
              aria-label="位置"
              :disabled="props.readOnly"
              @input="scheduleSave(800)"
            />
          </label>
          <div ref="weatherPicker" class="weather-picker">
            <button
              class="detail-chip weather-trigger"
              type="button"
              :aria-expanded="isWeatherPickerOpen"
              :disabled="props.readOnly"
              @click="toggleWeatherPicker"
            >
              <span class="picker-emoji">{{ selectedWeather.emoji }}</span>{{ selectedWeather.label }}
            </button>
            <div v-if="isWeatherPickerOpen" class="weather-options" role="menu" aria-label="选择天气">
              <button
                v-for="weather in weatherOptions"
                :key="weather.label"
                type="button"
                role="menuitem"
                :class="{ selected: weather.label === selectedWeather?.label }"
                @click="selectWeather(weather)"
              >
                <span>{{ weather.emoji }}</span>
                {{ weather.label }}
              </button>
            </div>
          </div>
          <div ref="moodPicker" class="mood-picker">
            <button
              class="detail-chip mood-trigger"
              type="button"
              :aria-expanded="isMoodPickerOpen"
              :disabled="props.readOnly"
              @click="toggleMoodPicker"
            >
              <span class="picker-emoji">{{ selectedMood.emoji }}</span>
              {{ selectedMood.label }}
            </button>
            <div v-if="isMoodPickerOpen" class="mood-options" role="menu" aria-label="选择心情">
              <button
                v-for="mood in moods"
                :key="mood.label"
                type="button"
                role="menuitem"
                :class="{ selected: mood.label === selectedMood.label }"
                @click="selectMood(mood)"
              >
                <span>{{ mood.emoji }}</span>
                {{ mood.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="diary-today__status">
        <button
          v-if="props.readOnly && hasExistingEntry"
          class="bookmark-button"
          type="button"
          :aria-label="isFavorite ? '取消收藏日记' : '收藏日记'"
          :disabled="isFavoriteUpdating"
          @click="toggleFavorite"
        >
          <Bookmark :size="18" :stroke-width="1.6" :fill="isFavorite ? 'currentColor' : 'none'" />
        </button>
        <span v-if="!props.readOnly" :class="{ 'save-status--error': saveStatus === 'error' }">
          <Cloud :size="14" />{{ saveStatusText }}
        </span>
      </div>
    </header>

    <section class="editor-card">
      <div class="editor-card__body">
        <textarea
          v-model="diaryContent"
          :placeholder="props.readOnly ? '这一天还没有写日记' : '从这里开始记录今天吧...'"
          aria-label="日记内容"
          :readonly="props.readOnly"
          @input="scheduleSave(1000)"
        />
      </div>
      <footer class="editor-card__footer">
        <span><Zap :size="14" />{{ props.readOnly ? '看看过去的日记吧' : '会在停止输入后自动保存' }}</span>
        <span>{{ characterCount }} 字</span>
      </footer>
    </section>
    <p v-if="saveError" class="save-error">{{ saveError }}</p>
  </section>
</template>

<style scoped>
.diary-today {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  padding: 30px 32px 22px;
  gap: 32px;
  flex-direction: column;
}

.diary-today__header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.diary-today__header > div:first-child {
  min-width: 0;
  flex: 1;
}

h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
}

.diary-today__details {
  display: flex;
  margin-top: 20px;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.detail-chip,
.diary-today__status span {
  display: inline-flex;
  min-height: 30px;
  box-sizing: border-box;
  gap: 6px;
  padding: 0 10px;
  align-items: center;
  color: var(--color-text-muted);
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background: var(--color-surface);
}

.detail-chip :deep(svg),
.diary-today__status :deep(svg) {
  color: var(--color-accent-text);
}

.mood-picker,
.weather-picker {
  position: relative;
}

.mood-trigger,
.weather-trigger {
  cursor: pointer;
  font: inherit;
}

.mood-trigger:hover,
.weather-trigger:hover {
  background: var(--color-surface-hover);
}

.mood-trigger:disabled,
.weather-trigger:disabled,
.location-input input:disabled,
textarea:read-only {
  cursor: default;
}

.mood-trigger:disabled:hover,
.weather-trigger:disabled:hover {
  background: var(--color-surface);
}

.location-input {
  width: 140px;
}

.location-input input {
  min-width: 0;
  flex: 1;
  padding: 0;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 13px;
  outline: 0;
  border: 0;
  background: transparent;
}

.location-input input::placeholder {
  color: var(--color-text-subtle);
}

.picker-emoji,
.mood-options button span,
.weather-options button span {
  font-size: 16px;
  line-height: 1;
}

.mood-options,
.weather-options {
  position: absolute;
  z-index: 1;
  top: calc(100% + 8px);
  left: 0;
  display: grid;
  width: 214px;
  padding: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  border-radius: 12px;
  background: var(--color-surface);
  box-shadow: 0 10px 24px rgb(38 47 56 / 14%);
}

.mood-options button,
.weather-options button {
  display: inline-flex;
  height: 32px;
  padding: 0 5px;
  gap: 5px;
  align-items: center;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.mood-options button:hover,
.mood-options button.selected,
.weather-options button:hover,
.weather-options button.selected {
  color: var(--color-accent-text);
  background: var(--color-accent-soft);
}

.diary-today__status {
  display: flex;
  gap: 12px;
  align-items: center;
}

.diary-today__status span {
  min-height: auto;
  padding: 0;
  color: var(--color-accent-text);
  border: 0;
}

.diary-today__status span.save-status--error {
  color: var(--color-danger);
}

.bookmark-button {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-muted);
  cursor: pointer;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.bookmark-button:hover {
  color: var(--color-accent-text);
  background: var(--color-surface-hover);
}

.editor-card {
  display: grid;
  min-height: 400px;
  flex: 1;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}

.editor-card__body {
  display: flex;
  min-height: 0;
  padding: 24px 28px;
}

textarea {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  resize: none;
  color: var(--color-text);
  font: inherit;
  font-size: 16px;
  line-height: 1.8;
  outline: none;
  border: 0;
  background: transparent;
}

textarea::placeholder {
  color: var(--color-text-subtle);
}

textarea::-webkit-scrollbar {
  width: 5px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #a9a9a9;
}

textarea::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.editor-card__footer {
  display: flex;
  min-height: 40px;
  padding: 0 18px;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-subtle);
  font-size: 12px;
  border-top: 1px solid var(--color-border-subtle);
}

.editor-card__footer span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.editor-card__footer :deep(svg) {
  color: var(--color-accent-text);
}

.save-error {
  margin: -20px 0 0;
  color: var(--color-danger);
  font-size: 12px;
}

@media (max-width: 700px) {
  .diary-today {
    padding: 24px 20px 18px;
  }

  .diary-today__header {
    flex-direction: column;
  }

  .location-input {
    width: min(140px, 100%);
  }

  h2 {
    font-size: 26px;
  }
}
</style>
