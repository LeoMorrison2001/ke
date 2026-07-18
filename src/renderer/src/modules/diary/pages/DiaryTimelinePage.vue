<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

type DiaryMoodCode = 'happy' | 'calm' | 'content' | 'low' | 'irritable' | 'tired'
type DiaryWeatherCode =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'light_rain'
  | 'rain'
  | 'thunderstorm'
  | 'snow'

interface TimelineEntry {
  entryDate: string
  contentPreview: string
  locationText: string
  weatherCode: DiaryWeatherCode
  moodCode: DiaryMoodCode
}

interface TimelineGroup {
  monthLabel: string
  entries: TimelineEntry[]
}

const PAGE_SIZE = 10
const MAX_RENDERED_ENTRIES = 20
const LOAD_THRESHOLD = 160
const moodEmojis: Record<DiaryMoodCode, string> = {
  happy: '😁',
  calm: '😌',
  content: '🥰',
  low: '😔',
  irritable: '😟',
  tired: '🥱'
}
const moodLabels: Record<DiaryMoodCode, string> = {
  happy: '开心',
  calm: '平静',
  content: '满足',
  low: '低落',
  irritable: '烦躁',
  tired: '疲惫'
}
const weatherLabels: Record<DiaryWeatherCode, string> = {
  sunny: '晴',
  partly_cloudy: '少云',
  cloudy: '多云',
  fog: '雾',
  light_rain: '小雨',
  rain: '中雨',
  thunderstorm: '雷雨',
  snow: '雪'
}

const router = useRouter()
const scrollContainer = ref<HTMLElement>()
const entries = ref<TimelineEntry[]>([])
const isLoading = ref(false)
const isInitialLoading = ref(true)
const hasOlder = ref(true)
const hasNewer = ref(false)
const loadError = ref('')
let isUnmounted = false

const timelineGroups = computed<TimelineGroup[]>(() => {
  const groups = new Map<string, TimelineEntry[]>()
  for (const entry of entries.value) {
    const monthLabel = `${entry.entryDate.slice(0, 4)}年${Number(entry.entryDate.slice(5, 7))}月`
    const group = groups.get(monthLabel) ?? []
    group.push(entry)
    groups.set(monthLabel, group)
  }
  return Array.from(groups, ([monthLabel, groupedEntries]) => ({ monthLabel, entries: groupedEntries }))
})

const getEntryOffset = (entryDate: string): number | undefined => {
  const container = scrollContainer.value
  const element = container?.querySelector<HTMLElement>(`[data-entry-date="${entryDate}"]`)
  return element?.offsetTop
}

const loadInitialEntries = async (): Promise<void> => {
  isInitialLoading.value = true
  loadError.value = ''
  try {
    const page = (await window.api.diary.listTimelineEntries({
      direction: 'older',
      limit: PAGE_SIZE
    })) as TimelineEntry[]
    if (isUnmounted) return
    entries.value = page
    hasOlder.value = page.length === PAGE_SIZE
    hasNewer.value = false
  } catch (error) {
    if (!isUnmounted) loadError.value = error instanceof Error ? error.message : '时间线加载失败，请稍后重试。'
  } finally {
    if (!isUnmounted) isInitialLoading.value = false
  }
}

const loadOlderEntries = async (): Promise<void> => {
  const oldest = entries.value.at(-1)
  if (!oldest || isLoading.value || !hasOlder.value) return

  isLoading.value = true
  loadError.value = ''
  try {
    const page = (await window.api.diary.listTimelineEntries({
      cursorDate: oldest.entryDate,
      direction: 'older',
      limit: PAGE_SIZE
    })) as TimelineEntry[]
    if (isUnmounted) return

    const overflow = Math.max(0, entries.value.length + page.length - MAX_RENDERED_ENTRIES)
    const anchorDate = overflow > 0 ? entries.value[overflow]?.entryDate : undefined
    const anchorOffsetBefore = anchorDate ? getEntryOffset(anchorDate) : undefined
    entries.value = [...entries.value, ...page].slice(overflow)
    hasOlder.value = page.length === PAGE_SIZE
    if (overflow > 0) hasNewer.value = true

    await nextTick()
    if (anchorDate && anchorOffsetBefore !== undefined) {
      const anchorOffsetAfter = getEntryOffset(anchorDate)
      if (anchorOffsetAfter !== undefined && scrollContainer.value) {
        scrollContainer.value.scrollTop += anchorOffsetAfter - anchorOffsetBefore
      }
    }
  } catch (error) {
    if (!isUnmounted) loadError.value = error instanceof Error ? error.message : '加载更早日记失败，请稍后重试。'
  } finally {
    if (!isUnmounted) isLoading.value = false
  }
}

