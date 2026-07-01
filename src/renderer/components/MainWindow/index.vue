<template>
  <Window title="SSHFS-Win Manager Evo" closeAction="hide" @close="showRunningInBackgroundNotification">
    <div class="main-shell" :class="{ 'nav-collapsed': navCollapsed }">
      <aside class="nav-rail">
        <div class="brand-mark">
          <Icon icon="cloudDrive"/>
        </div>

        <button
          class="nav-collapse"
          type="button"
          :title="navCollapsed ? 'Deplier le menu' : 'Replier le menu'"
          @click="navCollapsed = !navCollapsed"
        >
          <Icon icon="grip"/>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'connections' }" type="button" @click="showConnections">
          <Icon icon="cloudDrive"/>
          <span class="nav-label">Connexions</span>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'favorites' }" type="button" @click="showFavorites">
          <Icon icon="star"/>
          <span class="nav-label">Favoris</span>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'settings' }" type="button" @click="showSettings">
          <Icon icon="settings"/>
          <span class="nav-label">Parametres</span>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'about' }" type="button" @click="showAbout">
          <Icon icon="help"/>
          <span class="nav-label">A propos</span>
        </button>

        <div class="service-status">
          <span class="status-dot"></span>
          <span class="nav-label">Service actif</span>
          <small class="nav-label">v{{ appVersion }}</small>
        </div>
      </aside>

      <section class="connection-panel">
        <div class="panel-toolbar">
          <label class="search-box">
            <Icon icon="info"/>
            <input v-model="searchText" type="search" placeholder="Rechercher une connexion...">
          </label>

          <select v-model="sortMode" class="sort-select">
            <option value="name">A-Z</option>
            <option value="status">Statut</option>
            <option value="manual">Manuel</option>
          </select>
        </div>

        <div v-if="!hasConnections" class="empty-list">
          <Icon icon="cloudDrive"/>
          <h1>Aucune connexion</h1>
          <p>Ajoute une premiere connexion pour commencer.</p>
        </div>

        <div v-else class="connection-list">
          <button
            v-for="conn in filteredConnections"
            :key="conn.uuid"
            type="button"
            class="connection-card"
            :class="{ active: selectedConnection && selectedConnection.uuid === conn.uuid, connected: conn.status === 'connected' }"
            :draggable="isEditModeEnabled"
            @click="selectConnection(conn)"
            @dragstart="dragConnection(conn.uuid)"
            @dragover.prevent
            @drop="dropConnection(conn.uuid)"
          >
            <span class="connection-icon">
              <Icon icon="cloudDrive"/>
            </span>

            <span class="connection-main">
              <strong>{{ conn.name }}</strong>
              <span class="connection-meta" :class="{ 'has-reorder': sortMode === 'manual' }">
                <span>
                  <b>{{ mountPointLabel(conn) }}</b>
                  {{ conn.host }}
                  <i>&middot;</i>
                  {{ conn.folder || '/' }}
                </span>

                <span v-if="sortMode === 'manual'" class="reorder-actions">
                  <button
                    type="button"
                    :disabled="!canMoveConnection(conn, -1)"
                    v-tooltip="'Monter'"
                    @click.stop="moveConnection(conn, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    :disabled="!canMoveConnection(conn, 1)"
                    v-tooltip="'Descendre'"
                    @click.stop="moveConnection(conn, 1)"
                  >
                    ↓
                  </button>
                </span>

                <span class="connection-state" :class="conn.status"></span>

                <span class="quick-actions">
                  <button
                    type="button"
                    class="round-action favorite"
                    :class="{ active: conn.favorite }"
                    v-tooltip="conn.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                    @click.stop="toggleFavorite(conn)"
                  >
                    <Icon icon="star"/>
                  </button>
                  <button
                    type="button"
                    class="round-action"
                    :disabled="conn.status !== 'connected'"
                    v-tooltip="'Ouvrir le dossier'"
                    @click.stop="openLocal(conn.mountPoint === 'auto' ? conn.preferredMountPoint : conn.mountPoint)"
                  >
                    <Icon icon="openFolder"/>
                  </button>
                  <button
                    v-if="conn.status === 'connected'"
                    type="button"
                    class="round-action primary"
                    v-tooltip="'Deconnecter'"
                    @click.stop="disconnect(conn)"
                  >
                    <Icon icon="plugConnected"/>
                  </button>
                  <button
                    v-else
                    type="button"
                    class="round-action"
                    :class="{ loading: conn.status === 'connecting' }"
                    :disabled="conn.status === 'connecting' || conn.status === 'disconnecting'"
                    v-tooltip="conn.status === 'connecting' ? 'Connexion...' : 'Connecter'"
                    @click.stop="connect(conn)"
                  >
                    <Icon icon="plugDisconnected"/>
                  </button>
                </span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <section class="detail-panel">
        <div class="detail-topbar">
          <button class="btn primary-action" type="button" @click="addNewConnection">
            <Icon icon="plus"/>
            Nouvelle connexion
          </button>
        </div>

        <div v-if="activeSection === 'settings'" class="workspace-card settings-workspace">
          <header class="workspace-header">
            <div>
              <h1>Parametres</h1>
              <p>Configuration generale, theme et import/export des connexions.</p>
            </div>
          </header>

          <div class="settings-grid">
            <label class="field">
              <span>SSHFS binary</span>
              <input v-model="settingsForm.sshfsBinary" type="text" placeholder="C:\Program Files\SSHFS-Win\bin\sshfs.exe">
            </label>

            <label class="field compact">
              <span>Process timeout</span>
              <input v-model.number="settingsForm.processTrackTimeout" type="number" min="1">
            </label>

            <label class="field">
              <span>Theme</span>
              <select v-model="settingsForm.theme" @change="previewTheme(settingsForm.theme)">
                <option v-for="theme in themes" :key="theme.value" :value="theme.value">{{ theme.label }}</option>
              </select>
            </label>

            <div class="toggle-list">
              <label class="settings-toggle">
                <input v-model="settingsForm.startupWithOS" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">Demarrer avec Windows</span>
              </label>
              <label class="settings-toggle">
                <input v-model="settingsForm.displayTrayMessageOnClose" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">Message tray a la fermeture</span>
              </label>
              <label class="settings-toggle">
                <input v-model="settingsForm.showDebugPanel" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">Afficher le panneau debug</span>
              </label>
            </div>

            <div class="settings-actions">
              <button class="action-button" type="button" @click="exportConnections">
                <Icon icon="duplicate"/>
                Export JSON
              </button>
              <button class="action-button" type="button" @click="importConnections">
                <Icon icon="openFolder"/>
                Import JSON
              </button>
            </div>
          </div>

          <footer class="workspace-footer">
            <button class="btn" type="button" @click="resetSettingsForm">Annuler</button>
            <button class="btn primary-action" type="button" @click="saveSettings">Enregistrer</button>
          </footer>
        </div>

        <div v-else-if="activeSection === 'about'" class="workspace-card about-workspace">
          <header class="workspace-header">
            <div>
              <h1>SSHFS-Win Manager Evo</h1>
              <p>Version {{ appVersion }} - modifications Evo par Fabrice Simonet.</p>
            </div>
          </header>

          <div class="about-content">
            <p>Base sur le projet original SSHFS-Win Manager de Evandro Araujo.</p>
            <p>Licence MIT. Cette version conserve les credits du projet original et ajoute les modifications Evo.</p>

            <h2>Bibliotheques principales</h2>
            <div class="library-grid">
              <button type="button" @click="openExternal('https://github.com/nodejs/node')">Node.js</button>
              <button type="button" @click="openExternal('https://github.com/electron/electron')">Electron</button>
              <button type="button" @click="openExternal('https://github.com/vitejs/vite')">Vite</button>
              <button type="button" @click="openExternal('https://github.com/alex8088/electron-vite')">electron-vite</button>
              <button type="button" @click="openExternal('https://github.com/vuejs/core')">Vue.js</button>
              <button type="button" @click="openExternal('https://github.com/vuejs/vuex')">Vuex</button>
              <button type="button" @click="openExternal('https://github.com/billziss-gh/sshfs-win')">SSHFS-Win</button>
            </div>
          </div>
        </div>

        <div v-else-if="selectedConnection" class="detail-card">
          <header class="detail-header">
            <span class="detail-icon">
              <Icon icon="cloudDrive"/>
            </span>

            <div class="detail-title">
              <div class="detail-title-main">
                <h1>{{ selectedConnection.name }}</h1>
                <span class="status-pill" :class="selectedConnection.status">
                  <span class="status-dot"></span>
                  {{ statusLabel(selectedConnection) }}
                </span>
              </div>
              <div class="detail-title-meta">
                <p>
                  <b>{{ mountPointLabel(selectedConnection) }}</b>
                  {{ selectedConnection.host }}
                  <i>&middot;</i>
                  {{ selectedConnection.folder || '/' }}
                </p>

                <div class="detail-title-actions">
                  <button type="button" class="icon-button" v-tooltip="'Editer'" @click="editConnection(selectedConnection)">
                    <Icon icon="pen"/>
                  </button>
                  <button
                    type="button"
                    class="icon-button favorite"
                    :class="{ active: selectedConnection.favorite }"
                    v-tooltip="selectedConnection.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
                    @click="toggleFavorite(selectedConnection)"
                  >
                    <Icon icon="star"/>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div class="detail-body">
            <div class="info-panel">
              <div class="info-row">
                <span>Statut</span>
                <strong>{{ statusLabel(selectedConnection) }}</strong>
              </div>
              <div class="info-row">
                <span>Type de connexion</span>
                <strong>SSHFS</strong>
              </div>
              <div class="info-row">
                <span>Adresse</span>
                <strong>{{ selectedConnection.host }}</strong>
              </div>
              <div class="info-row">
                <span>Port</span>
                <strong>{{ selectedConnection.port || 22 }}</strong>
              </div>
              <div class="info-row">
                <span>Point de montage</span>
                <strong>{{ mountPointLabel(selectedConnection) }}</strong>
              </div>
              <div class="info-row">
                <span>Chemin distant</span>
                <strong>{{ selectedConnection.folder || '/' }}</strong>
              </div>
              <div class="info-row">
                <span>Utilisateur</span>
                <strong>{{ selectedConnection.user || '-' }}</strong>
              </div>
            </div>

            <aside class="actions-panel">
              <h2>Actions</h2>
              <button
                v-if="selectedConnection.status === 'connected'"
                class="action-button primary"
                type="button"
                @click="disconnect(selectedConnection)"
              >
                <Icon icon="plugConnected"/>
                Deconnecter
              </button>
              <button
                v-else
                class="action-button primary"
                :class="{ loading: selectedConnection.status === 'connecting' }"
                :disabled="selectedConnection.status === 'connecting' || selectedConnection.status === 'disconnecting'"
                type="button"
                @click="connect(selectedConnection)"
              >
                <Icon icon="plugDisconnected"/>
                {{ selectedConnection.status === 'connecting' ? 'Connexion...' : 'Connecter' }}
              </button>
              <button class="action-button" type="button" @click="editConnection(selectedConnection)">
                <Icon icon="pen"/>
                Editer
              </button>
              <button class="action-button" type="button" @click="cloneConnection(selectedConnection)">
                <Icon icon="duplicate"/>
                Dupliquer
              </button>
              <button
                class="action-button"
                type="button"
                :disabled="selectedConnection.status !== 'connected'"
                @click="openLocal(selectedConnection.mountPoint === 'auto' ? selectedConnection.preferredMountPoint : selectedConnection.mountPoint)"
              >
                <Icon icon="openFolder"/>
                Ouvrir le dossier
              </button>
              <button class="action-button danger" type="button" @click="deleteConnection(selectedConnection)">
                <Icon icon="trashCan"/>
                Supprimer
              </button>
            </aside>
          </div>
        </div>

        <div v-else class="empty-detail">
          <Icon icon="cloudDrive"/>
          <h1>Selectionne une connexion</h1>
          <p>Les informations et actions rapides apparaitront ici.</p>
        </div>

        <div class="stats-bar">
          <span><Icon icon="cloudDrive"/> {{ connections.length }} connexions</span>
          <span class="success"><span class="status-dot"></span> {{ connectedConnections.length }} connectees</span>
          <span class="warning"><span class="status-dot"></span> {{ busyConnections.length }} en cours</span>
        </div>

        <div v-show="appSettings.showDebugPanel" class="debug-panel">
          <div class="debug-header">
            <strong>Debug output</strong>
            <span>
              <button type="button" v-tooltip="'Clear debug output'" @click="clearDebugOutput">
                <Icon icon="unavailable"/>
              </button>
              <button type="button" v-tooltip="'Copy debug output to clipboard'" @click="copyDebugOutput">
                <Icon icon="duplicate"/>
              </button>
            </span>
          </div>
          <textarea v-model="debugOutput" readonly ref="debugOutput"></textarea>
        </div>
      </section>
    </div>
  </Window>
