import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowControls {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatApi {
  send: (messages: ChatMessage[]) => Promise<void>
  onDelta: (callback: (text: string) => void) => () => void
  onComplete: (callback: () => void) => () => void
  onError: (callback: (message: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
      chat: ChatApi
    }
  }
}
