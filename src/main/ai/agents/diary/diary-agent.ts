import {
  getDiaryEntry,
  saveDiaryEntry,
  toggleDiaryEntryFavorite
} from '../../../modules/diary/diary-repository'
import type { AgentDefinition, AgentResult, AgentTask } from '../../contracts/agent-contracts'

const moodLabels = {
  happy: '开心',
  calm: '平静',
  content: '满足',
  low: '低落',
  irritable: '烦躁',
  tired: '疲惫'
} as const

const weatherLabels = {
  sunny: '晴',
  partly_cloudy: '少云',
  cloudy: '多云',
  fog: '雾',
  light_rain: '小雨',
  rain: '中雨',
  thunderstorm: '雷雨',
  snow: '雪'
} as const

const weatherCodes = new Set(Object.keys(weatherLabels))
const moodCodes = new Set(Object.keys(moodLabels))

const formatToday = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const getDate = (task: AgentTask): string | undefined =>
  typeof task.context.entryDate === 'string' ? task.context.entryDate : undefined

const readEntry = (entryDate: string): AgentResult => {
  const entry = getDiaryEntry(entryDate)
  if (!entry || entry.content.trim().length === 0) {
    return { status: 'completed', replyHint: `${entryDate} 还没有写日记。` }
  }

  const preview = Array.from(entry.content).slice(0, 1200).join('')
  const metadata = `位置：${entry.locationText || '未填写'}\n天气：${weatherLabels[entry.weatherCode]}\n心情：${moodLabels[entry.moodCode]}`
  return {
    status: 'completed',
    replyHint: `${entryDate} 的日记：\n${preview}${preview.length < entry.content.length ? '…' : ''}\n\n${metadata}`,
    data: {
      entryDate,
      hasDiary: true,
      locationText: entry.locationText,
      weather: weatherLabels[entry.weatherCode],
      mood: moodLabels[entry.moodCode]
    },
    uiActions: [
      {
        type: 'navigate',
        label: '查看日记',
        description: `${entryDate} 的日记`,
        routeName: 'xiaoke-diary-entry',
        params: { entryDate },
        query: { from: 'timeline' }
      }
    ]
  }
}

const executeDiaryTask = async (task: AgentTask): Promise<AgentResult> => {
  const entryDate = getDate(task)
  if (task.operation === 'check_today') {
    const today = formatToday()
    const entry = getDiaryEntry(today)
    const hasDiary = Boolean(entry?.content.trim())
    if (hasDiary) {
      const result = readEntry(today)
      return {
        ...result,
        replyHint: `今天的日记已经写了，共 ${Array.from(entry!.content).length} 字。\n\n${result.replyHint}`
      }
    }
    return {
      status: 'completed',
      replyHint: '今天还没有写日记。',
      data: { entryDate: today, hasDiary: false },
      uiActions: [{ type: 'navigate', label: '去写今日日记', description: '打开今天的日记编辑页', routeName: 'xiaoke-diary-today' }]
    }
  }

  if (task.operation === 'open_editor') {
    return {
      status: 'completed',
      replyHint: '我已经为你准备好今日日记入口。你也可以直接把想记录的内容告诉我，我会帮你整理成草稿。',
      uiActions: [{ type: 'navigate', label: '去写今日日记', description: '打开今天的日记编辑页', routeName: 'xiaoke-diary-today' }]
    }
  }

  const targetEntryDate = entryDate ?? (task.operation === 'update_entry' ? formatToday() : undefined)
  if (!targetEntryDate) {
    return { status: 'needs_input', replyHint: '你想查看或操作哪一天的日记？请告诉我具体日期。' }
  }

  if (task.operation === 'read_entry') return readEntry(targetEntryDate)

  if (task.operation === 'update_entry') {
    const existing = getDiaryEntry(targetEntryDate)
    if (!existing || existing.content.trim().length === 0) {
      return { status: 'failed', replyHint: `${targetEntryDate} 还没有可修改的日记。` }
    }
    const nextContent = typeof task.context.content === 'string' ? task.context.content.trim() : undefined
    const contentMode = task.context.contentMode
    if (!nextContent) {
      return { status: 'needs_input', replyHint: '你希望把日记内容修改成什么？' }
    }
    if (contentMode !== 'replace' && contentMode !== 'append') {
      return { status: 'needs_input', replyHint: '这段内容是要替换原日记，还是追加到原日记后面？' }
    }
    const locationText =
      typeof task.context.locationText === 'string' ? task.context.locationText : existing.locationText
    const weatherCode =
      typeof task.context.weatherCode === 'string' && weatherCodes.has(task.context.weatherCode)
        ? (task.context.weatherCode as typeof existing.weatherCode)
        : existing.weatherCode
    const moodCode =
      typeof task.context.moodCode === 'string' && moodCodes.has(task.context.moodCode)
        ? (task.context.moodCode as typeof existing.moodCode)
        : existing.moodCode
    const content = contentMode === 'append' ? `${existing.content}${existing.content ? '\n' : ''}${nextContent}` : nextContent
    saveDiaryEntry({ entryDate: targetEntryDate, content, locationText, weatherCode, moodCode })
    return {
      status: 'completed',
      replyHint: `已${contentMode === 'append' ? '追加' : '修改'} ${targetEntryDate} 的日记内容。`,
      data: { entryDate: targetEntryDate },
      uiActions: [{ type: 'navigate', label: '查看修改后的日记', routeName: 'xiaoke-diary-entry', params: { entryDate: targetEntryDate }, query: { from: 'timeline' } }]
    }
  }

  if (task.operation === 'set_favorite') {
    const desiredFavorite = task.context.favorite
    if (typeof desiredFavorite !== 'boolean') {
      return { status: 'needs_input', replyHint: '你希望收藏这篇日记，还是取消收藏？' }
    }
    const entry = getDiaryEntry(targetEntryDate)
    if (!entry || entry.content.trim().length === 0) {
      return { status: 'failed', replyHint: `${targetEntryDate} 没有可收藏的日记。` }
    }
    if (entry.isFavorite !== desiredFavorite) toggleDiaryEntryFavorite(targetEntryDate)
    return {
      status: 'completed',
      replyHint: desiredFavorite ? `已收藏 ${targetEntryDate} 的日记。` : `已取消收藏 ${targetEntryDate} 的日记。`,
      data: { entryDate: targetEntryDate, isFavorite: desiredFavorite },
      uiActions: [{ type: 'navigate', label: '查看日记', routeName: 'xiaoke-diary-entry', params: { entryDate: targetEntryDate }, query: { from: desiredFavorite ? 'favorites' : 'timeline' } }]
    }
  }

  return { status: 'failed', replyHint: '暂不支持这项日记操作。' }
}

export const diaryAgent: AgentDefinition = {
  id: 'diary',
  supportedOperations: ['check_today', 'open_editor', 'read_entry', 'update_entry', 'set_favorite'],
  execute: executeDiaryTask
}
