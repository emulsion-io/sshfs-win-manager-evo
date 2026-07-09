<template>
  <Window title="SSHFS Manager Evo" closeAction="hide" minimizable @close="showRunningInBackgroundNotification">
    <div class="main-shell" :class="{ 'compact-mode': appSettings.compactMode, 'detail-collapsed': isDetailPanelCollapsed }">
      <aside class="nav-rail">
        <div class="brand-mark">
          <Icon icon="sshfsLogo"/>
        </div>

        <button class="nav-item" :class="{ active: activeSection === 'connections' }" type="button" @click="showConnections">
          <Icon icon="sshfsFolder"/>
          <span class="nav-label">{{ $t('nav.connections') }}</span>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'favorites' }" type="button" @click="showFavorites">
          <Icon icon="star"/>
          <span class="nav-label">{{ $t('nav.favorites') }}</span>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'settings' }" type="button" @click="showSettings">
          <Icon icon="settings"/>
          <span class="nav-label">{{ $t('nav.settings') }}</span>
        </button>

        <button class="nav-item" :class="{ active: activeSection === 'about' }" type="button" @click="showAbout">
          <Icon icon="help"/>
          <span class="nav-label">{{ $t('nav.about') }}</span>
        </button>

        <div class="service-status">
          <span class="status-dot"></span>
          <strong>{{ $t('app.serviceActiveShort') }}</strong>
          <span class="service-status-tooltip">{{ $t('app.serviceActive') }} · v{{ appVersion }}</span>
        </div>
      </aside>

      <section class="connection-panel">
        <div class="panel-toolbar" :class="{ 'has-edit-toggle': sortMode === 'manual' }">
          <label class="search-box">
            <Icon icon="info"/>
            <input v-model="searchText" type="search" :placeholder="$t('list.searchPlaceholder')">
          </label>

          <button
            v-if="sortMode === 'manual'"
            class="edit-toggle"
            :class="{ active: isEditModeEnabled }"
            type="button"
            @click="listMode = isEditModeEnabled ? 'none' : 'edit'"
          >
            {{ isEditModeEnabled ? $t('list.editDone') : $t('list.editOrder') }}
          </button>

          <select v-model="sortMode" class="sort-select" @change="handleSortModeChange">
            <option value="name">A-Z</option>
            <option value="status">{{ $t('list.sortStatus') }}</option>
            <option value="manual">{{ $t('list.sortManual') }}</option>
          </select>
        </div>

        <div v-if="!hasConnections" class="empty-list">
          <Icon icon="sshfsFolder"/>
          <h1>{{ $t('list.emptyTitle') }}</h1>
          <p>{{ $t('list.emptyText') }}</p>
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
              <img v-if="conn.iconDataUrl" :src="conn.iconDataUrl" :alt="conn.name">
              <Icon v-else icon="sshfsFolder"/>
            </span>

            <span class="connection-main">
              <strong>{{ conn.name }}</strong>
              <span class="connection-meta" :class="{ 'has-reorder': sortMode === 'manual' && isEditModeEnabled }">
                <span>
                  <b>{{ mountPointLabel(conn) }}</b>
                  <span class="connection-target">
                    {{ conn.host }}
                    <i>&middot;</i>
                    {{ conn.folder || '/' }}
                  </span>
                </span>

                <span v-if="sortMode === 'manual' && isEditModeEnabled" class="reorder-actions">
                  <button
                    type="button"
                    :disabled="!canMoveConnection(conn, -1)"
                    v-tooltip="$t('list.moveUp')"
                    @click.stop="moveConnection(conn, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    :disabled="!canMoveConnection(conn, 1)"
                    v-tooltip="$t('list.moveDown')"
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
                    v-tooltip="conn.favorite ? $t('list.removeFavorite') : $t('list.addFavorite')"
                    @click.stop="toggleFavorite(conn)"
                  >
                    <Icon icon="star"/>
                  </button>
                  <button
                    type="button"
                    class="round-action open-folder"
                    :disabled="conn.status !== 'connected'"
                    v-tooltip="$t('common.openFolder')"
                    @click.stop="openLocal(getLocalMountPath(conn))"
                  >
                    <Icon icon="openFolder"/>
                  </button>
                  <button
                    type="button"
                    class="round-action open-terminal"
                    :disabled="conn.status !== 'connected'"
                    v-tooltip="$t('common.openTerminal')"
                    @click.stop="openTerminal(conn)"
                  >
                    <span>&gt;_</span>
                  </button>
                  <button
                    v-if="conn.status === 'connected'"
                    type="button"
                    class="round-action primary"
                    v-tooltip="$t('common.disconnect')"
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
                    v-tooltip="conn.status === 'connecting' ? $t('common.connecting') : $t('common.connect')"
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

      <section class="detail-panel" :class="{ collapsed: isDetailPanelCollapsed, 'can-collapse': canCollapseDetailPanel }">
        <button
          class="detail-collapse-handle"
          type="button"
          :title="isDetailPanelCollapsed ? $t('detail.expandPanel') : $t('detail.collapsePanel')"
          @click="toggleDetailPanel"
        >
          {{ isDetailPanelCollapsed ? '›' : '‹' }}
        </button>

        <div class="detail-topbar">
          <button class="btn primary-action" type="button" @click="addNewConnection">
            <Icon icon="plus"/>
            {{ $t('detail.newConnection') }}
          </button>
        </div>

        <div v-if="activeSection === 'settings'" class="workspace-card settings-workspace">
          <header class="workspace-header">
            <div>
              <h1>{{ $t('settings.title') }}</h1>
              <p>{{ $t('settings.subtitle') }}</p>
            </div>
          </header>

          <div class="settings-grid">
            <label class="field">
              <span>{{ $t('settings.sshfsBinary') }}</span>
              <input v-model="settingsForm.sshfsBinary" type="text" :placeholder="sshfsBinaryPlaceholder">
            </label>

            <label class="field compact">
              <span>{{ $t('settings.processTimeout') }}</span>
              <input v-model.number="settingsForm.processTrackTimeout" type="number" min="1">
            </label>

            <label class="field">
              <span>{{ $t('settings.theme') }}</span>
              <select v-model="settingsForm.theme" @change="previewTheme(settingsForm.theme)">
                <optgroup v-for="group in themeGroups" :key="group.label" :label="group.label">
                  <option v-for="theme in group.themes" :key="theme.value" :value="theme.value">{{ theme.label }}</option>
                </optgroup>
              </select>
            </label>

            <label class="field compact">
              <span>{{ $t('settings.language') }}</span>
              <select v-model="settingsForm.language" @change="previewLanguage(settingsForm.language)">
                <option v-for="locale in localeOptions" :key="locale.value" :value="locale.value">{{ $t(locale.labelKey) }}</option>
              </select>
            </label>

            <label class="field compact">
              <span>{{ $t('settings.passkeyRetention') }}</span>
              <select v-model="settingsForm.passkeyRetention">
                <option value="always">{{ $t('settings.passkeyAlways') }}</option>
                <option value="1h">{{ $t('settings.passkey1h') }}</option>
                <option value="12h">{{ $t('settings.passkey12h') }}</option>
                <option value="1d">{{ $t('settings.passkey1d') }}</option>
                <option value="2d">{{ $t('settings.passkey2d') }}</option>
              </select>
            </label>

            <div class="toggle-list">
              <label class="settings-toggle">
                <input v-model="settingsForm.startupWithOS" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">{{ $t('settings.startupWithOS') }}</span>
              </label>
              <label class="settings-toggle">
                <input v-model="settingsForm.displayTrayMessageOnClose" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">{{ $t('settings.displayTrayMessageOnClose') }}</span>
              </label>
              <label class="settings-toggle">
                <input v-model="settingsForm.showDebugPanel" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">{{ $t('settings.showDebugPanel') }}</span>
              </label>
              <label class="settings-toggle">
                <input v-model="settingsForm.compactMode" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">{{ $t('settings.compactMode') }}</span>
              </label>
              <label class="settings-toggle">
                <input v-model="settingsForm.demoMode" type="checkbox">
                <span class="switch-track"></span>
                <span class="toggle-text">{{ $t('settings.demoMode') }}</span>
              </label>
            </div>

            <div class="settings-actions">
              <button class="action-button" type="button" @click="exportConnections">
                <Icon icon="duplicate"/>
                {{ $t('settings.exportJson') }}
              </button>
              <button class="action-button" type="button" @click="importConnections">
                <Icon icon="openFolder"/>
                {{ $t('settings.importJson') }}
              </button>
              <button class="action-button" type="button" @click="importLegacyConfiguration">
                <Icon icon="duplicate"/>
                {{ $t('settings.importLegacy') }}
              </button>
            </div>

            <div class="settings-form-actions">
              <button class="btn" type="button" @click="resetSettingsForm">{{ $t('common.cancel') }}</button>
              <button class="btn primary-action" type="button" @click="saveSettings">{{ $t('common.save') }}</button>
            </div>
          </div>
        </div>

        <div v-else-if="activeSection === 'about'" class="workspace-card about-workspace">
          <header class="workspace-header">
            <div>
              <h1>SSHFS Manager Evo</h1>
              <p>{{ $t('about.versionLine', { version: appVersion }) }}</p>
            </div>
          </header>

          <div class="about-content">
            <p>{{ $t('about.maintainedBy') }}</p>
            <p>{{ $t('about.website') }} <button class="text-link" type="button" @click="openExternal('https://emulsion.io')">emulsion.io</button></p>
            <p>{{ $t('about.basedOn') }}</p>
            <p>{{ $t('about.license') }}</p>

            <h2>{{ $t('about.libraries') }}</h2>
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
            <span class="detail-icon-wrap">
              <button class="detail-icon" type="button" v-tooltip="$t('detail.changeIcon')" @click="selectConnectionIcon(selectedConnection)">
                <img v-if="selectedConnection.iconDataUrl" :src="selectedConnection.iconDataUrl" :alt="selectedConnection.name">
                <Icon v-else icon="sshfsFolder"/>
              </button>
              <button
                v-if="selectedConnection.iconDataUrl"
                class="detail-icon-remove"
                type="button"
                v-tooltip="$t('detail.removeIcon')"
                @click="removeConnectionIcon(selectedConnection)"
              >
                ×
              </button>
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
                  <button type="button" class="icon-button" v-tooltip="$t('common.edit')" @click="editConnection(selectedConnection)">
                    <Icon icon="pen"/>
                  </button>
                  <button
                    type="button"
                    class="icon-button favorite"
                    :class="{ active: selectedConnection.favorite }"
                    v-tooltip="selectedConnection.favorite ? $t('list.removeFavorite') : $t('list.addFavorite')"
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
                <span>{{ $t('detail.status') }}</span>
                <strong>{{ statusLabel(selectedConnection) }}</strong>
              </div>
              <div class="info-row">
                <span>{{ $t('detail.connectionType') }}</span>
                <strong>SSHFS</strong>
              </div>
              <div class="info-row">
                <span>{{ $t('detail.address') }}</span>
                <strong>{{ selectedConnection.host }}</strong>
              </div>
              <div class="info-row">
                <span>{{ $t('detail.port') }}</span>
                <strong>{{ selectedConnection.port || 22 }}</strong>
              </div>
              <div class="info-row">
                <span>{{ $t('detail.mountPoint') }}</span>
                <strong>{{ mountPointLabel(selectedConnection) }}</strong>
              </div>
              <div class="info-row">
                <span>{{ $t('detail.remotePath') }}</span>
                <strong>{{ selectedConnection.folder || '/' }}</strong>
              </div>
              <div class="info-row">
                <span>{{ $t('detail.user') }}</span>
                <strong>{{ selectedConnection.user || '-' }}</strong>
              </div>
              <div class="info-row ssh-command-row">
                <span>{{ $t('detail.sshCommand') }}</span>
                <strong>
                  <button type="button" v-tooltip="$t('detail.copySshCommand')" @click="copySshCommand(selectedConnection)">
                    <Icon icon="duplicate"/>
                  </button>
                </strong>
              </div>
            </div>

            <aside class="actions-panel">
              <h2>{{ $t('detail.actions') }}</h2>
              <button
                v-if="selectedConnection.status === 'connected'"
                class="action-button primary"
                type="button"
                @click="disconnect(selectedConnection)"
              >
                <Icon icon="plugConnected"/>
                {{ $t('common.disconnect') }}
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
                {{ selectedConnection.status === 'connecting' ? $t('common.connecting') : $t('common.connect') }}
              </button>
              <button class="action-button" type="button" @click="editConnection(selectedConnection)">
                <Icon icon="pen"/>
                {{ $t('common.edit') }}
              </button>
              <button class="action-button" type="button" @click="cloneConnection(selectedConnection)">
                <Icon icon="duplicate"/>
                {{ $t('common.duplicate') }}
              </button>
              <button
                class="action-button"
                type="button"
                :disabled="selectedConnection.status !== 'connected'"
                @click="openLocal(getLocalMountPath(selectedConnection))"
              >
                <Icon icon="openFolder"/>
                {{ $t('common.openFolder') }}
              </button>
              <button
                class="action-button"
                type="button"
                :disabled="selectedConnection.status !== 'connected'"
                @click="openTerminal(selectedConnection)"
              >
                <span class="terminal-glyph">&gt;_</span>
                {{ $t('common.openTerminal') }}
              </button>
              <button class="action-button danger" type="button" @click="deleteConnection(selectedConnection)">
                <Icon icon="trashCan"/>
                {{ $t('common.delete') }}
              </button>
            </aside>
          </div>
        </div>

        <div v-else class="empty-detail">
          <Icon icon="sshfsFolder"/>
          <h1>{{ $t('detail.selectTitle') }}</h1>
          <p>{{ $t('detail.selectText') }}</p>
        </div>

        <div class="stats-bar">
          <span><Icon icon="sshfsFolder"/> {{ $t('detail.connectionsCount', { count: connections.length }) }}</span>
          <span class="success"><span class="status-dot"></span> {{ $t('detail.connectedCount', { count: connectedConnections.length }) }}</span>
          <span class="warning"><span class="status-dot"></span> {{ $t('detail.busyCount', { count: busyConnections.length }) }}</span>
        </div>

        <div v-show="appSettings.showDebugPanel" class="debug-panel">
          <div class="debug-header">
            <strong>{{ $t('detail.debugOutput') }}</strong>
            <span>
              <button type="button" v-tooltip="$t('detail.clearDebug')" @click="clearDebugOutput">
                <Icon icon="unavailable"/>
              </button>
              <button type="button" v-tooltip="$t('detail.copyDebug')" @click="copyDebugOutput">
                <Icon icon="duplicate"/>
              </button>
            </span>
          </div>
          <textarea v-model="debugOutput" readonly ref="debugOutput"></textarea>
        </div>
      </section>
    </div>

    <div v-if="notificationToast" class="app-toast" :class="notificationToast.type">
      {{ notificationToast.text }}
    </div>
  </Window>
