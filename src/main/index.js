import { app, BrowserWindow, Menu, Tray, clipboard, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'

const isSecondInstance = !app.requestSingleInstanceLock()
const userDataPath = path.join(app.getPath('appData'), 'sshfs-win-manager-evo')

let mainWindow = null
let tray = null
const windows = new Map()

const legacyRendererWebPreferences = {
  nodeIntegration: true,
  contextIsolation: false,
  enableRemoteModule: true
}

const staticPath = app.isPackaged
  ? path.join(process.resourcesPath, 'static')
  : path.join(__dirname, '../../static')

app.setName('SSHFS-Win Manager Evo')
app.setPath('userData', userDataPath)
const appStatePath = path.join(app.getPath('userData'), 'app-state.json')

app.setAppUserModelId('dev.fabricesimonet.apps.sshfs-win-manager-evo')

function safeLog (method, ...args) {
  try {
    console[method](...args)
  } catch (error) {
    if (error.code !== 'EPIPE') {
      throw error
    }
  }
}

function getWindowUrl (route = '') {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/${route}`
  }

  const rendererPath = path.join(__dirname, '../renderer/index.html').replace(/\\/g, '/')
  const base = `file://${rendererPath}`

  return `${base}${route}`
}

function createAppWindow (name, route, options) {
  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      ...legacyRendererWebPreferences,
      ...(options.webPreferences || {})
    }
  })

  windows.set(name, win)
  win.on('closed', () => {
    windows.delete(name)
  })
  win.webContents.on('render-process-gone', (event, details) => {
    safeLog('error', `[renderer:${name}] render process gone`, details)
  })
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    safeLog('error', `[renderer:${name}] failed to load ${validatedURL}: ${errorCode} ${errorDescription}`)
  })
  win.loadURL(getWindowUrl(route))

  return win
}

function getSenderWindow (event) {
  return BrowserWindow.fromWebContents(event.sender)
}

ipcMain.handle('window:open', (event, payload) => {
  const parent = getSenderWindow(event)
  const win = createAppWindow(payload.name, payload.route, {
    ...payload.options,
    parent,
    modal: payload.options && payload.options.modal !== undefined ? payload.options.modal : true
  })

  win.once('ready-to-show', () => {
    win.show()
  })
})

ipcMain.on('window:close-current', event => {
  const win = getSenderWindow(event)
  if (win) win.close()
})

ipcMain.on('window:hide-current', event => {
  const win = getSenderWindow(event)
  if (win) win.hide()
})

ipcMain.handle('dialog:select-private-key', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select private key',
    properties: ['openFile'],
    defaultPath: path.join(process.env.USERPROFILE || '', '.ssh')
  })

  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:select-connection-icon', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select connection icon',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'ico'] }
    ]
  })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  const filePath = result.filePaths[0]
  const extension = path.extname(filePath).slice(1).toLowerCase()
  const mimeType = extension === 'jpg'
    ? 'jpeg'
    : extension
  const content = await readFile(filePath)

  return `data:image/${mimeType};base64,${content.toString('base64')}`
})

ipcMain.handle('app:get-version', () => app.getVersion())
ipcMain.handle('app:get-login-item-settings', (event, settings) => app.getLoginItemSettings(settings))
ipcMain.handle('app:set-login-item-settings', (event, settings) => app.setLoginItemSettings(settings))
ipcMain.handle('shell:open-path', (event, targetPath) => shell.openPath(targetPath))
ipcMain.handle('shell:open-external', (event, url) => shell.openExternal(url))
ipcMain.on('clipboard:write-text', (event, text) => clipboard.writeText(text))
ipcMain.on('theme:preview', (event, theme) => {
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('theme:preview', theme)
    }
  })
})
ipcMain.handle('app-state:load', async () => {
  try {
    return JSON.parse(await readFile(appStatePath, 'utf8'))
  } catch {
    return null
  }
})
ipcMain.handle('app-state:save', async (event, state) => {
  await mkdir(path.dirname(appStatePath), { recursive: true })
  await writeFile(appStatePath, JSON.stringify(state, null, 2), 'utf8')
})
ipcMain.handle('connections:export', async (event, payload) => {
  const result = await dialog.showSaveDialog(getSenderWindow(event), {
    title: 'Export connections',
    defaultPath: `sshfs-win-manager-evo-connections-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [
      { name: 'JSON files', extensions: ['json'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  await writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8')

  return {
    canceled: false,
    filePath: result.filePath
  }
})
ipcMain.handle('connections:import', async event => {
  const result = await dialog.showOpenDialog(getSenderWindow(event), {
    title: 'Import connections',
    properties: ['openFile'],
    filters: [
      { name: 'JSON files', extensions: ['json'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const filePath = result.filePaths[0]

  return {
    canceled: false,
    filePath,
    content: await readFile(filePath, 'utf8')
  }
})
ipcMain.on('password-prompt:response', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('password-prompt:response', data)
  }
})

if (isSecondInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('ready', () => {
    mainWindow = createAppWindow('main-window', '', {
      title: 'SSHFS-Win Manager Evo',
      height: 760,
      width: 1280,
      minHeight: 650,
      minWidth: 1100,
      useContentSize: true,
      frame: false,
      maximizable: true,
      minimizable: false,
      resizable: true
    })

    if (!process.argv.includes('--systray')) {
      mainWindow.once('ready-to-show', () => {
        mainWindow.show()
      })
    }

    tray = new Tray(path.join(staticPath, 'tray-icon.ico'))

    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Quit',
        click () {
          mainWindow.webContents.send('terminate-child-processes')

          ipcMain.on('child-processes-terminated', () => {
            app.quit()
          })
        }
      },
      {
        label: 'About',
        click () {
          const win = createAppWindow('about-window', '#/about', {
            height: 380,
            width: 550,
            useContentSize: true,
            frame: false,
            maximizable: false,
            minimizable: false,
            resizable: false,
            modal: true,
            parent: mainWindow
          })

          win.once('ready-to-show', () => {
            win.show()
          })
        }
      }
    ])

    tray.setToolTip('SSHFS-Win Manager Evo')
    tray.setContextMenu(trayMenu)

    tray.on('click', () => {
      mainWindow.show()
    })
  })
}
