import { createStore } from 'vuex'
import { ipcRenderer } from 'electron'

import modules from './modules/index.js'
import { createPersistedState, hydratePersistedConnections } from '../../shared/ConnectionState.js'

const STORAGE_KEY = 'sshfs-win-manager-evo-state'
const SYNC_CHANNEL = 'sshfs-win-manager-evo-state-sync'
let resolveStateReady

const stateReady = new Promise(resolve => {
  resolveStateReady = resolve
})

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
    let isStateReady = false
    let pendingRemoteState = null
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(SYNC_CHANNEL) : null

    const applySavedState = async (state, resetConnectionRuntime = false) => {
      if (!state) {
        return
      }

      isApplyingRemoteState = true

      try {
        store.replaceState(mergeState(store.state, state, resetConnectionRuntime))
        await store.dispatch('APPLY_MIGRATIONS')
      } finally {
        isApplyingRemoteState = false
      }
    }

    const readLegacyState = () => {
      let savedState

      try {
        savedState = window.localStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }

      if (!savedState) {
        return null
      }

      try {
        return JSON.parse(savedState)
      } catch {
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          // Ignore an unavailable localStorage fallback.
        }
        return null
      }
    }

    const persistState = state => {
      const serializedState = JSON.stringify(createPersistedState(state))

      return ipcRenderer.invoke('app-state:save', JSON.parse(serializedState))
        .then(() => {
          try {
            window.localStorage.removeItem(STORAGE_KEY)
          } catch {
            // The main-process repository remains authoritative.
          }
        })
        .catch(() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, serializedState)
          } catch {
            // There is no secondary fallback if localStorage is unavailable.
          }
        })
    }

    const loadRepositoryState = () => new Promise(resolve => {
      let settled = false
      const finish = result => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeout)
        resolve(result)
      }
      const timeout = setTimeout(() => finish(null), 5000)

      ipcRenderer.invoke('app-state:load')
        .then(finish)
        .catch(() => finish(null))
    })

    if (channel) {
      channel.onmessage = event => {
        if (!isStateReady) {
          pendingRemoteState = event.data
          return
        }

        applySavedState(event.data).catch(() => {})
      }
    }

    const initializeState = async () => {
      let legacyState = null
      let repositoryResult = { status: 'error', state: null }
      let source = 'defaults'

      try {
        legacyState = readLegacyState()

        const result = await loadRepositoryState()

        if (result && typeof result.status === 'string') {
          repositoryResult = result
        }
      } catch {
        // Keep the legacy state available as a fallback.
      }

      if (repositoryResult.status === 'loaded' && repositoryResult.state) {
        try {
          await applySavedState(repositoryResult.state, true)
          source = 'repository'
        } catch {
          // Fall through to the legacy snapshot when the repository is invalid.
        }
      }

      if (source === 'defaults' && legacyState) {
        try {
          await applySavedState(legacyState, true)
          source = 'legacy'
        } catch {
          // Resolve readiness with the module defaults below.
        }
      }

      if (source === 'defaults') {
        try {
          await store.dispatch('APPLY_MIGRATIONS')
        } catch {
          // Readiness must resolve even when a migration rejects.
        }
      }

      if (pendingRemoteState) {
        try {
          await applySavedState(pendingRemoteState)
        } catch {
          // The repository or legacy snapshot remains usable.
        }

        pendingRemoteState = null
      }

      const shouldPersistInitialState = source === 'repository' || source === 'legacy' ||
        repositoryResult.status === 'missing'

      isStateReady = true
      resolveStateReady({ source, status: repositoryResult.status })

      if (shouldPersistInitialState) {
        persistState(store.state)
      }
    }

    initializeState().catch(() => {
      isStateReady = true
      resolveStateReady({ source: 'defaults', status: 'error' })
    })

    store.subscribe((mutation, state) => {
      if (isApplyingRemoteState || !isStateReady) {
        return
      }

      const plainState = JSON.parse(JSON.stringify(state))

      persistState(state)

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

export { stateReady }
