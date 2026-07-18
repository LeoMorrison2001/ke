import { randomUUID } from 'node:crypto'
import { getDatabase } from './database'
import { requireActiveUser } from './user-repository'

export type DiaryWeatherCode =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'light_rain'
  | 'rain'
  | 'thunderstorm'
  | 'snow'

export type DiaryMoodCode = 'happy' | 'calm' | 'content' | 'low' | 'irritable' | 'tired'

export interface DiaryEntry {
  id: string
  entryDate: string
  content: string
  locationText: string
  weatherCode: DiaryWeatherCode
  moodCode: DiaryMoodCode
  isFavorite: boolean
  createdAt: number
  updatedAt: number
}

export interface SaveDiaryEntryInput {
  entryDate: string
  content: string
  locationText: string
  weatherCode: DiaryWeatherCode
  moodCode: DiaryMoodCode
}

interface DiaryEntryRow {
  id: string
  entry_date: string
  content: string
  location_text: string
  weather_code: DiaryWeatherCode
  mood_code: DiaryMoodCode
  is_favorite: number
  created_at: number
  updated_at: number
}

const weatherCodes = new Set<DiaryWeatherCode>([
  'sunny',
  'partly_cloudy',
  'cloudy',
  'fog',
  'light_rain',
  'rain',
  'thunderstorm',
  'snow'
])

const moodCodes = new Set<DiaryMoodCode>([
  'happy',
  'calm',
  'content',
  'low',
  'irritable',
  'tired'
])

const toDiaryEntry = (row: DiaryEntryRow): DiaryEntry => ({
  id: row.id,
  entryDate: row.entry_date,
  content: row.content,
  locationText: row.location_text,
  weatherCode: row.weather_code,
  moodCode: row.mood_code,
  isFavorite: row.is_favorite === 1,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at)
})

const validateEntryDate = (entryDate: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) throw new Error('日记日期无效。')
  return entryDate
}

const validateContent = (content: string): string => {
  if (typeof content !== 'string') throw new Error('日记内容无效。')
  if (content.length > 100_000) throw new Error('日记内容不能超过 100000 个字符。')
  return content
}

const validateLocation = (locationText: string): string => {
  if (typeof locationText !== 'string') throw new Error('位置无效。')
  const normalized = locationText.trim()
  if (Array.from(normalized).length > 100) throw new Error('位置不能超过 100 个字符。')
  return normalized
}

const getEntryRow = (userId: number, entryDate: string): DiaryEntryRow | undefined =>
  getDatabase()
    .prepare(
      `SELECT id, entry_date, content, location_text, weather_code, mood_code,
              is_favorite, created_at, updated_at
       FROM diary_entries WHERE user_id = ? AND entry_date = ?`
    )
    .get(userId, entryDate) as DiaryEntryRow | undefined

const getLatestLocation = (userId: number, entryDate: string): string => {
  const row = getDatabase()
    .prepare(
      `SELECT location_text
       FROM diary_entries
       WHERE user_id = ? AND entry_date < ? AND location_text <> ''
       ORDER BY entry_date DESC
       LIMIT 1`
    )
    .get(userId, entryDate) as { location_text: string } | undefined

  return row?.location_text ?? ''
}

export const ensureDiaryEntry = (entryDate: string): DiaryEntry => {
  const user = requireActiveUser()
  const normalizedDate = validateEntryDate(entryDate)
  const database = getDatabase()
  const now = Date.now()
  const locationText = getLatestLocation(user.id, normalizedDate)

  database
    .prepare(
      `INSERT OR IGNORE INTO diary_entries
        (id, user_id, entry_date, location_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(randomUUID(), user.id, normalizedDate, locationText, now, now)

  const row = getEntryRow(user.id, normalizedDate)
  if (!row) throw new Error('创建日记失败。')
  return toDiaryEntry(row)
}

export const saveDiaryEntry = (input: SaveDiaryEntryInput): DiaryEntry => {
  const user = requireActiveUser()
  const entryDate = validateEntryDate(input.entryDate)
  const content = validateContent(input.content)
  const locationText = validateLocation(input.locationText)
  if (!weatherCodes.has(input.weatherCode)) throw new Error('天气无效。')
  if (!moodCodes.has(input.moodCode)) throw new Error('心情无效。')

  const database = getDatabase()
  const now = Date.now()
  try {
    database.exec('BEGIN IMMEDIATE;')
    database
      .prepare(
        `INSERT OR IGNORE INTO diary_entries
          (id, user_id, entry_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(randomUUID(), user.id, entryDate, now, now)
    database
      .prepare(
        `UPDATE diary_entries
         SET content = ?, location_text = ?, weather_code = ?, mood_code = ?, updated_at = ?
         WHERE user_id = ? AND entry_date = ?
           AND (content <> ? OR location_text <> ? OR weather_code <> ? OR mood_code <> ?)`
      )
      .run(
        content,
        locationText,
        input.weatherCode,
        input.moodCode,
        now,
        user.id,
        entryDate,
        content,
        locationText,
        input.weatherCode,
        input.moodCode
      )
    database.exec('COMMIT;')
  } catch (error) {
    try {
      database.exec('ROLLBACK;')
    } catch {
      // The transaction may not have started yet.
    }
    throw error
  }

  const row = getEntryRow(user.id, entryDate)
  if (!row) throw new Error('保存日记失败。')
  return toDiaryEntry(row)
}
