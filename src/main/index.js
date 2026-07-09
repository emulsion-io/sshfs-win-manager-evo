import { app, BrowserWindow, Menu, Tray, clipboard, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'

const isWindows = process.platform === 'win32'
const appName = 'SSHFS Manager Evo'
const appUserModelId = 'dev.fabricesimonet.apps.sshfs-manager-evo'

app.setName(appName)

if (isWindows) {
  app.setAppUserModelId(appUserModelId)
}

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

const execFileAsync = promisify(execFile)

function getAppIconPath () {
  return path.join(staticPath, isWindows ? 'app-icon.ico' : 'app-icon.png')
}

function getTrayIconPath () {
  return path.join(staticPath, isWindows ? 'tray-icon.ico' : 'tray-icon.png')
}

function spawnDetached (file, args) {
  const child = spawn(file, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  })

  child.unref()
}

async function findCommandPath (command) {
  try {
    const lookupCommand = isWindows ? 'where.exe' : 'sh'
    const lookupArgs = isWindows ? [command] : ['-lc', `command -v ${quotePosixArg(command)}`]
    const { stdout } = await execFileAsync(lookupCommand, lookupArgs, { windowsHide: true })
    const [firstMatch] = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

    return firstMatch || null
  } catch {
    return null
  }
}

async function findTabbyPath () {
  const pathCommand = await findCommandPath('tabby') || (isWindows ? await findCommandPath('tabby.exe') : null)

  if (pathCommand) {
    return pathCommand
  }

  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Tabby', 'Tabby.exe'),
        path.join(process.env.PROGRAMFILES || '', 'Tabby', 'Tabby.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || '', 'Tabby', 'Tabby.exe')
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Tabby.app/Contents/MacOS/Tabby']
      : []

  return candidates.find(candidate => candidate && existsSync(candidate)) || null
}

function quoteWindowsArg (value) {
  const text = String(value)

  if (/^[A-Za-z0-9_@%+=:,./\\[\]-]+$/.test(text)) {
    return text
  }

  return `"${text.replace(/"/g, '\\"')}"`
}

function quotePosixArg (value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`
}

function getSshCommandString (args) {
  const quote = isWindows ? quoteWindowsArg : quotePosixArg

  return ['ssh', ...args].map(quote).join(' ')
}

function escapeAppleScriptString (value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

async function openSshInSystemTerminal (sshArgs) {
  const command = getSshCommandString(sshArgs)

  if (process.platform === 'win32') {
    spawnDetached('cmd.exe', ['/k', command])
    return 'system'
  }

  if (process.platform === 'darwin') {
    spawnDetached('osascript', ['-e', `tell application "Terminal" to do script "${escapeAppleScriptString(command)}"`, '-e', 'tell application "Terminal" to activate'])
    return 'system'
  }

  const terminalCommands = [
    { file: 'xdg-terminal-exec', args: ['sh', '-lc', command] },
    { file: 'x-terminal-emulator', args: ['-e', 'sh', '-lc', command] },
    { file: 'gnome-terminal', args: ['--', 'sh', '-lc', command] },
    { file: 'konsole', args: ['-e', 'sh', '-lc', command] },
    { file: 'xfce4-terminal', args: ['-e', `sh -lc ${quotePosixArg(command)}`] },
    { file: 'xterm', args: ['-e', 'sh', '-lc', command] }
  ]

  for (const terminal of terminalCommands) {
    const terminalPath = await findCommandPath(terminal.file)

    if (terminalPath) {
      spawnDetached(terminalPath, terminal.args)
      return 'system'
    }
  }

  throw new Error('No terminal application found')
}

async function openSshTerminal ({ tabbyQuery, sshArgs }) {
  if (!tabbyQuery || !Array.isArray(sshArgs) || sshArgs.length === 0) {
    throw new Error('Invalid SSH terminal payload')
  }

  const tabbyPath = await findTabbyPath()

  if (tabbyPath) {
    spawnDetached(tabbyPath, ['quickConnect', 'ssh', tabbyQuery])
    return { terminal: 'tabby' }
  }

  const terminal = await openSshInSystemTerminal(sshArgs)

  return { terminal }
}

function getLegacyConfigCandidates () {
  const appDataPath = app.getPath('appData')

  return [
    path.join(appDataPath, 'sshfs-win-manager', 'vuex.json'),
    path.join(appDataPath, 'SSHFS-Win Manager', 'vuex.json'),
    path.join(appDataPath, 'Roaming', 'sshfs-win-manager', 'vuex.json'),
    path.join(appDataPath, 'Roaming', 'SSHFS-Win Manager', 'vuex.json')
  ]
}

function getLegacyConnections (data) {
  if (Array.isArray(data)) {
    return data
  }

  if (data && data.Data && Array.isArray(data.Data.connections)) {
    return data.Data.connections
  }

  if (data && Array.isArray(data.connections)) {
    return data.connections
  }

  if (data && data.state && data.state.Data && Array.isArray(data.state.Data.connections)) {
    return data.state.Data.connections
  }

  return []
}

app.setPath('userData', userDataPath)
const appStatePath = path.join(app.getPath('userData'), 'app-state.json')

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
    icon: options.icon || getAppIconPath(),
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

function showMainWindow () {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
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

ipcMain.on('window:minimize-current', event => {
  const win = getSenderWindow(event)
  if (win) win.minimize()
})

ipcMain.handle('dialog:select-private-key', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select private key',
    properties: ['openFile'],
    defaultPath: path.join(app.getPath('home'), '.ssh')
  })

  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:select-mount-path', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select mount folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: app.getPath('home')
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
ipcMain.handle('shell:open-ssh-terminal', (event, payload) => openSshTerminal(payload))
ipcMain.on('clipboard:write-text', (event, text) => clipboard.writeText(text))
ipcMain.on('theme:preview', (event, theme) => {
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('theme:preview', theme)
    }
  })
})
ipcMain.on('main-window:set-detail-collapsed', (event, payload) => {
  const win = getSenderWindow(event)

  if (!win || win.isDestroyed()) {
    return
  }

  const collapsed = typeof payload === 'object' ? payload.collapsed : payload
  const delta = typeof payload === 'object' ? Number(payload.delta) || 0 : 0
  const requestedWidth = typeof payload === 'object' ? Number(payload.width) || 0 : 0
  const requestedMinWidth = typeof payload === 'object' ? Number(payload.minWidth) || 0 : 0
  const bounds = win.getBounds()
  const targetMinWidth = requestedMinWidth || (collapsed ? 700 : 1100)
  const targetWidth = requestedWidth > 0
    ? Math.max(targetMinWidth, requestedWidth)
    : collapsed
      ? Math.max(targetMinWidth, bounds.width - delta)
      : Math.max(targetMinWidth, bounds.width + delta)

  if (win.isMaximized()) {
    win.unmaximize()
  }

  win.setMinimumSize(targetMinWidth, 650)
  win.setBounds({
    ...bounds,
    width: targetWidth
  }, true)
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
ipcMain.handle('legacy-config:import', async () => {
  const candidates = getLegacyConfigCandidates()
  const filePath = candidates.find(candidate => existsSync(candidate))

  if (!filePath) {
    return {
      found: false,
      candidates
    }
  }

  try {
    const data = JSON.parse(await readFile(filePath, 'utf8'))
    const connections = getLegacyConnections(data)

    return {
      found: true,
      filePath,
      connections
    }
  } catch (error) {
    return {
      found: true,
      filePath,
      error: error.message || String(error)
    }
  }
})
ipcMain.on('password-prompt:response', (event, data) => {
  if (mainWindow) {
    mainWindow.webContents.send('password-prompt:response', data)
  }
})
ipcMain.on('passkey-prompt:response', (event, data) => {
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('passkey-prompt:response', data)
    }
  })
})

ipcMain.on('passkey:unlocked', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('passkey:unlocked')
  }
})

if (isSecondInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showMainWindow()
  })

  app.on('ready', () => {
    mainWindow = createAppWindow('main-window', '', {
      title: appName,
      height: 760,
      width: 1440,
      minHeight: 650,
      minWidth: 700,
      useContentSize: true,
      frame: false,
      maximizable: true,
      minimizable: true,
      resizable: true
    })

    if (!process.argv.includes('--systray')) {
      mainWindow.once('ready-to-show', () => {
        mainWindow.show()
      })
    }

    tray = new Tray(getTrayIconPath())

    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Open',
        click () {
          showMainWindow()
        }
      },
      {
        type: 'separator'
      },
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
          showMainWindow()
          mainWindow.webContents.send('main-window:show-section', 'about')
        }
      }
    ])

    tray.setToolTip(appName)
    tray.setContextMenu(trayMenu)

    tray.on('click', () => {
      showMainWindow()
    })
  })
}
