const defaultSettings = {
  sshfsBinary: 'C:\\Program Files\\SSHFS-Win\\bin\\sshfs.exe',
  startupWithOS: true,
  displayTrayMessageOnClose: true,
  processTrackTimeout: 15,
  showDebugPanel: false,
  theme: 'dark-graphite'
}

function normalizeSettings (settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    sshfsBinary: settings.sshfsBinary || defaultSettings.sshfsBinary,
    startupWithOS: typeof settings.startupWithOS === 'boolean' ? settings.startupWithOS : defaultSettings.startupWithOS,
    displayTrayMessageOnClose: typeof settings.displayTrayMessageOnClose === 'boolean' ? settings.displayTrayMessageOnClose : defaultSettings.displayTrayMessageOnClose,
    processTrackTimeout: Number(settings.processTrackTimeout) || defaultSettings.processTrackTimeout,
    showDebugPanel: typeof settings.showDebugPanel === 'boolean' ? settings.showDebugPanel : defaultSettings.showDebugPanel,
    theme: settings.theme || defaultSettings.theme
  }
}

const state = {
  settings: {
    ...defaultSettings
  }
}

const mutations = {
  UPDATE_SETTINGS (state, payload) {
    state.settings = normalizeSettings(payload)
  },

  RESET_SETTINGS (state) {
    state.settings = { ...defaultSettings }
  },

  MIGRATE_SETTINGS (state) {
    state.settings = normalizeSettings(state.settings)
  }
}

const actions = {
  UPDATE_SETTINGS ({ commit }, payload) {
    commit('UPDATE_SETTINGS', payload)
  },

  RESET_SETTINGS ({ commit }) {
    commit('RESET_SETTINGS')
  },

  APPLY_MIGRATIONS ({ commit }) {
    commit('MIGRATE_SETTINGS')
  }
}

export default {
  state,
  mutations,
  actions
}