const loadNewerEntries = async (): Promise<void> => {
  const newest = entries.value[0]
  if (!newest || isLoading.value || !hasNewer.value) return

  isLoading.value = true
  loadError.value = ''
  try {
    const page = (await window.api.diary.listTimelineEntries({
      cursorDate: newest.entryDate,
      direction: 'newer',
      limit: PAGE_SIZE
    })) as TimelineEntry[]
    if (isUnmounted) return

    const anchorOffsetBefore = getEntryOffset(newest.entryDate)
    const combinedEntries = [...page, ...entries.value]
    const overflow = Math.max(0, combinedEntries.length - MAX_RENDERED_ENTRIES)
    entries.value = overflow > 0 ? combinedEntries.slice(0, -overflow) : combinedEntries
    hasNewer.value = page.length === PAGE_SIZE
    if (overflow > 0) hasOlder.value = true

    await nextTick()
    if (anchorOffsetBefore !== undefined) {
      const anchorOffsetAfter = getEntryOffset(newest.entryDate)
      if (anchorOffsetAfter !== undefined && scrollContainer.value) {
        scrollContainer.value.scrollTop += anchorOffsetAfter - anchorOffsetBefore
      }
    }
  } catch (error) {
    if (!isUnmounted) loadError.value = error instanceof Error ? error.message : '加载更新日记失败，请稍后重试。'
  } finally {
    if (!isUnmounted) isLoading.value = false
  }
}

const handleScroll = (): void => {
  const container = scrollContainer.value
  if (!container || isLoading.value || isInitialLoading.value) return
  if (container.scrollTop <= LOAD_THRESHOLD) {
    void loadNewerEntries()
    return
  }
  if (container.scrollHeight - container.clientHeight - container.scrollTop <= LOAD_THRESHOLD) {
    void loadOlderEntries()
  }
}

const getDayParts = (entryDate: string): { day: string; weekday: string } => {
  const [year, month, day] = entryDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return {
    day: String(day),
    weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  }
}

const openDiary = (entryDate: string): void => {
  void router.push({
    name: 'xiaoke-diary-entry',
    params: { entryDate },
    query: { from: 'timeline' }
  })
}

onMounted(() => void loadInitialEntries())
onBeforeUnmount(() => {
  isUnmounted = true
})
</script>