</template>

<script>
import fs from 'fs'
import { ipcRenderer } from 'electron'

import { v4 as uuid } from 'uuid'

import ProcessManager from '@/ProcessManager.js'

import Window from '@/components/Window/index.vue'
import Icon from '@/components/Icon.vue'

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
  name: 'main-window',

  components: {
    Window,
    Icon
  },

  methods: {
    showConnections () {
      this.activeSection = 'connections'
    },

    showFavorites () {
      this.activeSection = 'favorites'
    },

    showSettings () {
      this.activeSection = 'settings'
      this.settingsForm = normalizeSettings(this.appSettings)
    },

    showAbout () {
      this.activeSection = 'about'
    },

    toggleFavorite (conn) {
      conn.favorite = !conn.favorite
      this.$store.dispatch('UPDATE_CONNECTION', conn)
    },

    previewTheme (theme) {
      if (!theme) {
        return
      }

      document.body.dataset.theme = theme
      ipcRenderer.send('theme:preview', theme)
      this.$store.dispatch('UPDATE_SETTINGS', {
        ...this.appSettings,
        theme
      })
    },

    resetSettingsForm () {
      this.settingsForm = normalizeSettings(this.appSettings)
      this.previewTheme(this.settingsForm.theme)
    },

    saveSettings () {
      const settings = normalizeSettings(this.settingsForm)

      this.settingsForm = { ...settings }
      this.$store.dispatch('UPDATE_SETTINGS', settings)

      ipcRenderer.invoke('app:set-login-item-settings', {
        openAtLogin: settings.startupWithOS,
        args: [
          '--systray'
        ]
      }).catch(() => {})
    },

    async exportConnections () {
      const payload = {
        app: 'sshfs-win-manager-evo',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        connections: this.connections
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
    },

    openExternal (url) {
      ipcRenderer.invoke('shell:open-external', url)
    },

    dragConnection (uuid) {
      this.draggedConnectionUuid = uuid
    },

    dropConnection (uuid) {
      if (!this.draggedConnectionUuid || this.draggedConnectionUuid === uuid) {
        return
      }

      const fromIndex = this.connections.findIndex(conn => conn.uuid === this.draggedConnectionUuid)
      const toIndex = this.connections.findIndex(conn => conn.uuid === uuid)

      if (fromIndex === -1 || toIndex === -1) {
        this.draggedConnectionUuid = null
        return
      }

      const items = [...this.connections]
      const dragged = items.splice(fromIndex, 1)[0]
      items.splice(toIndex, 0, dragged)

      this.draggedConnectionUuid = null
      this.sortMode = 'manual'
      this.$store.dispatch('REFRESH_CONNECTIONS', items)
    },

    canMoveConnection (conn, direction) {
      const visibleIndex = this.filteredConnections.findIndex(item => item.uuid === conn.uuid)
      const targetIndex = visibleIndex + direction

      return visibleIndex !== -1 && targetIndex >= 0 && targetIndex < this.filteredConnections.length
    },

    moveConnection (conn, direction) {
      const visibleIndex = this.filteredConnections.findIndex(item => item.uuid === conn.uuid)
      const target = this.filteredConnections[visibleIndex + direction]

      if (!target) {
        return
      }

      const items = [...this.connections]
      const fromIndex = items.findIndex(item => item.uuid === conn.uuid)
      const toIndex = items.findIndex(item => item.uuid === target.uuid)

      if (fromIndex === -1 || toIndex === -1) {
        return
      }

      const [moved] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, moved)

      this.sortMode = 'manual'
      this.selectedConnectionUuid = conn.uuid
      this.$store.dispatch('REFRESH_CONNECTIONS', items)
    },

    selectConnection (conn) {
      this.selectedConnectionUuid = conn.uuid

      if (this.activeSection === 'settings' || this.activeSection === 'about') {
        this.activeSection = 'connections'
      }
    },

    toggleDeleteMode () {
      this.listMode = this.listMode === 'delete' ? 'none' : 'delete'
    },

    toggleEditMode () {
      this.listMode = this.listMode === 'edit' ? 'none' : 'edit'
    },

    connect (conn) {
      return new Promise(resolve => {
        this.$store.dispatch('UPDATE_CONNECTION_STATUS', {
          uuid: conn.uuid,
          status: 'connecting'
        })

        const connect = c => {
          ProcessManager.create(c).then(pid => {
            console.log(`{${conn.uuid}}`, 'status:', 'ui connected', pid)

            this.$store.dispatch('UPDATE_CONNECTION_STATUS', {
              uuid: conn.uuid,
              pid,
              status: 'connected'
            })

            this.selectConnection(conn)
            resolve()
          }).catch(error => {
            this.$store.dispatch('UPDATE_CONNECTION_STATUS', {
              uuid: conn.uuid,
              pid: null,
              status: 'disconnected'
            })

            this.notify(`Can't connect to '${conn.name}': ${error}`, 'error-icon')
            resolve()
          })
        }

        if (conn.authType === 'password-ask' || conn.authType === 'interactive' || conn.authType === 'key-file-passphrase' || conn.authType === 'key-file-interactive' || conn.authType === 'key-file-passphrase-interactive') {
          ipcRenderer.once('password-prompt:response', (event, data) => {
            switch (data.message) {
              case 'connection-password':
                connect({
                  ...conn,
                  password: data.password,
                  interactiveResponses: data.interactiveResponses || []
                })
                break

              case 'connection-password-cancel':
                this.$store.dispatch('UPDATE_CONNECTION_STATUS', {
                  uuid: conn.uuid,
                  pid: null,
                  status: 'disconnected'
                })
                resolve()
                break
            }
          })

          ipcRenderer.invoke('window:open', {
            name: 'password-prompt-window',
            route: `#/password-prompt/${conn.uuid}`,
            options: {
              height: conn.authType === 'key-file-passphrase-interactive' ? 360 : (conn.authType === 'key-file-interactive' || conn.authType === 'interactive' ? 270 : 210),
              width: 350,
              useContentSize: true,
              frame: false,
              maximizable: false,
              minimizable: false,
              resizable: false,
              modal: true
            }
          })
        } else {
          connect(conn)
        }
      })
    },

    disconnect (conn) {
      conn.status = 'disconnecting'

      ProcessManager.terminate(conn.pid).then(() => {
        conn.status = 'disconnected'

        this.updateConnectionList()
      })
    },

    openLocal (path) {
      if (path) {
        ipcRenderer.invoke('shell:open-path', path)
      }
    },

    addNewConnection () {
      ipcRenderer.invoke('window:open', {
        name: 'add-new-connection-window',
        route: '#/add-new-connection',
        options: {
          height: 770,
          width: 500,
          useContentSize: true,
          frame: false,
          maximizable: false,
          minimizable: false,
          resizable: false,
          modal: true
        }
      })
    },

    editConnection (conn) {
      ipcRenderer.invoke('window:open', {
        name: 'edit-connection-window',
        route: `#/edit-connection/${conn.uuid}`,
        options: {
          height: 770,
          width: 500,
          useContentSize: true,
          frame: false,
          maximizable: false,
          minimizable: false,
          resizable: false,
          modal: true
        }
      })
    },

    cloneConnection (conn) {
      const connCopy = {...conn}

      const randName = Math.random().toString(30).substr(-4)

      connCopy.uuid = uuid()
      connCopy.name += ` (copy-${randName})`
      connCopy.status = 'disconnected'
      connCopy.pid = null

      this.$store.dispatch('ADD_CONNECTION', connCopy)
      this.selectedConnectionUuid = connCopy.uuid
    },

    deleteConnection (conn) {
      const currentIndex = this.connections.findIndex(item => item.uuid === conn.uuid)

      this.$store.dispatch('DELETE_CONNECTION', conn)

      setTimeout(() => {
        if (this.connections.length === 0) {
          this.listMode = 'none'
          this.selectedConnectionUuid = null
        } else if (this.selectedConnectionUuid === conn.uuid) {
          const nextConnection = this.connections[Math.min(currentIndex, this.connections.length - 1)]
          this.selectedConnectionUuid = nextConnection.uuid
        }
      }, 200)
    },

    settings () {
      ipcRenderer.invoke('window:open', {
        name: 'settings-window',
        route: '#/settings',
        options: {
          height: 620,
          width: 540,
          useContentSize: true,
          frame: false,
          maximizable: false,
          minimizable: false,
          resizable: true,
          modal: true
        }
      })
    },

    about () {
      ipcRenderer.invoke('window:open', {
        name: 'about-window',
        route: '#/about',
        options: {
          height: 350,
          width: 550,
          useContentSize: true,
          frame: false,
          maximizable: false,
          minimizable: false,
          resizable: false,
          modal: true
        }
      })
    },

    showRunningInBackgroundNotification () {
      if (!this.runningInBackgroundNotificationShowed) {
        if (this.$store.state.Settings.settings.displayTrayMessageOnClose) {
          this.notify('Program still running in the system tray')

          this.runningInBackgroundNotificationShowed = true
        }
      }
    },

    notify (text) {
      new Notification('SSHFS-Win Manager Evo', {
        body: text
      })
    },

    getConnectionByPid (pid) {
      return this.connections.find(a => a.pid === pid)
    },

    clearDebugOutput () {
      this.debugOutput = ''
    },

    copyDebugOutput () {
      ipcRenderer.send('clipboard:write-text', this.debugOutput)

      this.notify('Debug output copied to clipboard')
    },

    updateConnectionList () {
      this.$store.dispatch('REFRESH_CONNECTIONS', this.connections)
    },

    mountPointLabel (conn) {
      if (conn.status === 'connected' && conn.mountPoint === 'auto') {
        return conn.preferredMountPoint || 'Auto'
      }

      if (conn.mountPoint === 'auto') {
        return conn.preferredMountPoint || 'Auto'
      }

      return conn.mountPoint || 'Auto'
    },

    statusLabel (conn) {
      switch (conn.status) {
        case 'connected':
          return 'Connectee'
        case 'connecting':
          return 'Connexion...'
        case 'disconnecting':
          return 'Deconnexion...'
        default:
          return 'Deconnectee'
      }
    }
  },

  computed: {
    hasConnections () {
      return this.connections.length > 0
    },

    isEditModeEnabled () {
      return this.listMode === 'edit' || this.sortMode === 'manual'
    },

    isDeleteModeEnabled () {
      return this.listMode === 'delete'
    },

    connections () {
      return this.$store.state.Data.connections
    },

    filteredConnections () {
      const query = this.searchText.trim().toLowerCase()

      let items = this.connections.filter(conn => {
        if (this.activeSection === 'favorites' && !conn.favorite) {
          return false
        }

        if (!query) {
          return true
        }

        return [
          conn.name,
          conn.host,
          conn.user,
          conn.folder,
          conn.mountPoint,
          conn.preferredMountPoint
        ].filter(Boolean).some(value => String(value).toLowerCase().includes(query))
      })

      if (this.sortMode === 'name') {
        items = [...items].sort((a, b) => a.name.localeCompare(b.name))
      }

      if (this.sortMode === 'status') {
        const weight = {
          connected: 0,
          connecting: 1,
          disconnecting: 2,
          disconnected: 3
        }

        items = [...items].sort((a, b) => (weight[a.status] || 9) - (weight[b.status] || 9) || a.name.localeCompare(b.name))
      }

      return items
    },

    selectedConnection () {
      return this.connections.find(conn => conn.uuid === this.selectedConnectionUuid) || this.connections[0] || null
    },

    connectedConnections () {
      return this.connections.filter(conn => conn.status === 'connected')
    },

    busyConnections () {
      return this.connections.filter(conn => conn.status === 'connecting' || conn.status === 'disconnecting')
    },

    appSettings () {
      return this.$store.state.Settings.settings
    }
  },

  watch: {
    connections: {
      handler (connections) {
        if (!connections.length) {
          this.selectedConnectionUuid = null
          return
        }

        if (!this.selectedConnectionUuid || !connections.some(conn => conn.uuid === this.selectedConnectionUuid)) {
          this.selectedConnectionUuid = connections[0].uuid
        }
      },
      immediate: true
    }
  },

  data () {
    return {
      activeSection: 'connections',
      navCollapsed: false,
      listMode: 'none',
      sortMode: 'name',
      searchText: '',
      settingsForm: { ...defaultSettings },
      themes: [
        { value: 'dark-graphite', label: 'Graphite' },
        { value: 'dark-midnight', label: 'Midnight' },
        { value: 'dark-aurora', label: 'Aurora' },
        { value: 'light-quartz', label: 'Quartz' },
        { value: 'light-arctic', label: 'Arctic' },
        { value: 'light-sage', label: 'Sage' },
        { value: 'dark-classic', label: 'Classic dark' },
        { value: 'light-neutral', label: 'Classic light' }
      ],
      selectedConnectionUuid: null,
      draggedConnectionUuid: null,
      runningInBackgroundNotificationShowed: false,
      debugOutput: '',
      appVersion: ''
    }
  },

  mounted () {
    this.settingsForm = normalizeSettings(this.appSettings)

    ipcRenderer.invoke('app:get-version').then(version => {
      this.appVersion = version
    })

    const originalConsoleLog = console.log.bind(console)

    console.log = (...args) => {
      if (this.appSettings.showDebugPanel) {
        const data = args.join(' ').trim()

        this.debugOutput += '\n' + data

        this.$nextTick().then(() => {
          this.$refs.debugOutput.scrollTop = this.$refs.debugOutput.scrollHeight
        })
      }

      originalConsoleLog(...args)
    }

    const startupConnections = []

    this.connections.forEach(conn => {
      conn.status = 'disconnected'
      conn.pid = null
      if (conn.advanced.connectOnStartup) {
        startupConnections.push(conn)
      }
    })

    const runStartupConnections = async () => {
      for (const conn of startupConnections) {
        await this.connect(conn)
      }
    }

    runStartupConnections()

    ProcessManager.on('terminated', pid => {
      let conn = this.getConnectionByPid(pid)

      if (conn) {
        conn.pid = null
        conn.status = 'disconnected'
      }
    })

    ProcessManager.on('not-found', pid => {
      let conn = this.getConnectionByPid(pid)

      if (conn) {
        conn.pid = null
        conn.status = 'disconnected'

        this.notify(`'${conn.name}' was disconnected due to a connection error.\nCheck your internet connection`, 'error-icon')
      }
    })

    ProcessManager.on('timeout', conn => {
      if (fs.existsSync(conn.mountPoint)) {
        ProcessManager.getLastSpawnedProcess().then(process => {
          let foundConnection = this.connections.find(i => i.pid === process.pid)

          if (!foundConnection) {
            conn.pid = process.pid
            conn.status = 'connected'

            ProcessManager.watch(process.pid)

            this.notify(`'${conn.name}' tracked using alternative method`)
          }
        })
      } else {
        conn.pid = null
        conn.status = 'disconnected'

        this.notify(`Process Timeout: Couldn't connect to '${conn.name}'`, 'error-icon')
      }
    })
  }
}
</script>

