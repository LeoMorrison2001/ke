import { ElectronAPI } from '@electron-toolkit/preload'

interface WindowControls {
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (maximized: boolean) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      windowControls: WindowControls
    }
  }
}
