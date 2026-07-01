<template>
  <Window :title="promptTitle" @close="cancel">
    <div v-if="conn" class="wrap">
      <div v-if="isKeyPassphraseInteractive" class="form-item">
        <label>Key passphrase</label>
        <input type="password" autofocus v-model="keyPassphrase" @keydown.enter="ok" @keydown.esc="cancel">
      </div>

      <div v-if="isInteractiveResponseMode" class="form-item">
        <label>Verification code</label>
        <input type="text" :autofocus="!isKeyPassphraseInteractive" v-model="verificationCode" @keydown.enter="ok" @keydown.esc="cancel">
      </div>

      <div class="form-item">
        <label>{{ promptLabel }}</label>
        <input type="password" :autofocus="!isInteractiveResponseMode" v-model="password" @keydown.enter="ok" @keydown.esc="cancel">
      </div>

      <div class="footer">
        <button class="btn" @click="cancel">Cancel</button>
        <button class="btn default" @click="ok">OK</button>
      </div>
    </div>
    <div v-else class="wrap loading">
      Loading...
    </div>
  </Window>
</template>

<script>
import { ipcRenderer } from 'electron'

import Window from '@/components/Window/index.vue'

export default {
  name: 'password-prompt-window',

  components: {
    Window
  },

  data () {
    return {
      password: '',
      keyPassphrase: '',
      verificationCode: '',
      conn: null
    }
  },

  computed: {
    isKeyInteractive () {
      return this.conn && this.conn.authType === 'key-file-interactive'
    },

    isKeyPassphraseInteractive () {
      return this.conn && this.conn.authType === 'key-file-passphrase-interactive'
    },

    isKeyInteractiveMode () {
      return this.isKeyInteractive || this.isKeyPassphraseInteractive
    },

    isInteractiveOnly () {
      return this.conn && this.conn.authType === 'interactive'
    },

    isInteractiveResponseMode () {
      return this.isInteractiveOnly || this.isKeyInteractiveMode
    },

    promptLabel () {
      if (!this.conn) {
        return 'Password'
      }

      if (this.conn.authType === 'key-file-passphrase') {
        return 'Passphrase'
      }

      return this.isInteractiveOnly
        ? 'Password (optional)'
        : 'Password'
    },

    promptTitle () {
      if (!this.conn) {
        return this.promptLabel
      }

      return this.isInteractiveResponseMode
        ? `PAM/OTP for ${this.conn.user}@${this.conn.host}`
        : `${this.promptLabel} for ${this.conn.user}@${this.conn.host}`
    }
  },

  methods: {
    cancel () {
      ipcRenderer.send('password-prompt:response', {
        message: 'connection-password-cancel',
        uuid: this.conn && this.conn.uuid
      })

      ipcRenderer.send('window:close-current')
    },

    ok () {
      const conn = JSON.parse(JSON.stringify(this.conn))
      conn.password = this.password
      conn.interactiveResponses = this.getInteractiveResponses()

      ipcRenderer.send('password-prompt:response', {
        message: 'connection-password',
        uuid: conn.uuid,
        password: this.password,
        interactiveResponses: conn.interactiveResponses,
        conn
      })

      ipcRenderer.send('window:close-current')
    },

    getInteractiveResponses () {
      if (this.isKeyPassphraseInteractive) {
        return [this.keyPassphrase, this.verificationCode, this.password]
      }

      if (this.isKeyInteractive) {
        return [this.verificationCode, this.password]
      }

      if (this.isInteractiveOnly) {
        return [this.verificationCode, this.password]
      }

      return []
    }
  },

  mounted () {
    this.conn = this.$store.state.Data.connections.find(a => a.uuid === this.$route.params.uuid)
  }
}
</script>

<style lang="less" scoped>
.wrap {
  height: 100%;
  padding: 15px 20px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .footer {
    flex: 0 0 auto;
    margin-top: auto;
    padding: 15px 0;
    text-align: right;

    .btn + .btn {
      margin-left: 10px;
    }
  }

  &.loading {
    color: var(--app-muted);
  }
}
</style>