<style lang="less" scoped>
.main-shell {
  height: 100%;
  padding: 18px;
  display: grid;
  grid-template-columns: 112px minmax(500px, 560px) minmax(420px, 1fr);
  gap: 18px;
  overflow: hidden;
  color: var(--app-text);
  font-size: 12px;
  background:
    radial-gradient(circle at 28% 0%, rgba(42, 119, 255, 0.2), transparent 34%),
    linear-gradient(135deg, var(--app-bg), var(--app-surface));
}

.main-shell.nav-collapsed {
  grid-template-columns: 72px minmax(540px, 600px) minmax(420px, 1fr);
}

.nav-rail,
.connection-panel,
.detail-panel,
.detail-card,
.info-panel,
.actions-panel,
.debug-panel {
  border: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-surface) 86%, transparent);
  box-shadow: var(--app-shadow);
}

.nav-rail {
  border-radius: 10px;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.nav-collapse {
  width: 38px;
  height: 30px;
  margin: -8px auto 6px;
  border: 0;
  border-radius: 8px;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-text) 7%, transparent);
  cursor: pointer;
}

.nav-collapse:hover {
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

.nav-collapse svg {
  fill: currentColor;
}

.brand-mark,
.connection-icon,
.detail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-primary) 38%, transparent);
}

