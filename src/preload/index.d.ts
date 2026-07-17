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

interface DatabaseLocation {
  directory: string
  databasePath: string
  isDefault: boolean
}

interface ChatApi {
  saveUserMessage: (conversationId: string, content: string) => Promise<ChatMessage>
  send: (conversationId: string) => Promise<void>
  listConversations: () => Promise<ConversationSummary[]>
  toggleConversationPinned: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  getMessagePage: (conversationId: string, beforeCursor?: number) => Promise<ChatMessagePage>
  onDelta: (callback: (text: string) => void) => () => void
  onComplete: (callback: () => void) => () => void
  onError: (callback: (message: string) => void) => () => void
}

interface SettingsApi {
  getDatabaseLocation: () => Promise<DatabaseLocation>
  chooseDatabaseDirectory: () => Promise<string | undefined>
  migrateDatabaseDirectory: (targetDirectory: string) => Promise<DatabaseLocation | undefined>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
      chat: ChatApi
      settings: SettingsApi
    }
  }
}
