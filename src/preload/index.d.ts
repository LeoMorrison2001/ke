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
}

interface ChatErrorEvent {
  conversationId: string
  errorMessage: string
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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
      chat: ChatApi
      user: UserApi
      settings: SettingsApi
    }
  }
}
