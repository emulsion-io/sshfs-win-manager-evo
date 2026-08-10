import { createStore } from 'vuex'
import { ipcRenderer } from 'electron'

import modules from './modules/index.js'
import { createPersistedState, hydratePersistedConnections } from '../../shared/ConnectionState.js'

const STORAGE_KEY = 'sshfs-win-manager-evo-state'
const SYNC_CHANNEL = 'sshfs-win-manager-evo-state-sync'

function mergeState (currentState, savedState, resetConnectionRuntime = false) {
  if (!savedState) {
    return currentState
  }

  return {
    ...currentState,
    ...savedState,
    Data: {
      ...currentState.Data,
      ...(savedState.Data || {}),
      connections: savedState.Data && Array.isArray(savedState.Data.connections)
        ? resetConnectionRuntime
          ? hydratePersistedConnections(savedState.Data.connections, currentState.Data.connections)
          : savedState.Data.connections
        : currentState.Data.connections
    },
    Settings: {
      ...currentState.Settings,
      ...(savedState.Settings || {}),
      settings: {
        ...currentState.Settings.settings,
        ...((savedState.Settings && savedState.Settings.settings) || {})
      }
    }
  }
}

function createStatePersistencePlugin () {
  return store => {
    let isApplyingRemoteState = false
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(SYNC_CHANNEL) : null

    const applySavedState = (state, resetConnectionRuntime = false) => {
      if (!state) {
        return
      }

      isApplyingRemoteState = true
      store.replaceState(mergeState(store.state, state, resetConnectionRuntime))
      store.dispatch('APPLY_MIGRATIONS')
      isApplyingRemoteState = false
    }

    const savedState = window.localStorage.getItem(STORAGE_KEY)

    if (savedState) {
      try {
        applySavedState(JSON.parse(savedState), true)
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }

    store.dispatch('APPLY_MIGRATIONS')

    ipcRenderer.invoke('app-state:load').then(state => {
      applySavedState(state, true)
      store.dispatch('APPLY_MIGRATIONS')
    })

    if (channel) {
      channel.onmessage = event => {
        applySavedState(event.data)
      }
    }

    if (!channel) {
      window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY && event.newValue) {
          try {
            applySavedState(JSON.parse(event.newValue), true)
          } catch {
            // Ignore malformed state written by another renderer.
          }
        }
      })
    }

    store.subscribe((mutation, state) => {
      if (isApplyingRemoteState) {
        return
      }

      const serializedState = JSON.stringify(createPersistedState(state))
      const plainState = JSON.parse(JSON.stringify(state))

      window.localStorage.setItem(STORAGE_KEY, serializedState)
      ipcRenderer.invoke('app-state:save', JSON.parse(serializedState)).catch(() => {})

      if (channel) {
        channel.postMessage(plainState)
      }
    })
  }
}

export default createStore({
  modules,
  plugins: [
    createStatePersistencePlugin()
  ],
  strict: false
})
