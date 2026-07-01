<template>
  <Window title="Settings">
    <div class="wrap">
      <div class="form-item">
        <label>SSHFS Binary</label>
        <input type="text" autofocus placeholder="eg. C:\Program Files\SSHFS-Win\bin\sshfs-win.exe" v-model="form.sshfsBinary">
      </div>

      <div class="form-item">
        <label>Process Timeout</label>
        <input type="text" autofocus placeholder="Time in seconds" v-model.number="form.processTrackTimeout" style="width: 100px; text-align: right;">
      </div>

      <div class="form-item">
        <label>Theme</label>
        <select v-model="form.theme" @change="previewTheme(form.theme)">
          <option v-for="theme in themes" :key="theme.value" :value="theme.value">{{theme.label}}</option>
        </select>
      </div>

      <div class="form-item" style="margin: 10px 0">
        <SwitchLabel label="Startup with Windows" v-model="form.startupWithOS"/>
        <SwitchLabel label="Display system tray message on close" v-model="form.displayTrayMessageOnClose"/>
        <SwitchLabel label="Show debug panel" v-model="form.showDebugPanel"/>
      </div>

      <h1 class="section-title">Connections</h1>
      <div class="connection-tools">
        <button class="btn" @click="exportConnections">Export JSON</button>
        <button class="btn" @click="importConnections">Import JSON</button>
      </div>

      <div class="footer">
        <button class="btn" @click="cancel">Cancel</button>
        <button class="btn default" @click="save">OK</button>
      </div>
    </div>
  </Window>
</template>

<script>
import { ipcRenderer } from 'electron'

import Window from '@/components/Window/index.vue'
import SwitchLabel from '@/components/SwitchLabel.vue'

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

export default {
  name: 'settings-window',

  components: {
    Window,
    SwitchLabel
  },

  methods: {
    cancel () {
      this.restorePreviewTheme()
      ipcRenderer.send('window:close-current')
    },

    save () {
      const settings = normalizeSettings(this.form)

      this.isCommitted = true
      this.form = { ...settings }
      this.$store.dispatch('UPDATE_SETTINGS', settings)

      ipcRenderer.invoke('app:set-login-item-settings', {
        ...{
          openAtLogin: settings.startupWithOS
        },
        ...this.loginItemSettings
      }).catch(() => {})

      ipcRenderer.send('window:close-current')
    },

    previewTheme (theme) {
      if (!theme) {
        return
      }

      document.body.dataset.theme = theme
      ipcRenderer.send('theme:preview', theme)

      if (!this.isReady) {
        return
      }

      this.$store.dispatch('UPDATE_SETTINGS', {
        ...this.$store.state.Settings.settings,
        theme
      })
    },

    restorePreviewTheme () {
      if (!this.previousTheme) {
        return
      }

      document.body.dataset.theme = this.previousTheme
      ipcRenderer.send('theme:preview', this.previousTheme)

      this.$store.dispatch('UPDATE_SETTINGS', {
        ...this.$store.state.Settings.settings,
        theme: this.previousTheme
      })
    },

    async exportConnections () {
      const payload = {
        app: 'sshfs-win-manager-evo',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        connections: this.$store.state.Data.connections
      }

      try {
        await ipcRenderer.invoke('connections:export', JSON.parse(JSON.stringify(payload)))
      } catch {
        window.alert('Export failed. Please try again.')
      }
    },

    async importConnections () {
      const result = await ipcRenderer.invoke('connections:import')

      if (result.canceled) {
        return
      }

      let data

      try {
        data = JSON.parse(result.content)
      } catch {
        window.alert('Invalid import file: JSON parsing failed.')
        return
      }

      const connections = Array.isArray(data) ? data : data.connections

      if (!Array.isArray(connections)) {
        window.alert('Invalid import file: connections array not found.')
        return
      }

      if (!window.confirm(`Import ${connections.length} connection(s)? This will replace the current connection list.`)) {
        return
      }

      this.$store.dispatch('IMPORT_CONNECTIONS', connections)
    }
  },

  data () {
    return {
      form: { ...defaultSettings },
      isReady: false,
      isCommitted: false,
      previousTheme: null,
      loginItemSettings: {
        args: [
          '--systray'
        ]
      },
      themes: [
        { value: 'dark-graphite', label: 'Graphite' },
        { value: 'dark-midnight', label: 'Midnight' },
        { value: 'dark-aurora', label: 'Aurora' },
        { value: 'light-quartz', label: 'Quartz' },
        { value: 'light-arctic', label: 'Arctic' },
        { value: 'light-sage', label: 'Sage' },
        { value: 'dark-classic', label: 'Classic dark' },
        { value: 'light-neutral', label: 'Classic light' }
      ]
    }
  },

  watch: {
    'form.theme' (theme) {
      this.previewTheme(theme)
    }
  },

  async mounted () {
    this.form = normalizeSettings(this.$store.state.Settings.settings)
    this.previousTheme = this.form.theme

    const settings = await ipcRenderer.invoke('app:get-login-item-settings', this.loginItemSettings)

    this.isReady = true

    this.form = normalizeSettings({
      ...this.form,
      startupWithOS: settings.openAtLogin
    })
  },

  beforeUnmount () {
    this.isReady = false

    if (!this.isCommitted) {
      this.restorePreviewTheme()
    }
  }
}
</script>

<style lang="less" scoped>
.wrap {
  padding: 15px 20px;

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 18px;
    text-align: right;
  }

  .connection-tools {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
}
</style>
