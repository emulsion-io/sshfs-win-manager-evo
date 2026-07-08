import os from 'os'
import path from 'path'

const platform = os.platform()
const homeDir = os.homedir()

const platformProfiles = {
  win32: {
    id: 'win32',
    name: 'Windows',
    sshfsBinary: 'C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe',
    defaultKeyFile: path.join(homeDir || process.env.USERPROFILE || '', '.ssh', 'id_rsa'),
    mountMode: 'drive-letter',
    pathListSeparator: ';',
    autoMountRoot: null
  },
  linux: {
    id: 'linux',
    name: 'Linux',
    sshfsBinary: '/usr/bin/sshfs',
    defaultKeyFile: path.join(homeDir || process.env.HOME || '', '.ssh', 'id_rsa'),
    mountMode: 'path',
    pathListSeparator: ':',
    autoMountRoot: path.join(homeDir || process.env.HOME || '', 'sshfs-win-manager-evo')
  },
  darwin: {
    id: 'darwin',
    name: 'macOS',
    sshfsBinary: '/opt/homebrew/bin/sshfs',
    defaultKeyFile: path.join(homeDir || process.env.HOME || '', '.ssh', 'id_rsa'),
    mountMode: 'path',
    pathListSeparator: ':',
    autoMountRoot: path.join(homeDir || process.env.HOME || '', 'sshfs-win-manager-evo')
  }
}

const currentPlatform = platformProfiles[platform] || {
  id: platform,
  name: platform,
  sshfsBinary: 'sshfs',
  defaultKeyFile: path.join(homeDir || '', '.ssh', 'id_rsa'),
  mountMode: 'path',
  pathListSeparator: path.delimiter,
  autoMountRoot: path.join(homeDir || '', 'sshfs-win-manager-evo')
}

function isWindows () {
  return currentPlatform.id === 'win32'
}

function usesDriveLetters () {
  return currentPlatform.mountMode === 'drive-letter'
}

export {
  currentPlatform,
  isWindows,
  usesDriveLetters
}