.brand-mark {
  width: 48px;
  height: 48px;
  margin: 0 auto 18px;
  border-radius: 50%;
}

.brand-mark svg,
.connection-icon svg,
.detail-icon svg,
.nav-item svg,
.btn svg,
.action-button svg,
.icon-button svg,
.round-action svg,
.stats-bar svg,
.debug-header svg,
.search-box svg {
  fill: currentColor;
}

.nav-item {
  min-height: 76px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
}

.nav-collapsed .nav-rail {
  padding-left: 8px;
  padding-right: 8px;
}

.nav-collapsed .brand-mark {
  width: 42px;
  height: 42px;
  margin-bottom: 8px;
}

.nav-collapsed .nav-item {
  min-height: 52px;
  gap: 0;
}

.nav-collapsed .nav-label {
  display: none;
}

.nav-collapsed .service-status {
  min-height: 52px;
}

.nav-item:hover,
.nav-item.active {
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
}

.nav-item svg {
  width: 26px;
  height: 26px;
}

.service-status {
  margin-top: auto;
  min-height: 78px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-bg) 48%, transparent);
  font-size: 12px;
}

.service-status small {
  color: var(--app-muted);
}

.status-dot {
  width: 10px;
  height: 10px;
  display: inline-block;
  border-radius: 50%;
  background: var(--app-success);
  box-shadow: 0 0 14px color-mix(in srgb, var(--app-success) 60%, transparent);
}

