<template>
  <Window :title="title">
    <div class="wrap">
      <Tabs>
        <Tab :label="$t('connectionForm.basic')" active>
          <div class="form-item">
            <label>{{ $t('connectionForm.name') }}</label>
            <input type="text" autofocus :placeholder="$t('connectionForm.namePlaceholder')" v-model="conn.name">
          </div>

          <h1 class="section-title">{{ $t('connectionForm.connection') }}</h1>
          <div class="form-row">
            <div class="form-item">
              <label>{{ $t('connectionForm.host') }}</label>
              <input type="text" :placeholder="$t('connectionForm.hostPlaceholder')" v-model="conn.host">
            </div>
            <div class="form-item" style="flex: 0 0 80px">
              <label>{{ $t('detail.port') }}</label>
              <input type="text" :placeholder="$t('connectionForm.portPlaceholder')" v-model.number="conn.port">
            </div>
          </div>
          <div class="form-item">
            <label>{{ $t('connectionForm.user') }}</label>
            <input type="text" :placeholder="$t('connectionForm.userPlaceholder')" v-model="conn.user">
          </div>
          <div class="form-item">
            <label>{{ $t('connectionForm.authMethod') }}</label>
            <select v-model="conn.authType" @change="authTypeChange">
              <option value="key-file">{{ $t('auth.keyFile') }}</option>
              <option value="key-file-passphrase">{{ $t('auth.keyFilePassphrase') }}</option>
              <option value="key-file-interactive">{{ $t('auth.keyFileInteractive') }}</option>
              <option value="key-file-passphrase-interactive">{{ $t('auth.keyFilePassphraseInteractive') }}</option>
              <option value="password">{{ $t('auth.password') }}</option>
              <option value="password-ask">{{ $t('auth.passwordAsk') }}</option>
              <option value="interactive">{{ $t('auth.interactive') }}</option>
              <!-- <option value="key-input" disabled>Private Key (input)</option> -->
            </select>
            <p class="auth-hint" v-if="conn.authType === 'interactive'">
              <Icon icon="info"/>
              <span>
                {{ $t('auth.interactiveHint') }}
              </span>
            </p>
            <p class="auth-hint" v-if="conn.authType === 'key-file-passphrase'">
              <Icon icon="info"/>
              <span>
                {{ $t('auth.keyPassphraseHint') }}
              </span>
            </p>
            <p class="auth-hint" v-if="conn.authType === 'key-file-interactive'">
              <Icon icon="info"/>
              <span>
                {{ $t('auth.keyInteractiveHint') }}
              </span>
            </p>
            <p class="auth-hint" v-if="conn.authType === 'key-file-passphrase-interactive'">
              <Icon icon="info"/>
              <span>
                {{ $t('auth.keyPassphraseInteractiveHint') }}
              </span>
            </p>
          </div>
          <div v-show="conn.authType === 'password'" class="form-item">
            <label>{{ $t('connectionForm.password') }}</label>
            <input type="password" v-model="conn.password">
          </div>
          <div v-show="conn.authType === 'key-file' || conn.authType === 'key-file-passphrase' || conn.authType === 'key-file-interactive' || conn.authType === 'key-file-passphrase-interactive'" class="form-row">
            <div class="form-item">
              <label>{{ $t('connectionForm.keyFile') }}</label>
              <input type="text" :placeholder="$t('connectionForm.keyFilePlaceholder')" v-model="conn.keyFile">
            </div>
            <div class="form-item" style="flex: 0">
              <button class="btn icon-btn" style="margin-top: 23px" @click="selectPrivateKey" v-tooltip="$t('connectionForm.selectPrivateKey')">
                <Icon icon="openFolder"/>
              </button>
            </div>
          </div>
          <div v-show="conn.authType === 'key-input'" class="form-item">
            <label>{{ $t('connectionForm.key') }}</label>
            <textarea :placeholder="$t('connectionForm.keyPlaceholder')" v-model="conn.key"></textarea>
          </div>

          <h1 class="section-title">{{ $t('connectionForm.remote') }}</h1>
          <div class="form-item">
            <label>{{ $t('connectionForm.path') }}</label>
            <input type="text" :placeholder="$t('connectionForm.pathPlaceholder')" v-model="conn.folder">
          </div>

          <h1 class="section-title">{{ $t('connectionForm.local') }}</h1>
          <div class="form-item">
            <label>{{ $t('connectionForm.driveLetter') }}</label>
            <select v-model="conn.mountPoint">
              <option value="auto">{{ $t('connectionForm.autoDrive') }}</option>
              <option v-for="drive in drives" :value="drive + ':'" :key="drive">{{drive}}:</option>
            </select>
          </div>
        </Tab>
        <Tab :label="$t('connectionForm.advanced')" class="advanced-tab">
          <div class="form-item">
            <SwitchLabel :label="$t('connectionForm.connectOnStartup')" v-model="conn.advanced.connectOnStartup"/>
            <SwitchLabel :label="$t('connectionForm.reconnect')" v-model="conn.advanced.reconnect"/>
          </div>

          <div class="form-item">
            <SwitchLabel :label="$t('connectionForm.customOptions')" v-model="conn.advanced.customCmdlOptionsEnabled"/>

            <CustomCmdlOptions v-model="conn.advanced.customCmdlOptions"/>
          </div>
        </Tab>
      </Tabs>

      <div class="footer">
        <button class="btn" @click="cancel">{{ $t('common.cancel') }}</button>
        <button class="btn default" @click="save">{{ $t('common.save') }}</button>
      </div>
    </div>
  </Window>
