import { createStore } from 'vuex'
import { ipcRenderer } from 'electron'

import modules from './modules/index.js'

const STORAGE_KEY = 'sshfs-win-manager-evo-state'
const SYNC_CHANNEL = 'sshfs-win-manager-evo-state-sync'

function mergeState (currentState, savedState) {
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
        ? savedState.Data.connections
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

function createPersistedState () {
  return store => {
    let isApplyingRemoteState = false
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(SYNC_CHANNEL) : null

    const applySavedState = state => {
      if (!state) {
        return
      }

      isApplyingRemoteState = true
      store.replaceState(mergeState(store.state, state))
      store.dispatch('APPLY_MIGRATIONS')
      isApplyingRemoteState = false
    }

    const savedState = window.localStorage.getItem(STORAGE_KEY)

    if (savedState) {
      try {
        applySavedState(JSON.parse(savedState))
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }

    store.dispatch('APPLY_MIGRATIONS')

    ipcRenderer.invoke('app-state:load').then(state => {
      applySavedState(state)
      store.dispatch('APPLY_MIGRATIONS')
    })

    if (channel) {
      channel.onmessage = event => {
        applySavedState(event.data)
      }
    }

    window.addEventListener('storage', event => {
      if (event.key === STORAGE_KEY && event.newValue) {
        applySavedState(JSON.parse(event.newValue))
      }
    })

    store.subscribe((mutation, state) => {
      if (isApplyingRemoteState) {
        return
      }

      const serializedState = JSON.stringify(state)
      const plainState = JSON.parse(serializedState)

      window.localStorage.setItem(STORAGE_KEY, serializedState)
      ipcRenderer.invoke('app-state:save', plainState).catch(() => {})

      if (channel) {
        channel.postMessage(plainState)
      }
    })
  }
}

export default createStore({
  modules,
  plugins: [
    createPersistedState()
  ],
  strict: false
})
