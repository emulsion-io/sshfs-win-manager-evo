import path from 'path'
import { mkdir, readFile, rename, unlink, writeFile } from 'fs/promises'

import { createPersistedState } from '../shared/ConnectionState.js'

function cloneState (state) {
  return state ? JSON.parse(JSON.stringify(state)) : null
}

class StateRepository {
  constructor (filePath) {
    this.filePath = filePath
    this.state = null
    this.loadStatus = 'pending'
    this.loadPromise = null
    this.writeQueue = Promise.resolve()
    this.temporaryFileIndex = 0
  }

  async load () {
    await this.ensureLoaded()

    return {
      status: this.loadStatus,
      state: cloneState(this.state)
    }
  }

  async save (state) {
    await this.ensureLoaded()

    const snapshot = cloneState(createPersistedState(state))
    const writePromise = this.writeQueue.then(() => this.writeSnapshot(snapshot))

    this.state = snapshot
    this.loadStatus = 'loaded'
    this.writeQueue = writePromise.catch(() => {})

    await writePromise

    return cloneState(snapshot)
  }

  ensureLoaded () {
    if (!this.loadPromise) {
      this.loadPromise = this.readSnapshot()
    }

    return this.loadPromise
  }

  async readSnapshot () {
    try {
      const state = JSON.parse(await readFile(this.filePath, 'utf8'))

      this.state = createPersistedState(state)
      this.loadStatus = 'loaded'
    } catch (error) {
      this.state = null

      if (error.code === 'ENOENT') {
        this.loadStatus = 'missing'
      } else if (error instanceof SyntaxError) {
        this.loadStatus = 'invalid'
      } else {
        this.loadStatus = 'error'
      }
    }
  }

  async writeSnapshot (state) {
    const directoryPath = path.dirname(this.filePath)
    const temporaryFilePath = `${this.filePath}.${process.pid}.${++this.temporaryFileIndex}.tmp`

    await mkdir(directoryPath, { recursive: true, mode: 0o700 })

    try {
      await writeFile(temporaryFilePath, JSON.stringify(state, null, 2), {
        encoding: 'utf8',
        mode: 0o600
      })
      await rename(temporaryFilePath, this.filePath)
    } finally {
      await unlink(temporaryFilePath).catch(() => {})
    }
  }
}

export default StateRepository