</template>

<script>
import { ipcRenderer } from 'electron'
import { v4 as uuid } from 'uuid'

import Window from '@/components/Window/index.vue'
import Tabs from '@/components/Tabs/Tabs.vue'
import Tab from '@/components/Tabs/Tab.vue'
import SwitchLabel from '@/components/SwitchLabel.vue'
import CustomCmdlOptions from './CustomCmdlOptions.vue'
import Icon from '../Icon.vue'

export default {
  name: 'add-edit-connection-window',

  components: {
    Window,
    Tabs,
    Tab,
    SwitchLabel,
    CustomCmdlOptions,
    Icon
  },

  methods: {
    cancel () {
      ipcRenderer.send('window:close-current')
    },

    save () {
      this.conn.advanced.customCmdlOptions =
        this.conn.advanced.customCmdlOptions.filter(a => a.name !== '')

      if (this.isEditingMode) {
        this.$store.dispatch('UPDATE_CONNECTION', this.conn)
      } else {
        this.$store.dispatch('ADD_CONNECTION', this.conn)
      }

      ipcRenderer.send('window:close-current')
    },

    authTypeChange () {
      this.conn.password = ''
      this.conn.keyFile = process.env.USERPROFILE + '\\.ssh\\id_rsa'
    },

    async selectPrivateKey () {
      const file = await ipcRenderer.invoke('dialog:select-private-key')

      if (file) {
        this.conn.keyFile = file
      }
    }
  },

  data () {
    return {
      isEditingMode: false,

      title: this.$t('connectionForm.addTitle'),
      drives: 'DEFGHIJKLMNOPQRSTUVWXYZ',

      conn: {
        uuid: uuid(),
        name: '',
        host: '',
        port: 22,
        user: '',
        folder: '/',
        authType: 'password',
        password: '',
        keyFile: process.env.USERPROFILE + '\\.ssh\\id_rsa',
        key: '',
        mountPoint: 'auto',
        status: 'disconnected',
        pid: 0,
        advanced: {
          customCmdlOptionsEnabled: false,
          customCmdlOptions: [],
          connectOnStartup: false,
          reconnect: false
        }
      }
    }
  },

  mounted () {
    if (this.$route.name === 'edit-connection') {
      this.isEditingMode = true

      this.title = this.$t('connectionForm.editTitle')

      this.conn = this.$store.state.Data.connections.find(a => a.uuid === this.$route.params.uuid)
    }
  }
}
</script>

<style lang="less" scoped>
.wrap  {
  height: 100%;
  padding: 15px 20px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.tabs-container) {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :deep(.tabs-selector) {
    flex: 0 0 auto;
  }

  :deep(.tab) {
    min-height: 0;
    flex: 1;
    overflow: auto;
    padding-right: 5px;
    padding-bottom: 12px;
  }

  .advanced-tab {
    overflow: auto;
    height: auto;
    width: 100%;
    padding-right: 5px;
  }

  .footer {
    flex: 0 0 auto;
    margin: 0;
    padding: 14px 0 15px;
    border-top: 1px solid var(--app-border);
    background: var(--app-surface);
    display: flex;
    justify-content: flex-end;
    gap: 10px;

    .btn {
      margin-bottom: 0;
    }
  }

  .auth-hint {
    margin: 10px 0 0;
    padding: 10px 12px;
    border: 1px dashed var(--app-border);
    border-radius: 8px;
    color: var(--app-muted);
    background: color-mix(in srgb, var(--app-primary) 14%, transparent);
    font-size: 12px;
    line-height: 1.35;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .auth-hint svg {
    width: 15px;
    height: 15px;
    fill: var(--app-primary);
    flex: 0 0 15px;
    margin-top: 2px;
  }
}
</style>
