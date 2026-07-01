<template>
  <Window :title="title">
    <div class="wrap">
      <Tabs>
        <Tab label="BASIC" active>
          <div class="form-item">
            <label>Name</label>
            <input type="text" autofocus placeholder="eg. My development server 1" v-model="conn.name">
          </div>

          <h1 class="section-title">Connection</h1>
          <div class="form-row">
            <div class="form-item">
              <label>IP/Host</label>
              <input type="text" placeholder="eg. 127.0.0.1 or my.domain.com" v-model="conn.host">
            </div>
            <div class="form-item" style="flex: 0 0 80px">
              <label>Port</label>
              <input type="text" placeholder="eg. 22" v-model.number="conn.port">
            </div>
          </div>
          <div class="form-item">
            <label>User</label>
            <input type="text" placeholder="eg. root" v-model="conn.user">
          </div>
          <div class="form-item">
            <label>Authentication method</label>
            <select v-model="conn.authType" @change="authTypeChange">
              <option value="password">Password</option>
              <option value="password-ask">Password (ask on connect)</option>
              <option value="key-file">Private Key (file)</option>
              <!-- <option value="key-input" disabled>Private Key (input)</option> -->
            </select>
          </div>
          <div v-show="conn.authType === 'password'" class="form-item">
            <label>Password</label>
            <input type="password" v-model="conn.password">
          </div>
          <div v-show="conn.authType === 'key-file'" class="form-row">
            <div class="form-item">
              <label>Key File</label>
              <input type="text" placeholder="eg. C:\Users\me\.ssh\id_rsa" v-model="conn.keyFile">
            </div>
            <div class="form-item" style="flex: 0">
              <button class="btn icon-btn" style="margin-top: 23px" @click="selectPrivateKey" v-tooltip="'Select private key'">
                <Icon icon="openFolder"/>
              </button>
            </div>
          </div>
          <div v-show="conn.authType === 'key-input'" class="form-item">
            <label>Key</label>
            <textarea placeholder="eg. ssh-rsa AAAAB3Nz..." v-model="conn.key"></textarea>
          </div>

          <h1 class="section-title">Remote</h1>
          <div class="form-item">
            <label>Path</label>
            <input type="text" placeholder="eg. /home/john" v-model="conn.folder">
          </div>

          <h1 class="section-title">Local</h1>
          <div class="form-item">
            <label>Drive letter</label>
            <select v-model="conn.mountPoint">
              <option v-for="drive in drives" :value="drive + ':'" :key="drive">{{drive}}:</option>
            </select>
          </div>
        </Tab>
        <Tab label="ADVANCED" class="advanced-tab">
          <div class="form-item">
            <SwitchLabel label="Connect on Startup" v-model="conn.advanced.connectOnStartup"/>
            <SwitchLabel label="Try to Reconnect on Connection Loss" v-model="conn.advanced.reconnect"/>
          </div>

          <div class="form-item">
            <SwitchLabel label="Custom Command Line params" v-model="conn.advanced.customCmdlOptionsEnabled"/>

            <CustomCmdlOptions v-model="conn.advanced.customCmdlOptions"/>
          </div>
        </Tab>
      </Tabs>

      <div class="footer">
        <button class="btn" @click="cancel">Cancel</button>
        <button class="btn default" @click="save">Save</button>
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

      title: 'Add Connection',
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
        mountPoint: 'D:',
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

      this.title = 'Edit Connection'

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
}
</style>
