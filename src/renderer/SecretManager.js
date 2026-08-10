import crypto from 'crypto'
import { ipcRenderer } from 'electron'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SALT_LENGTH = 16

let passkey = null
let expiresAt = 0
let clearTimer = null
let sessionState = 'locked'

function now () {
  return Date.now()
}

function clearTimerIfNeeded () {
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
}

function rememberPasskey (value, retentionMs) {
  clearTimerIfNeeded()

  if (retentionMs <= 0) {
    lock()
    return
  }

  passkey = value
  expiresAt = now() + retentionMs
  sessionState = 'unlocked'

  clearTimer = setTimeout(() => {
    lock('expired')
  }, retentionMs)
}

function lock (reason = 'locked') {
  passkey = null
  expiresAt = 0
  sessionState = reason
  clearTimerIfNeeded()
}

function isUnlocked () {
  if (!passkey) {
    return false
  }

  if (expiresAt > 0 && expiresAt <= now()) {
    lock('expired')
    return false
  }

  return true
}

function getSessionState () {
  const unlocked = isUnlocked()

  return {
    status: unlocked ? 'unlocked' : sessionState,
    expiresAt: unlocked ? expiresAt : 0
  }
}

function deriveKey (value, salt) {
  return crypto.scryptSync(value, salt, KEY_LENGTH)
}

function encryptWithPasskey (value, valuePasskey) {
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = deriveKey(valuePasskey, salt)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final()
  ])

  return {
    encrypted: true,
    version: 1,
    algorithm: ALGORITHM,
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  }
}

function decryptWithPasskey (payload, valuePasskey) {
  const salt = Buffer.from(payload.salt, 'base64')
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const data = Buffer.from(payload.data, 'base64')
  const key = deriveKey(valuePasskey, salt)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(data),
    decipher.final()
  ]).toString('utf8')
}

function getRetentionMs (settings = {}) {
  const value = settings.passkeyRetention || '12h'

  switch (value) {
    case 'always':
      return 0
    case '1h':
      return 60 * 60 * 1000
    case '1d':
      return 24 * 60 * 60 * 1000
    case '2d':
      return 2 * 24 * 60 * 60 * 1000
    case '12h':
    default:
      return 12 * 60 * 60 * 1000
  }
}

function requestPasskey (mode, settings = {}) {
  return new Promise(resolve => {
    const requestId = crypto.randomUUID()

    const listener = (event, response) => {
      if (!response || response.requestId !== requestId) {
        return
      }

      ipcRenderer.removeListener('passkey-prompt:response', listener)

      if (!response.passkey) {
        resolve(null)
        return
      }

      rememberPasskey(response.passkey, getRetentionMs(settings))
      resolve(response.passkey)
    }

    ipcRenderer.on('passkey-prompt:response', listener)
    ipcRenderer.invoke('window:open', {
      name: `passkey-prompt-window-${requestId}`,
      route: `#/passkey-prompt/${mode}/${requestId}`,
      options: {
        height: mode === 'create' ? 390 : 320,
        width: 430,
        useContentSize: true,
        frame: false,
        maximizable: false,
        minimizable: false,
        resizable: false,
        modal: true
      }
    })
  })
}

async function getPasskey (settings = {}, mode = 'unlock') {
  if (isUnlocked()) {
    return passkey
  }

  return requestPasskey(mode, settings)
}

async function encryptSecret (value, settings = {}, mode = 'create') {
  const activePasskey = await getPasskey(settings, mode)

  if (!activePasskey) {
    return null
  }

  return encryptWithPasskey(value, activePasskey)
}

async function decryptSecret (payload, settings = {}) {
  const wasLocked = !isUnlocked()
  const activePasskey = await getPasskey(settings, 'unlock')

  if (!activePasskey) {
    return null
  }

  const decrypted = decryptWithPasskey(payload, activePasskey)

  if (wasLocked) {
    ipcRenderer.send('passkey:unlocked')
  }

  return decrypted
}

export default {
  lock,
  isUnlocked,
  getPasskey,
  encryptWithPasskey,
  decryptWithPasskey,
  encryptSecret,
  decryptSecret,
  getRetentionMs,
  getSessionState
}
