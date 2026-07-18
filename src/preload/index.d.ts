import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowControls {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdTime: string
  createdAt: number
  cursor: number
}

interface ConversationSummary {
  id: string
  title: string
  conversationDate: string
  createdTime: string
  isPinned: boolean
}

interface ChatMessagePage {
  messages: ChatMessage[]
  hasMore: boolean
}

interface AiActivity {
  type: 'generation' | 'tool'
  label: string
  toolName?: string
}

interface ChatDeltaEvent {
  conversationId: string
  text: string
}

interface ChatActivityEvent {
  conversationId: string
  activity: AiActivity
}

interface ChatCompleteEvent {
  conversationId: string
  assistantMessage: ChatMessage
}

interface ChatErrorEvent {
  conversationId: string
  errorMessage: string
}

interface ConversationMemorySummary extends ConversationSummary {
  updatedAt: number
  messageCount: number
  isArchived: boolean
}

interface DatabaseLocation {
  directory: string
  databasePath: string
  isDefault: boolean
}

type UserGender = 'male' | 'female'

interface ActiveUser {
  id: number
  name: string
  gender: UserGender
  birthDate: string
  preferredName: string
}

interface UserSummary extends ActiveUser {
  isActive: boolean
}

interface CreateUserInput {
  name: string
  gender: UserGender
  birthDate: string
  preferredName: string
}

interface ChatApi {
  saveUserMessage: (conversationId: string, content: string) => Promise<ChatMessage>
  send: (conversationId: string) => Promise<void>
  listConversations: () => Promise<ConversationSummary[]>
  toggleConversationPinned: (conversationId: string) => Promise<void>
  archiveConversation: (conversationId: string) => Promise<void>
  getMessagePage: (conversationId: string, beforeCursor?: number) => Promise<ChatMessagePage>
  onDelta: (callback: (event: ChatDeltaEvent) => void) => () => void
  onActivity: (callback: (event: ChatActivityEvent) => void) => () => void
  onComplete: (callback: (event: ChatCompleteEvent) => void) => () => void
  onError: (callback: (event: ChatErrorEvent) => void) => () => void
}

interface SettingsApi {
  getDatabaseLocation: () => Promise<DatabaseLocation>
  chooseDatabaseDirectory: () => Promise<string | undefined>
  migrateDatabaseDirectory: (targetDirectory: string) => Promise<DatabaseLocation | undefined>
}

interface UserApi {
  getActive: () => Promise<ActiveUser | undefined>
  createInitial: (input: CreateUserInput) => Promise<ActiveUser>
  list: () => Promise<UserSummary[]>
  create: (input: CreateUserInput) => Promise<ActiveUser>
  update: (userId: number, input: CreateUserInput) => Promise<UserSummary>
  switch: (userId: number) => Promise<ActiveUser>
  delete: (userId: number) => Promise<void>
  onActiveChange: (callback: (user: ActiveUser) => void) => () => void
}

interface MemoryApi {
  listConversationSummaries: () => Promise<ConversationMemorySummary[]>
}

type DiaryWeatherCode =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'light_rain'
  | 'rain'
  | 'thunderstorm'
  | 'snow'

type DiaryMoodCode = 'happy' | 'calm' | 'content' | 'low' | 'irritable' | 'tired'

interface DiaryEntry {
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

interface SaveDiaryEntryInput {
  entryDate: string
  content: string
  locationText: string
  weatherCode: DiaryWeatherCode
  moodCode: DiaryMoodCode
}

interface DiaryCalendarEntry {
  entryDate: string
  moodCode: DiaryMoodCode
}

interface DiaryTimelineEntry {
  entryDate: string
  contentPreview: string
  locationText: string
  weatherCode: DiaryWeatherCode
  moodCode: DiaryMoodCode
}

interface ListDiaryTimelineInput {
  cursorDate?: string
  direction: 'older' | 'newer'
  limit: number
}

interface DiaryApi {
  ensureEntry: (entryDate: string) => Promise<DiaryEntry>
  getEntry: (entryDate: string) => Promise<DiaryEntry | undefined>
  listCalendarEntries: (month: string) => Promise<DiaryCalendarEntry[]>
  listTimelineEntries: (input: ListDiaryTimelineInput) => Promise<DiaryTimelineEntry[]>
  saveEntry: (input: SaveDiaryEntryInput) => Promise<DiaryEntry>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
      diary: DiaryApi
      chat: ChatApi
      user: UserApi
      memory: MemoryApi
      settings: SettingsApi
    }
  }
}
