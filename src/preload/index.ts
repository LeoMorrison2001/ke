import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
    send: (messages: { role: 'user' | 'assistant'; content: string }[]): Promise<void> =>
      ipcRenderer.invoke('chat:send', messages),
    onDelta: (callback: (text: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, text: string): void => callback(text)
      ipcRenderer.on('chat:delta', listener)
      return (): void => {
        ipcRenderer.removeListener('chat:delta', listener)
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