.connection-panel,
.detail-panel {
  min-width: 0;
  border-radius: 10px;
}

.connection-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-toolbar {
  display: grid;
  grid-template-columns: 1fr 90px;
  gap: 10px;
  margin-bottom: 16px;
}

.search-box {
  min-width: 0;
  height: 46px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-bg) 46%, transparent);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: var(--app-muted);
}

.search-box input,
.sort-select {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  color: var(--app-text);
  background: transparent;
  font-size: 13px;
}

.search-box input::placeholder {
  color: var(--app-muted);
}

.sort-select {
  height: 46px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 0 12px;
  background: color-mix(in srgb, var(--app-bg) 46%, transparent);
}

.connection-list {
  overflow: auto;
  padding-right: 6px;
}

.connection-card {
  width: 100%;
  min-height: 92px;
  margin-bottom: 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 14px 12px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-bg) 46%, transparent);
  cursor: pointer;
  text-align: left;
}

.connection-card:hover,
.connection-card.active {
  border-color: color-mix(in srgb, var(--app-primary) 70%, transparent);
  background: color-mix(in srgb, var(--app-primary) 12%, var(--app-bg));
}

.connection-icon {
  width: 46px;
  height: 46px;
  border-radius: 10px;
}

.connection-main {
  min-width: 0;
  min-height: 58px;
  display: grid;
  grid-template-rows: 26px 42px;
  align-content: center;
  gap: 6px;
}

