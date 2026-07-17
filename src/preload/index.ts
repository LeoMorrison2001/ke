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
    deleteConversation: (conversationId: string): Promise<void> =>
      ipcRenderer.invoke('chat:delete-conversation', conversationId),
    getMessagePage: (conversationId: string, beforeCursor?: number): Promise<ChatMessagePage> =>
      ipcRenderer.invoke('chat:get-message-page', conversationId, beforeCursor),
    onDelta: (callback: (text: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, text: string): void => callback(text)
      ipcRenderer.on('chat:delta', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:delta', listener)
      }
    },
    onActivity: (callback: (activity: AiActivity) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, activity: AiActivity): void =>
        callback(activity)
      ipcRenderer.on('chat:activity', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:activity', listener)
      }
    },
    onComplete: (callback: () => void): (() => void) => {
      const listener = (): void => callback()
      ipcRenderer.on('chat:complete', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:complete', listener)
      }
    },
    onError: (callback: (message: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string): void =>
        callback(message)
      ipcRenderer.on('chat:error', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:error', listener)
      }
    }
  },
  user: {
    getActive: (): Promise<ActiveUser | undefined> => ipcRenderer.invoke('user:get-active'),
    createInitial: (input: CreateUserInput): Promise<ActiveUser> =>
      ipcRenderer.invoke('user:create-initial', input)
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