</template>

<script>
import fs from 'fs'
import { ipcRenderer } from 'electron'

import { v4 as uuid } from 'uuid'

import ProcessManager from '@/ProcessManager.js'
import SecretManager from '@/SecretManager.js'
import { setLocale } from '@/i18n/index.js'
import { supportedLocaleOptions } from '@/i18n/locales.js'
import { defaultSettings, normalizeSettings } from '@/store/SettingsDefaults.js'
import { currentPlatform, getConnectionMountPoint } from '@/platform/index.js'

import Window from '@/components/Window/index.vue'
import Icon from '@/components/Icon.vue'

function createDemoConnections () {
  const names = [
    ['Production Web', 'prod.web.example.com', '/var/www/current', 'P:', 'connected', true],
    ['Staging API', 'staging-api.example.net', '/srv/api', 'S:', 'connected', false],
    ['Backups Vault', 'backup01.example.org', '/data/backups', 'B:', 'disconnected', true],
    ['Client Alpha', 'alpha.sftp.demo', '/home/clients/alpha', 'A:', 'connected', false],
    ['Client Bravo', 'bravo.sftp.demo', '/home/clients/bravo', 'R:', 'connecting', true],
    ['Media Storage', 'media.internal.demo', '/mnt/media', 'M:', 'connected', false],
    ['Logs Central', 'logs.internal.demo', '/var/log', 'L:', 'disconnected', false],
    ['Shop Front', 'shop.example.com', '/var/www/shop', 'H:', 'connected', true],
    ['Archives 2026', 'archive.example.net', '/archives/2026', 'V:', 'disconnected', false],
    ['Design Assets', 'assets.example.io', '/projects/assets', 'D:', 'connected', true],
    ['Monitoring', 'monitoring.internal', '/opt/monitoring', 'N:', 'connecting', false],
    ['Dev Sandbox', 'sandbox.local', '/home/dev/sandbox', 'X:', 'disconnected', true],
    ['Invoices', 'billing.example.com', '/secure/invoices', 'I:', 'connected', false],
    ['Legacy Server', 'legacy.example.org', '/srv/legacy', 'G:', 'disconnected', false],
    ['Team Shared', 'team-share.internal', '/shared/team', 'T:', 'connected', true]
  ]

  return names.map(([name, host, folder, mountPoint, status, favorite], index) => ({
    uuid: `demo-connection-${index + 1}`,
    demo: true,
    name,
    host,
    port: index % 3 === 0 ? 2222 : 22,
    user: index % 2 === 0 ? 'demo' : 'deploy',
    folder,
    mountPoint,
    preferredMountPoint: mountPoint,
    authType: index % 4 === 0 ? 'key-file' : 'password',
    favorite,
    status,
    pid: status === 'connected' ? 9000 + index : null,
    iconDataUrl: null,
    advanced: {
      customCmdlOptionsEnabled: false,
      customCmdlOptions: [],
      connectOnStartup: index % 5 === 0,
      reconnect: index % 4 === 0
    }
  }))
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
      if (this.detailPanelCollapsed) {
        this.detailPanelCollapsed = false
        this.resizeForDetailPanel(false)
      }
      this.settingsForm = normalizeSettings(this.appSettings)
    },

    showAbout () {
      this.activeSection = 'about'
      if (this.detailPanelCollapsed) {
        this.detailPanelCollapsed = false
        this.resizeForDetailPanel(false)
      }
    },

    toggleDetailPanel () {
      const nextCollapsed = !this.detailPanelCollapsed
      const layout = this.getMeasuredLayout()

      if (nextCollapsed) {
        this.detailPanelResizeDelta = Math.max(0, Math.round(layout.detailWidth - layout.collapsedDetailWidth))
      }

      this.detailPanelCollapsed = nextCollapsed
      this.resizeForDetailPanel(nextCollapsed, this.detailPanelResizeDelta, this.getDetailPanelTargetWidth(nextCollapsed, layout))
    },

    resizeForDetailPanel (collapsed, delta = this.detailPanelResizeDelta, width = 0) {
      ipcRenderer.send('main-window:set-detail-collapsed', {
        collapsed,
        delta,
        width,
        minWidth: collapsed ? Math.max(540, width) : 1100
      })
    },

    getMeasuredLayout () {
      const shell = this.$el
      const shellStyle = window.getComputedStyle(shell)
      const nav = shell.querySelector('.nav-rail')
      const list = shell.querySelector('.connection-panel')
      const detail = shell.querySelector('.detail-panel')
      const shellPaddingLeft = parseFloat(shellStyle.paddingLeft) || 0
      const shellPaddingRight = parseFloat(shellStyle.paddingRight) || 0
      const gridGap = parseFloat(shellStyle.columnGap || shellStyle.gap) || 0
      const navWidth = nav ? nav.getBoundingClientRect().width : 0
      const listWidth = list ? list.getBoundingClientRect().width : 0
      const detailWidth = detail ? detail.getBoundingClientRect().width : 0

      return {
        shellPadding: shellPaddingLeft + shellPaddingRight,
        gridGap,
        navWidth,
        listWidth,
        detailWidth,
        collapsedDetailWidth: 10
      }
    },

    getDetailPanelTargetWidth (collapsed, measuredLayout = this.getMeasuredLayout()) {
      if (!collapsed) {
        return 0
      }

      return Math.round(
        measuredLayout.shellPadding +
        (measuredLayout.gridGap * 2) +
        measuredLayout.navWidth +
        measuredLayout.listWidth +
        measuredLayout.collapsedDetailWidth
      )
    },

    handleSortModeChange () {
      if (this.sortMode !== 'manual') {
        this.listMode = 'none'
      }
    },

    toggleFavorite (conn) {
      conn.favorite = !conn.favorite
      this.$store.dispatch('UPDATE_CONNECTION', conn)
    },

    async selectConnectionIcon (conn) {
      const iconDataUrl = await ipcRenderer.invoke('dialog:select-connection-icon')

      if (!iconDataUrl) {
        return
      }

      this.$store.dispatch('UPDATE_CONNECTION', {
        ...conn,
        iconDataUrl
      })
    },

    removeConnectionIcon (conn) {
      this.$store.dispatch('UPDATE_CONNECTION', {
        ...conn,
        iconDataUrl: null
      })
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
      this.previewLanguage(this.settingsForm.language)
    },

    previewLanguage (language) {
      setLocale(language)
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
        window.alert(this.$t('settings.exportFailed'))
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
        window.alert(this.$t('settings.invalidImportJson'))
        return
      }

      const connections = Array.isArray(data) ? data : data.connections

      if (!Array.isArray(connections)) {
        window.alert(this.$t('settings.invalidImportConnections'))
        return
      }

      if (!window.confirm(this.$t('settings.importConfirm', { count: connections.length }))) {
        return
      }

      this.$store.dispatch('IMPORT_CONNECTIONS', connections)
    },

    async importLegacyConfiguration () {
      const result = await ipcRenderer.invoke('legacy-config:import')

      if (!result.found) {
        window.alert(this.$t('settings.legacyImportNotFound'))
        return
      }

      if (result.error) {
        window.alert(this.$t('settings.legacyImportReadFailed', { error: result.error }))
        return
      }

      const connections = Array.isArray(result.connections) ? result.connections : []

      if (!connections.length) {
        window.alert(this.$t('settings.legacyImportEmpty'))
        return
      }

      const hasPasswords = connections.some(conn => conn && conn.password)
      const message = hasPasswords
        ? this.$t('settings.legacyImportConfirmWithPasswords', { count: connections.length, filePath: result.filePath })
        : this.$t('settings.legacyImportConfirm', { count: connections.length, filePath: result.filePath })

      if (!window.confirm(message)) {
        return
      }

      const importedConnections = this.prepareLegacyConnections(connections)
      const mergedConnections = [
        ...this.connections,
        ...importedConnections
      ]

      this.$store.dispatch('IMPORT_CONNECTIONS', mergedConnections)
      this.sortMode = 'manual'

      if (importedConnections[0]) {
        this.selectedConnectionUuid = importedConnections[0].uuid
        this.activeSection = 'connections'
      }

      this.notify(this.$t('notifications.legacyImportDone', { count: importedConnections.length }))
    },

    prepareLegacyConnections (connections) {
      const existingUuids = new Set(this.connections.map(conn => conn.uuid))

      return connections.map(conn => {
        const imported = JSON.parse(JSON.stringify(conn))

        if (!imported.uuid || existingUuids.has(imported.uuid)) {
          imported.uuid = uuid()
        }

        existingUuids.add(imported.uuid)

        imported.status = 'disconnected'
        imported.pid = 0
        imported.favorite = typeof imported.favorite === 'boolean' ? imported.favorite : false
        imported.iconDataUrl = typeof imported.iconDataUrl === 'string' ? imported.iconDataUrl : null
        imported.preferredMountPoint = imported.preferredMountPoint || null
        imported.mountPoint = imported.mountPoint || imported.preferredMountPoint || 'auto'
        imported.advanced = {
          customCmdlOptionsEnabled: false,
          customCmdlOptions: [],
          connectOnStartup: false,
          reconnect: false,
          ...(imported.advanced || {})
        }

        if (!imported.authType) {
          imported.authType = imported.keyFile ? 'key-file' : 'password'
        }

        return imported
      })
    },

    openExternal (url) {
      ipcRenderer.invoke('shell:open-external', url)
    },

    dragConnection (uuid) {
      this.draggedConnectionUuid = uuid
    },

    dropConnection (uuid) {
      if (this.appSettings.demoMode) {
        this.draggedConnectionUuid = null
        return
      }

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
      if (this.appSettings.demoMode) {
        return
      }

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

    async prepareConnectionForConnect (conn) {
      if (conn.authType !== 'password') {
        return conn
      }

      if (conn.secrets && conn.secrets.password) {
        try {
          const password = await SecretManager.decryptSecret(conn.secrets.password, this.appSettings)

          return password === null
            ? null
            : { ...conn, password }
        } catch {
          SecretManager.lock()
          this.notify(this.$t('notifications.passkeyInvalid'), 'error-icon')
          return null
        }
      }

      if (!conn.password) {
        const password = await this.requestConnectionPassword(conn)

        if (!password) {
          return null
        }

        const activePasskey = await SecretManager.getPasskey(this.appSettings, this.getFirstEncryptedPassword() ? 'unlock' : 'create')

        if (!activePasskey) {
          return null
        }

        const encrypted = SecretManager.encryptWithPasskey(password, activePasskey)

        this.$store.dispatch('UPDATE_CONNECTION', {
          ...conn,
          password: '',
          secrets: {
            ...(conn.secrets || {}),
            password: encrypted
          }
        })

        return { ...conn, password }
      }

      return conn
    },

    requestConnectionPassword (conn) {
      return new Promise(resolve => {
        ipcRenderer.once('password-prompt:response', (event, data) => {
          switch (data.message) {
            case 'connection-password':
              resolve(data.password)
              break

            case 'connection-password-cancel':
            default:
              resolve(null)
              break
          }
        })

        ipcRenderer.invoke('window:open', {
          name: 'password-prompt-window',
          route: `#/password-prompt/${conn.uuid}`,
          options: {
            height: 210,
            width: 350,
            useContentSize: true,
            frame: false,
            maximizable: false,
            minimizable: false,
            resizable: false,
            modal: true
          }
        })
      })
    },

    async migratePlainTextPasswords () {
      const plainPasswordConnections = this.$store.state.Data.connections.filter(conn => conn.authType === 'password' && conn.password)
      const existingEncryptedSecret = this.getFirstEncryptedPassword()

      if (!plainPasswordConnections.length) {
        return
      }

      const activePasskey = await SecretManager.getPasskey(this.appSettings, existingEncryptedSecret ? 'unlock' : 'create')

      if (!activePasskey) {
        return
      }

      if (existingEncryptedSecret) {
        try {
          SecretManager.decryptWithPasskey(existingEncryptedSecret, activePasskey)
        } catch {
          SecretManager.lock()
          this.notify(this.$t('notifications.passkeyInvalid'), 'error-icon')
          return
        }
      }

      for (const conn of plainPasswordConnections) {
        const encrypted = SecretManager.encryptWithPasskey(conn.password, activePasskey)

        this.$store.dispatch('UPDATE_CONNECTION', {
          ...conn,
          password: '',
          secrets: {
            ...(conn.secrets || {}),
            password: encrypted
          }
        })
      }
    },

    getFirstEncryptedPassword () {
      const conn = this.$store.state.Data.connections.find(conn => conn.secrets && conn.secrets.password)

      return conn && conn.secrets.password
    },

    async unlockEncryptedSecretsAtStartup () {
      const existingEncryptedSecret = this.getFirstEncryptedPassword()

      if (!existingEncryptedSecret || SecretManager.isUnlocked()) {
        return
      }

      try {
        await SecretManager.decryptSecret(existingEncryptedSecret, this.appSettings)
      } catch {
        SecretManager.lock()
        this.notify(this.$t('notifications.passkeyInvalid'), 'error-icon')
      }
    },

    connect (conn) {
      if (this.appSettings.demoMode && conn.demo) {
        conn.status = 'connected'
        conn.pid = 9000
        this.selectConnection(conn)
        return Promise.resolve()
      }

      return new Promise(async resolve => {
        const connToConnect = await this.prepareConnectionForConnect(conn)

        if (!connToConnect) {
          resolve()
          return
        }

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

            this.notify(this.$t('notifications.cannotConnect', { name: conn.name, error }), 'error-icon')
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
          connect(connToConnect)
        }
      })
    },

    disconnect (conn) {
      if (this.appSettings.demoMode && conn.demo) {
        conn.status = 'disconnected'
        conn.pid = null
        return
      }

      conn.status = 'disconnecting'

      ProcessManager.terminate(conn.pid, conn).then(() => {
        conn.status = 'disconnected'

        this.updateConnectionList()
      })
    },

    openLocal (path) {
      if (this.appSettings.demoMode) {
        return
      }

      if (path) {
        ipcRenderer.invoke('shell:open-path', path)
      }
    },

    async openTerminal (conn) {
      if (this.appSettings.demoMode) {
        return
      }

      if (!conn) {
        return
      }

      const terminalConnection = await this.prepareConnectionForTerminal(conn)

      if (!terminalConnection) {
        return
      }

      try {
        await ipcRenderer.invoke('shell:open-ssh-terminal', {
          tabbyQuery: this.getTabbyQuickConnectQuery(terminalConnection),
          sshArgs: this.getSshArgs(terminalConnection)
        })
      } catch (error) {
        this.notify(this.$t('notifications.terminalOpenFailed', { error: error.message || error }), 'error-icon')
      }
    },

    async prepareConnectionForTerminal (conn) {
      if (conn.authType !== 'password' && conn.authType !== 'password-ask') {
        return conn
      }

      const connectionWithPassword = conn.authType === 'password'
        ? await this.prepareConnectionForConnect(conn)
        : {
            ...conn,
            password: await this.requestConnectionPassword(conn)
          }

      if (!connectionWithPassword || !connectionWithPassword.password) {
        return null
      }

      ipcRenderer.send('clipboard:write-text', connectionWithPassword.password)
      this.notify(this.$t('notifications.terminalPasswordCopied'))

      return connectionWithPassword
    },

    getLocalMountPath (conn) {
      return getConnectionMountPoint(conn)
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
      if (this.appSettings.demoMode && conn.demo) {
        return
      }

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
      if (this.appSettings.demoMode && conn.demo) {
        return
      }

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
      if (this.appSettings.demoMode && conn.demo) {
        return
      }

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

    showRunningInBackgroundNotification () {
      if (!this.runningInBackgroundNotificationShowed) {
        if (this.$store.state.Settings.settings.displayTrayMessageOnClose) {
          this.runningInBackgroundNotificationShowed = true
        }
      }
    },

    notify (text, icon = null) {
      if (this.notificationTimer) {
        clearTimeout(this.notificationTimer)
      }

      this.notificationToast = {
        text,
        type: icon === 'error-icon' ? 'error' : 'info'
      }

      this.notificationTimer = setTimeout(() => {
        this.notificationToast = null
        this.notificationTimer = null
      }, 4500)
    },

    getConnectionByPid (pid) {
      return this.connections.find(a => a.pid === pid)
    },

    clearDebugOutput () {
      this.debugOutput = ''
    },

    copyDebugOutput () {
      ipcRenderer.send('clipboard:write-text', this.debugOutput)

      this.notify(this.$t('notifications.debugCopied'))
    },

    copySshCommand (conn) {
      ipcRenderer.send('clipboard:write-text', this.getSshCommand(conn))

      this.notify(this.$t('notifications.sshCommandCopied'))
    },

    getSshArgs (conn) {
      const args = [
        '-p',
        String(conn.port || 22)
      ]

      if (this.isKeyAuthConnection(conn) && conn.keyFile) {
        args.push('-i', conn.keyFile)
      }

      if (conn.authType === 'interactive') {
        args.push(
          '-o',
          'PreferredAuthentications=keyboard-interactive',
          '-o',
          'PasswordAuthentication=no'
        )
      }

      if (conn.authType === 'key-file-interactive' || conn.authType === 'key-file-passphrase-interactive') {
        args.push(
          '-o',
          'PreferredAuthentications=publickey,keyboard-interactive',
          '-o',
          'PasswordAuthentication=no'
        )
      }

      args.push(`${conn.user || ''}@${conn.host || ''}`)

      return args
    },

    getSshCommand (conn) {
      const args = [
        'ssh',
        ...this.getSshArgs(conn)
      ]

      return args.map(this.shellQuote).join(' ')
    },

    getTabbyQuickConnectQuery (conn) {
      const user = conn.user ? `${conn.user}@` : ''
      const host = String(conn.host || '')
      const tabbyHost = host.includes(':') && !host.startsWith('[')
        ? `[${host}]`
        : host

      return `${user}${tabbyHost}:${conn.port || 22}`
    },

    isKeyAuthConnection (conn) {
      return [
        'key-file',
        'key-file-passphrase',
        'key-file-interactive',
        'key-file-passphrase-interactive'
      ].includes(conn.authType)
    },

    shellQuote (value) {
      const text = String(value)

      if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(text)) {
        return text
      }

      return `"${text.replace(/(["\\$`])/g, '\\$1')}"`
    },

    updateConnectionList () {
      this.$store.dispatch('REFRESH_CONNECTIONS', this.connections)
    },

    mountPointLabel (conn) {
      const mountPoint = getConnectionMountPoint(conn)

      return mountPoint === 'auto' ? 'Auto' : (mountPoint || 'Auto')
    },

    statusLabel (conn) {
      switch (conn.status) {
        case 'connected':
          return this.$t('status.connected')
        case 'connecting':
          return this.$t('status.connecting')
        case 'disconnecting':
          return this.$t('status.disconnecting')
        default:
          return this.$t('status.disconnected')
      }
    }
  },

  computed: {
    hasConnections () {
      return this.connections.length > 0
    },

    isEditModeEnabled () {
      return this.sortMode === 'manual' && this.listMode === 'edit'
    },

    isDeleteModeEnabled () {
      return this.listMode === 'delete'
    },

    connections () {
      if (this.appSettings.demoMode) {
        return this.demoConnections
      }

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

        items = [...items].sort((a, b) => (weight[a.status] ?? 9) - (weight[b.status] ?? 9) || a.name.localeCompare(b.name))
      }

      return items
    },

    selectedConnection () {
      return this.connections.find(conn => conn.uuid === this.selectedConnectionUuid) || this.filteredConnections[0] || null
    },

    connectedConnections () {
      return this.connections.filter(conn => conn.status === 'connected')
    },

    busyConnections () {
      return this.connections.filter(conn => conn.status === 'connecting' || conn.status === 'disconnecting')
    },

    canCollapseDetailPanel () {
      return true
    },

    isDetailPanelCollapsed () {
      return this.detailPanelCollapsed
    },

    appSettings () {
      return this.$store.state.Settings.settings
    },

    sshfsBinaryPlaceholder () {
      return currentPlatform.sshfsBinary
    }
  },

  watch: {
    filteredConnections: {
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
    },

    'appSettings.compactMode' () {
      if (this.detailPanelCollapsed) {
        this.$nextTick(() => {
          this.resizeForDetailPanel(true, 0, this.getDetailPanelTargetWidth(true))
        })
      }
    }
  },

  data () {
    return {
      activeSection: 'connections',
      detailPanelCollapsed: false,
      detailPanelResizeDelta: 0,
      listMode: 'none',
      sortMode: 'name',
      searchText: '',
      settingsForm: { ...defaultSettings },
      demoConnections: createDemoConnections(),
      themeGroups: [
        {
          label: 'Dark',
          themes: [
            { value: 'dark-graphite', label: 'Graphite' },
            { value: 'dark-midnight', label: 'Midnight' },
            { value: 'dark-aurora', label: 'Aurora' },
            { value: 'dark-github-desktop', label: 'GitHub Desktop' },
            { value: 'dark-obsidian', label: 'Obsidian' },
            { value: 'dark-slate', label: 'Slate blue' },
            { value: 'dark-ember', label: 'Ember' },
            { value: 'dark-forest', label: 'Forest night' },
            { value: 'dark-steel', label: 'Steel' }
          ]
        },
        {
          label: 'Light',
          themes: [
            { value: 'light-quartz', label: 'Quartz' },
            { value: 'light-arctic', label: 'Arctic' },
            { value: 'light-sage', label: 'Sage' },
            { value: 'light-pearl', label: 'Pearl' },
            { value: 'light-sand', label: 'Sand' },
            { value: 'light-rose', label: 'Rose' },
            { value: 'light-lavender', label: 'Lavender' },
            { value: 'light-cloud', label: 'Cloud' }
          ]
        },
        {
          label: 'Classic',
          themes: [
            { value: 'dark-classic', label: 'Classic dark' },
            { value: 'light-neutral', label: 'Classic light' }
          ]
        }
      ],
      localeOptions: supportedLocaleOptions,
      selectedConnectionUuid: null,
      draggedConnectionUuid: null,
      runningInBackgroundNotificationShowed: false,
      notificationToast: null,
      notificationTimer: null,
      debugOutput: '',
      appVersion: ''
    }
  },

  mounted () {
    this.settingsForm = normalizeSettings(this.appSettings)
    setTimeout(async () => {
      await this.migratePlainTextPasswords()
      await this.unlockEncryptedSecretsAtStartup()
    }, 600)

    ipcRenderer.invoke('app:get-version').then(version => {
      this.appVersion = version
    })

    ipcRenderer.on('main-window:show-section', (event, section) => {
      if (['connections', 'favorites', 'settings', 'about'].includes(section)) {
        this.activeSection = section

        if (section === 'settings' || section === 'about') {
          if (this.detailPanelCollapsed) {
            this.detailPanelCollapsed = false
            this.resizeForDetailPanel(false)
          }
        }
      }
    })

    ipcRenderer.on('passkey:unlocked', () => {
      this.notify(this.$t('notifications.passkeyUnlocked'))
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

        this.notify(this.$t('notifications.disconnectedError', { name: conn.name }), 'error-icon')
      }
    })

    ProcessManager.on('timeout', conn => {
      const mountPoint = getConnectionMountPoint(conn)

      if (fs.existsSync(mountPoint)) {
        ProcessManager.getLastSpawnedProcess().then(process => {
          let foundConnection = this.connections.find(i => i.pid === process.pid)

          if (!foundConnection) {
            conn.pid = process.pid
            conn.status = 'connected'

            ProcessManager.watch(process.pid)

            this.notify(this.$t('notifications.trackedAlternative', { name: conn.name }))
          }
        })
      } else {
        conn.pid = null
        conn.status = 'disconnected'

        this.notify(this.$t('notifications.processTimeout', { name: conn.name }), 'error-icon')
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
  grid-template-columns: 72px minmax(540px, 600px) minmax(420px, 1fr);
  gap: 18px;
  overflow: hidden;
  color: var(--app-text);
  font-size: 12px;
  background:
    radial-gradient(circle at 28% 0%, rgba(42, 119, 255, 0.2), transparent 34%),
    linear-gradient(135deg, var(--app-bg), var(--app-surface));
}

.app-toast {
  position: fixed;
  top: 46px;
  right: 22px;
  z-index: 50;
  max-width: min(420px, calc(100vw - 44px));
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-raised, var(--app-surface, #2b3038));
  color: var(--app-text);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  line-height: 1.45;
  font-size: 12px;
  white-space: pre-line;
}

.app-toast.error {
  border-color: color-mix(in srgb, #ff6b6b 60%, var(--app-border));
  background: color-mix(in srgb, #ff6b6b 14%, var(--app-surface-raised, var(--app-surface, #2b3038)));
}

.main-shell.compact-mode {
  grid-template-columns: 72px minmax(360px, 420px) minmax(480px, 1fr);
}

.main-shell.detail-collapsed {
  grid-template-columns: 72px minmax(540px, 600px) 10px;
}

.main-shell.compact-mode.detail-collapsed {
  grid-template-columns: 72px minmax(360px, 420px) 10px;
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
  padding: 18px 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
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
  width: 42px;
  height: 42px;
  margin: 0 auto 8px;
  border-radius: 13px;
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
  position: relative;
  min-height: 52px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  cursor: pointer;
  font-size: 12px;
}

.nav-item .nav-label {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  z-index: 30;
  min-width: max-content;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--app-primary) 32%, transparent);
  border-radius: 8px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-surface) 94%, transparent);
  box-shadow: var(--app-shadow);
  opacity: 0;
  pointer-events: none;
  transform: translate(4px, -50%);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.nav-item:hover .nav-label {
  opacity: 1;
  transform: translate(0, -50%);
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
  position: relative;
  margin-top: auto;
  min-height: 58px;
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

.service-status strong {
  color: var(--app-success);
  font-size: 10px;
  line-height: 1;
}

.service-status-tooltip {
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  z-index: 30;
  min-width: max-content;
  padding: 7px 10px;
  border: 1px solid color-mix(in srgb, var(--app-success) 32%, transparent);
  border-radius: 8px;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-surface) 94%, transparent);
  box-shadow: var(--app-shadow);
  opacity: 0;
  pointer-events: none;
  transform: translate(4px, -50%);
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.service-status:hover .service-status-tooltip {
  opacity: 1;
  transform: translate(0, -50%);
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

.panel-toolbar.has-edit-toggle {
  grid-template-columns: 1fr auto 90px;
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

.edit-toggle {
  height: 46px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  padding: 0 14px;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-bg) 46%, transparent);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.edit-toggle:hover,
.edit-toggle.active {
  color: var(--app-primary-text);
  border-color: color-mix(in srgb, var(--app-primary) 60%, transparent);
  background: var(--app-primary);
}

.sort-select option,
.field select option {
  color: var(--app-text);
  background: var(--app-surface-soft);
}

.connection-list {
  overflow: auto;
  padding-right: 6px;
}

.connection-card {
  width: 100%;
  min-height: 82px;
  margin-bottom: 8px;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 12px 11px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
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
  width: 40px;
  height: 40px;
  border-radius: 9px;
  overflow: hidden;
}

.connection-icon img,
.detail-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.connection-main {
  min-width: 0;
  min-height: 50px;
  display: grid;
  grid-template-rows: 22px 32px;
  align-content: center;
  gap: 3px;
}

.compact-mode .connection-card {
  min-height: 62px;
  padding: 8px 9px;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 8px;
}

.compact-mode .connection-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.compact-mode .connection-main {
  min-height: 38px;
  grid-template-rows: 18px 24px;
  gap: 2px;
}

.connection-main strong {
  font-size: 13px;
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
  gap: 10px;
  font-size: 11px;
}

.compact-mode .connection-meta {
  grid-template-columns: minmax(0, 1fr) 8px auto;
  gap: 8px;
}

.connection-meta.has-reorder {
  grid-template-columns: minmax(0, 1fr) auto 12px auto;
}

.compact-mode .connection-meta.has-reorder {
  grid-template-columns: minmax(0, 1fr) auto 8px auto;
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
  min-width: 24px;
  justify-content: center;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 5px;
  color: #ffffff;
  background: var(--app-primary);
  font-size: 11px;
}

.compact-mode .connection-main b {
  min-width: 19px;
  margin-right: 0;
  padding: 1px 5px;
  font-size: 10px;
  border-radius: 4px;
}

.compact-mode .connection-target {
  display: none;
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
  width: 38px;
  height: 38px;
  border-radius: 50%;
  transition: transform 0.16s ease, background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.compact-mode .round-action {
  width: 28px;
  height: 28px;
}

.compact-mode .quick-actions {
  gap: 6px;
}

.round-action:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  transform: none;
}

.round-action:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--app-primary) 18%, transparent);
}