.connection-main strong {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 0;
}

.connection-meta {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 12px auto;
  align-items: center;
  gap: 12px;
}

.connection-meta.has-reorder {
  grid-template-columns: minmax(0, 1fr) auto 12px auto;
}

.connection-meta > span:first-child,
.detail-title p {
  color: var(--app-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-main b,
.detail-title b {
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  margin-right: 8px;
  padding: 2px 7px;
  border-radius: 6px;
  color: #ffffff;
  background: var(--app-primary);
}

.connection-main i,
.detail-title i {
  padding: 0 8px;
  color: color-mix(in srgb, var(--app-muted) 60%, transparent);
  font-style: normal;
}

.connection-state {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-muted);
}

.connection-state.connected {
  background: var(--app-success);
}

.connection-state.connecting,
.connection-state.disconnecting {
  background: #f7b731;
}

.connection-state.connecting {
  animation: status-pulse 1s ease-in-out infinite;
}

.reorder-actions {
  display: inline-flex;
  gap: 4px;
}

.reorder-actions button {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 7px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-text) 9%, transparent);
  cursor: pointer;
  line-height: 1;
}

.reorder-actions button:hover {
  color: var(--app-primary-text);
  background: var(--app-primary);
}

.reorder-actions button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.quick-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.round-action,
.icon-button {
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-text) 8%, transparent);
}

