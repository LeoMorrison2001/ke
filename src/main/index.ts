import 'dotenv/config'
import {
  app,
  shell,
  BrowserWindow,
  dialog,
  ipcMain,
  type MessageBoxOptions,
  type OpenDialogOptions
} from 'electron'
import { join } from 'path'
import { streamText, type ModelMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  closeDatabase,
  getDatabaseLocation,
  initializeDatabase,
  migrateDatabaseDirectory
} from './database'
import {
  getConversationMessagePage,
  getConversationMessagesForModel,
  listConversations,
  saveAssistantMessage,
  saveUserMessage
} from './conversation-repository'

const chatProvider = createOpenAICompatible({
  name: 'liangrekui',
  baseURL: 'https://api.liangrekui.com/v1',
  apiKey: process.env.NEW_API_KEY
})

const streamChat = async (sender: Electron.WebContents, conversationId: string): Promise<void> => {
  if (!process.env.NEW_API_KEY) {
    throw new Error('未配置 AI API Key，请在 .env 中设置 NEW_API_KEY。')
  }

  const modelMessages: ModelMessage[] = getConversationMessagesForModel(conversationId).map(
    (message) => ({
      role: message.role,
      content: message.content
    })
  )

  try {
    const result = streamText({
      model: chatProvider('gpt-5.4'),
      messages: modelMessages
    })
    let response = ''
    for await (const text of result.textStream) {
      response += text
      sender.send('chat:delta', text)
    }
    saveAssistantMessage(conversationId, response)
    sender.send('chat:complete')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'AI 响应失败，请稍后重试。'
    sender.send('chat:error', errorMessage)
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 1200,
    minHeight: 820,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximize-state-changed', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximize-state-changed', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')
  initializeDatabase()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.handle('chat:save-user-message', (_event, conversationId: string, content: string) => {
    return saveUserMessage(conversationId, content)
  })

  ipcMain.handle('chat:send', (event, conversationId: string) => {
    return streamChat(event.sender, conversationId)
  })

  ipcMain.handle('chat:list-conversations', () => {
    return listConversations()
  })

  ipcMain.handle(
    'chat:get-message-page',
    (_event, conversationId: string, beforeCursor?: number) => {
      return getConversationMessagePage(conversationId, beforeCursor)
    }
  )

  ipcMain.handle('settings:get-database-location', () => {
    return getDatabaseLocation()
  })

  ipcMain.handle('settings:choose-database-directory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = {
      title: '选择聊天数据存储位置',
      defaultPath: getDatabaseLocation().directory,
      properties: ['openDirectory', 'createDirectory']
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)

    return result.canceled ? undefined : result.filePaths[0]
  })

  ipcMain.handle('settings:migrate-database-directory', async (event, targetDirectory: string) => {
    if (typeof targetDirectory !== 'string') throw new Error('无效的数据目录。')

    const currentLocation = getDatabaseLocation()
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: MessageBoxOptions = {
      type: 'warning',
      buttons: ['迁移', '取消'],
      defaultId: 1,
      cancelId: 1,
      title: '确认迁移聊天数据',
      message: '迁移后将删除旧位置中的聊天数据库文件。',
      detail: `当前：${currentLocation.directory}\n新位置：${targetDirectory}`
    }
    const confirmation = window
      ? await dialog.showMessageBox(window, options)
      : await dialog.showMessageBox(options)

    if (confirmation.response !== 0) return undefined
    return migrateDatabaseDirectory(targetDirectory)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