<template>
  <section ref="scrollContainer" class="diary-timeline" @scroll="handleScroll">
    <header class="diary-timeline__header">
      <h2>时间线</h2>
      <p>回看那些被认真记录的日子</p>
    </header>

    <p v-if="isInitialLoading" class="timeline-state">正在加载日记…</p>
    <p v-else-if="loadError && entries.length === 0" class="timeline-state timeline-state--error">
      {{ loadError }}
    </p>
    <p v-else-if="entries.length === 0" class="timeline-state">还没有写过日记</p>

    <div v-else class="timeline-list">
      <p v-if="isLoading && hasNewer" class="timeline-loading">正在加载更新日记…</p>
      <section v-for="group in timelineGroups" :key="group.monthLabel" class="timeline-group">
        <h3>{{ group.monthLabel }}</h3>
        <article
          v-for="entry in group.entries"
          :key="entry.entryDate"
          :data-entry-date="entry.entryDate"
          class="timeline-entry"
        >
          <div class="timeline-entry__date">
            <strong>{{ getDayParts(entry.entryDate).day }}</strong>
            <span>{{ getDayParts(entry.entryDate).weekday }}</span>
          </div>
          <span class="timeline-entry__dot" aria-hidden="true"></span>
          <div class="timeline-entry__card">
            <p class="entry-meta">
              <span>{{ moodEmojis[entry.moodCode] }} {{ moodLabels[entry.moodCode] }}</span>
              <span>{{ weatherLabels[entry.weatherCode] }}</span>
              <span v-if="entry.locationText">{{ entry.locationText }}</span>
            </p>
            <p class="entry-content">{{ entry.contentPreview || '今天写下了一段日记。' }}</p>
            <button type="button" class="entry-open" @click="openDiary(entry.entryDate)">
              查看日记 <ArrowUpRight :size="15" :stroke-width="1.8" />
            </button>
          </div>
        </article>
      </section>
      <p v-if="isLoading && hasOlder" class="timeline-loading">正在加载更早日记…</p>
      <p v-else-if="!hasOlder" class="timeline-end">已经到底了</p>
      <p v-if="loadError" class="timeline-error">{{ loadError }}</p>
    </div>
  </section>
</template>

<style scoped>
.diary-timeline {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 30px 40px 40px;
}

.diary-timeline__header {
  margin-bottom: 28px;
}

h2,
h3,
p {
  margin: 0;
}

h2 {
  color: var(--color-text);
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
}

.diary-timeline__header p {
  margin-top: 8px;
  color: var(--color-text-subtle);
  font-size: 13px;
}

.timeline-group + .timeline-group {
  margin-top: 30px;
}

h3 {
  margin-bottom: 14px;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 600;
}

.timeline-entry {
  position: relative;
  display: grid;
  min-height: 116px;
  padding-bottom: 16px;
  grid-template-columns: 58px 20px minmax(0, 1fr);
}

.timeline-entry::after {
  position: absolute;
  top: 28px;
  bottom: -1px;
  left: 68px;
  width: 1px;
  content: '';
  background: var(--color-border);
}

.timeline-group .timeline-entry:last-child::after {
  display: none;
}

.timeline-entry__date {
  display: flex;
  gap: 3px;
  align-items: center;
  flex-direction: column;
}

.timeline-entry__date strong {
  color: var(--color-text);
  font-size: 19px;
  line-height: 1;
}

.timeline-entry__date span {
  color: var(--color-text-muted);
  font-size: 12px;
}

.timeline-entry__dot {
  z-index: 1;
  width: 10px;
  height: 10px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--color-accent-text);
  box-shadow: 0 0 0 4px var(--color-page);
}

.timeline-entry__card {
  min-width: 0;
  padding: 15px 18px 14px;
  border: 1px solid var(--color-border);
  border-radius: 13px;
  background: var(--color-surface);
}

.entry-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--color-text-subtle);
  font-size: 12px;
}

.entry-meta span:first-child {
  color: var(--color-text-muted);
}

.entry-content {
  display: -webkit-box;
  margin-top: 11px;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 1.75;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.entry-open {
  display: inline-flex;
  margin-top: 12px;
  padding: 0;
  gap: 3px;
  align-items: center;
  color: var(--color-accent-text);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  border: 0;
  background: transparent;
}

.entry-open:hover {
  text-decoration: underline;
}

.timeline-state,
.timeline-loading,
.timeline-end,
.timeline-error {
  color: var(--color-text-subtle);
  font-size: 13px;
  text-align: center;
}

.timeline-state {
  padding: 80px 0;
}

.timeline-loading,
.timeline-end,
.timeline-error {
  padding: 10px 0;
}

.timeline-state--error,
.timeline-error {
  color: var(--color-danger);
}

@media (max-width: 700px) {
  .diary-timeline {
    padding: 24px 20px 28px;
  }

  h2 {
    font-size: 26px;
  }

  .timeline-entry {
    grid-template-columns: 46px 16px minmax(0, 1fr);
  }

  .timeline-entry::after {
    left: 51px;
  }

  .timeline-entry__card {
    padding: 13px 14px;
  }
}
</style>