.round-action {
  width: 42px;
  height: 42px;
  border-radius: 50%;
}

.round-action:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.round-action.loading {
  color: #ffffff;
  background: #f7b731;
  opacity: 1;
  animation: action-pulse 1s ease-in-out infinite;
}

.round-action.primary,
.round-action:hover,
.icon-button:hover {
  color: #ffffff;
  background: var(--app-primary);
}

.round-action.favorite.active,
.icon-button.favorite.active {
  color: #f7b731;
  background: color-mix(in srgb, #f7b731 16%, transparent);
}

.detail-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.detail-topbar {
  display: flex;
  align-items: center;
}

.btn,
.action-button {
  border: 0;
  border-radius: 8px;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-text) 8%, transparent);
  cursor: pointer;
  font-weight: 600;
  font-size: 12px;
}

.primary-action,
.action-button.primary {
  min-width: 210px;
  color: var(--app-primary-text) !important;
  background: linear-gradient(135deg, var(--app-primary), color-mix(in srgb, var(--app-primary) 70%, #7aa8ff)) !important;
}

.detail-card {
  min-height: 0;
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workspace-card {
  min-height: 0;
  flex: 1;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-surface) 86%, transparent);
  box-shadow: var(--app-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-header {
  min-height: 118px;
  padding: 24px;
  border-bottom: 1px solid var(--app-border);
  display: flex;
  align-items: center;
}

.workspace-header h1 {
  margin: 0;
  font-size: 22px;
  color: var(--app-text);
}

.workspace-header p {
  margin: 8px 0 0;
  color: var(--app-muted);
}

.settings-grid,
.about-content {
  min-height: 0;
  padding: 22px;
  overflow: auto;
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 18px;
}

.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field span {
  color: var(--app-muted);
  font-size: 11px;
  text-transform: uppercase;
}

.field input,
.field select {
  height: 44px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 0 12px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-bg) 42%, transparent);
  outline: 0;
  font-size: 12px;
}

.field input:focus,
.field select:focus {
  border-color: var(--app-primary);
}

.toggle-list,
.settings-actions {
  border: 1px solid var(--app-border);
  border-radius: 9px;
  padding: 14px;
  background: color-mix(in srgb, var(--app-bg) 38%, transparent);
}

.toggle-list {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-toggle {
  min-height: 42px;
  border-radius: 8px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  color: var(--app-text);
  cursor: pointer;
}

.settings-toggle:hover {
  background: color-mix(in srgb, var(--app-text) 6%, transparent);
}

.settings-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-text {
  flex: 0 1 auto;
  min-width: 0;
  line-height: 1.35;
  color: var(--app-muted);
  font-size: 12px;
}

.switch-track {
  position: relative;
  flex: 0 0 auto;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-muted) 28%, transparent);
  border: 1px solid var(--app-border);
  transition: background 0.16s ease, border-color 0.16s ease;
}

.switch-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--app-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  transition: transform 0.16s ease, background 0.16s ease;
}

.settings-toggle input:checked + .switch-track {
  background: var(--app-primary);
  border-color: var(--app-primary);
}

.settings-toggle input:checked + .switch-track::after {
  transform: translateX(16px);
  background: var(--app-primary-text);
}

.settings-toggle input:focus-visible + .switch-track {
  outline: 2px solid color-mix(in srgb, var(--app-primary) 60%, transparent);
  outline-offset: 2px;
}

