import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

// Custom APIs for renderer
const api = {
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean): void => {
        callback(maximized)
      }

      ipcRenderer.on('window:maximize-state-changed', listener)
      return (): void => {
        ipcRenderer.removeListener('window:maximize-state-changed', listener)
      }
    }
  },
  chat: {
    saveUserMessage: (conversationId: string, content: string): Promise<ChatMessage> =>
      ipcRenderer.invoke('chat:save-user-message', conversationId, content),
    send: (conversationId: string): Promise<void> =>
      ipcRenderer.invoke('chat:send', conversationId),
    listConversations: (): Promise<ConversationSummary[]> =>
      ipcRenderer.invoke('chat:list-conversations'),
    toggleConversationPinned: (conversationId: string): Promise<void> =>
      ipcRenderer.invoke('chat:toggle-conversation-pinned', conversationId),
    archiveConversation: (conversationId: string): Promise<void> =>
      ipcRenderer.invoke('chat:archive-conversation', conversationId),
    getMessagePage: (conversationId: string, beforeCursor?: number): Promise<ChatMessagePage> =>
      ipcRenderer.invoke('chat:get-message-page', conversationId, beforeCursor),
    onDelta: (callback: (event: ChatDeltaEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ChatDeltaEvent): void =>
        callback(event)
      ipcRenderer.on('chat:delta', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:delta', listener)
      }
    },
    onActivity: (callback: (event: ChatActivityEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ChatActivityEvent): void =>
        callback(event)
      ipcRenderer.on('chat:activity', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:activity', listener)
      }
    },
    onComplete: (callback: (event: ChatCompleteEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ChatCompleteEvent): void =>
        callback(event)
      ipcRenderer.on('chat:complete', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:complete', listener)
      }
    },
    onError: (callback: (event: ChatErrorEvent) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, event: ChatErrorEvent): void =>
        callback(event)
      ipcRenderer.on('chat:error', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:error', listener)
      }
    }
  },
  user: {
    getActive: (): Promise<ActiveUser | undefined> => ipcRenderer.invoke('user:get-active'),
    createInitial: (input: CreateUserInput): Promise<ActiveUser> =>
      ipcRenderer.invoke('user:create-initial', input),
    list: (): Promise<UserSummary[]> => ipcRenderer.invoke('user:list'),
    create: (input: CreateUserInput): Promise<ActiveUser> =>
      ipcRenderer.invoke('user:create', input),
    update: (userId: number, input: CreateUserInput): Promise<UserSummary> =>
      ipcRenderer.invoke('user:update', userId, input),
    switch: (userId: number): Promise<ActiveUser> => ipcRenderer.invoke('user:switch', userId),
    delete: (userId: number): Promise<void> => ipcRenderer.invoke('user:delete', userId),
    onActiveChange: (callback: (user: ActiveUser) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, user: ActiveUser): void => callback(user)
      ipcRenderer.on('user:active-changed', listener)
      return (): void => {
        ipcRenderer.removeListener('user:active-changed', listener)
      }
    }
  },
  memory: {
    listConversationSummaries: (): Promise<ConversationMemorySummary[]> =>
      ipcRenderer.invoke('memory:list-conversation-summaries')
  },
  settings: {
    getDatabaseLocation: (): Promise<DatabaseLocation> =>
      ipcRenderer.invoke('settings:get-database-location'),
    chooseDatabaseDirectory: (): Promise<string | undefined> =>
      ipcRenderer.invoke('settings:choose-database-directory'),
    migrateDatabaseDirectory: (targetDirectory: string): Promise<DatabaseLocation | undefined> =>
      ipcRenderer.invoke('settings:migrate-database-directory', targetDirectory)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