.round-action.open-folder:not(:disabled) {
  color: #ffffff;
  background: linear-gradient(135deg, var(--app-success), color-mix(in srgb, var(--app-success) 58%, var(--app-primary)));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-success) 35%, transparent),
    0 10px 24px color-mix(in srgb, var(--app-success) 22%, transparent);
}

.round-action.open-folder:not(:disabled):hover {
  background: linear-gradient(135deg, color-mix(in srgb, var(--app-success) 78%, #ffffff), var(--app-primary));
}

.round-action.open-terminal:not(:disabled) {
  color: #ffffff;
  background: #263238;
  box-shadow: 0 0 0 1px color-mix(in srgb, #ffffff 16%, transparent),
    0 10px 24px color-mix(in srgb, #263238 24%, transparent);
}

.round-action.open-terminal:not(:disabled):hover {
  background: color-mix(in srgb, #263238 78%, var(--app-primary));
}

.round-action.open-terminal span,
.terminal-glyph {
  font-family: Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}

.terminal-glyph {
  display: inline-flex;
  width: 20px;
  justify-content: center;
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
  position: relative;
  padding: 16px 16px 16px 30px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.detail-panel.collapsed {
  width: 10px;
  min-width: 10px;
  max-width: 10px;
  justify-self: start;
  padding: 0;
  gap: 0;
  border-color: color-mix(in srgb, var(--app-primary) 32%, var(--app-border));
  background: color-mix(in srgb, var(--app-surface) 76%, transparent);
}

.detail-panel.collapsed > :not(.detail-collapse-handle) {
  display: none !important;
}

.detail-collapse-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 10px;
  border: 0;
  border-radius: 10px 0 0 10px;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-text) 5%, transparent);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
  transition: color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
  z-index: 2;
}

.detail-collapse-handle:hover {
  color: #ffffff;
  background: linear-gradient(180deg, var(--app-success), color-mix(in srgb, var(--app-success) 58%, var(--app-primary)));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-success) 30%, transparent),
    0 14px 30px color-mix(in srgb, var(--app-success) 22%, transparent);
}

.detail-panel.collapsed .detail-collapse-handle {
  width: 100%;
  border-right: 0;
  border-radius: 10px;
}

.detail-panel.can-collapse:not(.collapsed) .detail-topbar,
.detail-panel.can-collapse:not(.collapsed) .detail-card,
.detail-panel.can-collapse:not(.collapsed) .empty-detail,
.detail-panel.can-collapse:not(.collapsed) .workspace-card,
.detail-panel.can-collapse:not(.collapsed) .stats-bar,
.detail-panel.can-collapse:not(.collapsed) .debug-panel {
  margin-left: 0;
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

.settings-form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
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

.text-link {
  border: 0;
  padding: 0;
  color: var(--app-primary);
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.text-link:hover {
  text-decoration: underline;
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
  border: 0;
  border-radius: 16px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--app-primary), color-mix(in srgb, var(--app-primary) 62%, #7aa8ff));
  cursor: pointer;
  overflow: hidden;
  padding: 0;
}

.detail-icon-wrap {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
}

.detail-icon-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 22px;
  height: 22px;
  border: 1px solid var(--app-border);
  border-radius: 50%;
  color: var(--app-text);
  background: color-mix(in srgb, var(--app-bg) 88%, transparent);
  box-shadow: var(--app-shadow);
  cursor: pointer;
  font-size: 16px;
  line-height: 18px;
  padding: 0;
  opacity: 0;
  transform: scale(0.86);
  pointer-events: none;
  transition: opacity 0.14s ease, transform 0.14s ease, background 0.14s ease;
}

.detail-icon-wrap:hover .detail-icon-remove,
.detail-icon-wrap:focus-within .detail-icon-remove {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.detail-icon-remove:hover {
  color: #ffffff;
  background: var(--app-danger);
}

.detail-icon:hover {
  filter: brightness(1.08);
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

.ssh-command-row strong {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.ssh-command-row button {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-text) 8%, transparent);
  cursor: pointer;
}

.ssh-command-row button:hover {
  color: #ffffff;
  background: var(--app-primary);
}

.ssh-command-row button svg {
  width: 15px;
  height: 15px;
  fill: currentColor;
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

.stats-bar > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-text) 7%, transparent);
}

.stats-bar .status-dot {
  width: 22px;
  height: 12px;
  flex: 0 0 22px;
  border-radius: 999px;
  padding: 0;
  background: var(--app-success);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 18%, transparent),
    0 0 12px color-mix(in srgb, var(--app-success) 38%, transparent);
}

.stats-bar .success {
  color: var(--app-success);
}

.stats-bar .warning .status-dot {
  background: #f7b731;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 18%, transparent),
    0 0 12px color-mix(in srgb, #f7b731 38%, transparent);
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
    grid-template-columns: 64px minmax(460px, 520px) minmax(400px, 1fr);
    padding: 12px;
    gap: 12px;
  }

  .detail-body {
    grid-template-columns: 1fr;
  }

  .actions-panel {
    align-self: stretch;
  }
}
</style>