.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.workspace-footer {
  margin-top: auto;
  padding: 16px 22px;
  border-top: 1px solid var(--app-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.about-content {
  color: var(--app-muted);
}

.about-content h2 {
  margin: 24px 0 12px;
  color: var(--app-text);
  font-size: 15px;
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.library-grid button {
  min-height: 42px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-text) 7%, transparent);
  cursor: pointer;
  font-size: 12px;
}

.library-grid button:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.detail-header {
  min-height: 118px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 18px;
}

.detail-icon {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--app-primary), color-mix(in srgb, var(--app-primary) 62%, #7aa8ff));
}

.detail-title {
  min-width: 0;
  flex: 1;
}

.detail-title-main,
.detail-title-actions {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-title-main {
  align-items: flex-start;
}

.detail-title-actions {
  flex: 0 0 auto;
  justify-content: flex-end;
}

.detail-title h1 {
  margin: 0;
  font-size: 23px;
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-title p {
  min-width: 0;
  margin: 0;
  font-size: 13px;
}

.detail-title-meta {
  min-width: 0;
  margin-top: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.status-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-radius: 999px;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-text) 7%, transparent);
  border: 1px solid var(--app-border);
  font-size: 12px;
}

.status-pill .status-dot {
  background: var(--app-muted);
  box-shadow: none;
}

.status-pill.connected {
  color: var(--app-success);
  background: color-mix(in srgb, var(--app-success) 14%, transparent);
  border-color: color-mix(in srgb, var(--app-success) 35%, transparent);
}

.status-pill.connected .status-dot {
  background: var(--app-success);
  box-shadow: 0 0 14px color-mix(in srgb, var(--app-success) 60%, transparent);
}

.status-pill.connecting {
  color: #f7b731;
  background: color-mix(in srgb, #f7b731 14%, transparent);
  border-color: color-mix(in srgb, #f7b731 35%, transparent);
}

.status-pill.connecting .status-dot {
  background: #f7b731;
  animation: status-pulse 1s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% {
    transform: scale(0.82);
    box-shadow: 0 0 0 0 rgba(247, 183, 49, 0.45);
  }

  50% {
    transform: scale(1.14);
    box-shadow: 0 0 0 6px rgba(247, 183, 49, 0);
  }
}

@keyframes action-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(247, 183, 49, 0.35);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(247, 183, 49, 0);
  }
}

.icon-button {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}

.detail-body {
  min-height: 0;
  flex: 1;
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(260px, 300px);
  gap: 18px;
  overflow: auto;
}

.info-panel,
.actions-panel {
  min-width: 0;
  border-radius: 9px;
  padding: 16px;
}

.info-panel {
  min-width: 320px;
}

.info-row {
  min-height: 48px;
  border-bottom: 1px solid var(--app-border);
  display: grid;
  grid-template-columns: minmax(92px, 0.75fr) minmax(120px, 1.25fr);
  align-items: center;
  gap: 16px;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-row span {
  color: var(--app-muted);
}

.info-row strong {
  color: var(--app-text);
  text-align: right;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions-panel {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.actions-panel h2 {
  margin: 0 0 6px;
  font-size: 15px;
  color: var(--app-text);
}

.action-button {
  width: 100%;
  justify-content: flex-start;
  padding: 0 14px;
}

.action-button:hover {
  background: color-mix(in srgb, var(--app-primary) 18%, transparent);
}

.action-button.danger {
  color: var(--app-danger);
}

.action-button.loading {
  animation: action-pulse 1s ease-in-out infinite;
}

.action-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stats-bar {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--app-muted);
  font-size: 12px;
}

.stats-bar span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-text) 7%, transparent);
}

.stats-bar .success {
  color: var(--app-success);
}

.stats-bar .warning .status-dot {
  background: #f7b731;
}

.debug-panel {
  height: 170px;
  border-radius: 9px;
  overflow: hidden;
  flex: 0 0 auto;
}

.debug-header {
  height: 38px;
  padding: 0 10px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--app-muted);
  border-bottom: 1px solid var(--app-border);
}

.debug-header button {
  width: 28px;
  height: 28px;
  margin-left: 4px;
  border: 0;
  border-radius: 50%;
  color: var(--app-muted);
  background: transparent;
  cursor: pointer;
}

.debug-panel textarea {
  width: 100%;
  height: calc(100% - 38px);
  background: transparent;
  border: none;
  font-family: 'Consolas', 'Courier New', Courier, monospace;
  padding: 10px;
  color: #2fff54;
  outline: none;
  resize: none;
}

.empty-list,
.empty-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--app-muted);
  text-align: center;
}

.empty-list svg,
.empty-detail svg {
  width: 54px;
  height: 54px;
  fill: currentColor;
}

.empty-list h1,
.empty-detail h1 {
  margin: 0;
  color: var(--app-text);
  font-size: 17px;
}

.empty-list p,
.empty-detail p {
  margin: 0;
}

@media (max-width: 1180px) {
  .main-shell {
    grid-template-columns: 88px minmax(430px, 500px) minmax(420px, 1fr);
    padding: 12px;
    gap: 12px;
  }

  .main-shell.nav-collapsed {
    grid-template-columns: 64px minmax(460px, 520px) minmax(400px, 1fr);
  }

  .detail-body {
    grid-template-columns: 1fr;
  }

  .actions-panel {
    align-self: stretch;
  }
}
</style>
