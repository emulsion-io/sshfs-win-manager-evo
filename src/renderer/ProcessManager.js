import { EventEmitter } from 'events'
import os from 'os'

import store from './store/index.js'
import ProcessHandlerLinux from './process/ProcessHandlerLinux.js'
import ProcessHandlerMac from './process/ProcessHandlerMac.js'
import ProcessHandlerUnsupported from './process/ProcessHandlerUnsupported.js'
import ProcessHandlerWin from './process/ProcessHandlerWin.js'

let processList = []
let processWatchList = {}
let processConnectionList = {}

class ProcessManager extends EventEmitter {
  WATCH_INTERVAL = 5000

  constructor (processHandler) {
    super()

    this.processHandler = processHandler
  }

  create (conn) {
    if (!this.processHandler) {
      return Promise.reject(new Error(`Unsupported platform: ${os.platform()}`))
    }

    this.processHandler.settings = store.state.Settings.settings

    const timeoutTimer = setTimeout(() => {
      this.emit('timeout', conn)
    }, (this.processHandler.settings.processTrackTimeout * 1000))

    return new Promise((resolve, reject) => {
      this.processHandler.create(conn).then((process) => {
        this.emit('created', {
          conn,
          process
        })

        this.watch(process.pid)

        processList.push(process.pid)
        processConnectionList[process.pid] = conn

        resolve(process.pid)
      }).catch(error => {
        reject(error)
      }).finally(() => {
        clearTimeout(timeoutTimer)
      })
    })
  }

  terminate (pid, conn = null) {
    return new Promise((resolve) => {
      this.processHandler.terminate(pid, conn || processConnectionList[pid]).then(() => {
        this.emit('terminated', pid)

        this.unwatch(pid)

        processList = processList.filter(a => a !== pid)
        delete processConnectionList[pid]

        resolve()
      })
    })
  }

  terminateAll () {
    const promises = []

    processList.forEach(pid => {
      promises.push(this.terminate(pid, processConnectionList[pid]))
    })

    return Promise.all(promises)
  }

  watch (pid) {
    processWatchList[pid] = setInterval(() => {
      this.exists(pid).then(exists => {
        if (!exists) {
          this.emit('not-found', pid)

          this.unwatch(pid)
          delete processConnectionList[pid]
        }
      })
    }, this.WATCH_INTERVAL)
  }

  unwatch (pid) {
    clearInterval(processWatchList[pid])
  }

  exists (pid) {
    return this.processHandler.exists(pid)
  }

  getLastSpawnedProcess () {
    return this.processHandler.getLastSpawnedProcess()
  }
}

const settings = store.state.Settings.settings

function createProcessHandler () {
  switch (os.platform()) {
    case 'win32':
      return new ProcessHandlerWin(settings)
    case 'linux':
      return new ProcessHandlerLinux(settings)
    case 'darwin':
      return new ProcessHandlerMac(settings)
    default:
      return new ProcessHandlerUnsupported(settings, os.platform())
  }
}

export default new ProcessManager(createProcessHandler())
