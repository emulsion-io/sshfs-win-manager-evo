import path from 'path'
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises'

const autostartFileName = 'dev.fabricesimonet.apps.sshfs-manager-evo.desktop'
const autostartArgs = ['--systray']

function getLinuxAutostartFilePath (electronApp) {
  return path.join(electronApp.getPath('appData'), 'autostart', autostartFileName)
}

function getLinuxExecutablePath () {
  return process.env.APPIMAGE || process.execPath
}

// Desktop Entry values are parsed once as strings and again as an Exec line.
// The extra escaping below follows both layers of the freedesktop.org spec.
function quoteDesktopExecArgument (value) {
  const slash = String.fromCharCode(92)
  let escaped = ''

  for (const character of String(value)) {
    if (character === slash) {
      escaped += slash.repeat(4)
    } else if (character === '"') {
      escaped += slash.repeat(3) + character
    } else if (character === '`' || character === '$') {
      escaped += slash.repeat(2) + character
    } else if (character === '%') {
      escaped += '%%'
    } else {
      escaped += character
    }
  }

  return `"${escaped}"`
}

function createLinuxAutostartEntry () {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    'Name=SSHFS Manager Evo',
    'Comment=Start SSHFS Manager Evo in the system tray',
    `Exec=${quoteDesktopExecArgument(getLinuxExecutablePath())} --systray`,
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')
}

async function getLinuxAutostartSettings (electronApp) {
  try {
    const content = await readFile(getLinuxAutostartFilePath(electronApp), 'utf8')
    const disabled = /^\s*Hidden\s*=\s*true\s*$/im.test(content) ||
      /^\s*X-GNOME-Autostart-enabled\s*=\s*false\s*$/im.test(content)

    return { openAtLogin: !disabled, supported: true }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { openAtLogin: false, supported: true }
    }

    throw error
  }
}

async function applyLinuxAutostart (electronApp, openAtLogin) {
  const filePath = getLinuxAutostartFilePath(electronApp)

  if (!openAtLogin) {
    try {
      await unlink(filePath)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }

    return { openAtLogin: false, supported: true }
  }

  const temporaryFilePath = `${filePath}.${process.pid}.tmp`

  await mkdir(path.dirname(filePath), { recursive: true })

  try {
    await writeFile(temporaryFilePath, createLinuxAutostartEntry(), 'utf8')
    await rename(temporaryFilePath, filePath)
  } finally {
    await unlink(temporaryFilePath).catch(() => {})
  }

  return { openAtLogin: true, supported: true }
}

async function getAutostartSettings (electronApp) {
  if (!electronApp.isPackaged || !['win32', 'darwin', 'linux'].includes(process.platform)) {
    return { openAtLogin: false, supported: false }
  }

  if (process.platform === 'linux') {
    return getLinuxAutostartSettings(electronApp)
  }

  const options = process.platform === 'win32' ? { args: autostartArgs } : undefined
  const settings = electronApp.getLoginItemSettings(options)

  return {
    openAtLogin: settings.openAtLogin,
    supported: true,
    ...(settings.status ? { status: settings.status } : {})
  }
}

async function applyAutostartSettings (electronApp, openAtLogin) {
  if (!electronApp.isPackaged || !['win32', 'darwin', 'linux'].includes(process.platform)) {
    return { openAtLogin: false, supported: false }
  }

  if (process.platform === 'linux') {
    return applyLinuxAutostart(electronApp, openAtLogin)
  }

  electronApp.setLoginItemSettings({
    openAtLogin: Boolean(openAtLogin),
    ...(process.platform === 'win32' ? { args: autostartArgs } : {})
  })

  return getAutostartSettings(electronApp)
}

function wasOpenedAtLogin (electronApp) {
  if (!electronApp.isPackaged || process.platform !== 'darwin') {
    return false
  }

  try {
    return electronApp.getLoginItemSettings().wasOpenedAtLogin === true
  } catch {
    return false
  }
}

export {
  applyAutostartSettings,
  getAutostartSettings,
  quoteDesktopExecArgument,
  wasOpenedAtLogin
}
