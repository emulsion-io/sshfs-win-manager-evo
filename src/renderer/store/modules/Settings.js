import { defaultSettings, normalizeSettings } from '@/store/SettingsDefaults.js'

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
