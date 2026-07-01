<template>
  <Window title="About">
    <div class="wrap">
      <div class="logo-container">
        <img class="logo" src="@/assets/app-logo.png">
      </div>
      <div class="content">
        <h1>SSHFS-Win Manager Evo</h1>
        <p class="repo-url">
          Based on <a href="https://github.com/evsar3/sshfs-win-manager">https://github.com/evsar3/sshfs-win-manager</a>
        </p>
        <p>
          Version: {{appVersion}}<br>
          Original author: Evandro Araujo (<a href="https://github.com/evsar3">@evsar3</a>)<br>
          Evo modifications: Fabrice Simonet
        </p>
        <p>This program is licensed under <a href="https://opensource.org/licenses/MIT">MIT license</a></p>
        <p>This program contains parts of following open-source projects:</p>
        <ul>
          <li>Node.js (<a href="https://github.com/nodejs/node">https://github.com/nodejs/node</a>)</li>
          <li>Electron (<a href="https://github.com/electron/electron">https://github.com/electron/electron</a>)</li>
          <li>Vite (<a href="https://github.com/vitejs/vite">https://github.com/vitejs/vite</a>)</li>
          <li>electron-vite (<a href="https://github.com/alex8088/electron-vite">https://github.com/alex8088/electron-vite</a>)</li>
          <li>Vue.js (<a href="https://github.com/vuejs/core">https://github.com/vuejs/core</a>)</li>
          <li>Vue Router (<a href="https://github.com/vuejs/router">https://github.com/vuejs/router</a>)</li>
          <li>Vuex (<a href="https://github.com/vuejs/vuex">https://github.com/vuejs/vuex</a>)</li>
          <li>SSHFS-Win (<a href="https://github.com/billziss-gh/sshfs-win">https://github.com/billziss-gh/sshfs-win</a>)</li>
        </ul>
        <p>Icons kindly provided by <a href="https://icons8.com">Icons8.com</a></p>
      </div>
    </div>
  </Window>
</template>

<script>
import { ipcRenderer } from 'electron'

import Window from '@/components/Window/index.vue'

export default {
  name: 'about-window',

  components: {
    Window
  },

  data () {
    return {
      appVersion: ''
    }
  },

  async mounted () {
    this.appVersion = await ipcRenderer.invoke('app:get-version')

    this.$el.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', event => {
        event.preventDefault()

        ipcRenderer.invoke('shell:open-external', item.href)
      })
    })
  }
}
</script>

<style lang="less" scoped>
.wrap {
  color: contrast(@main-color);

  > div {
    display: inline-block;
  }

  .logo-container {
    width: 70px;

    .logo {
      width: 60px;
      position: absolute;
      top: 50px;
    }
  }

  .content {  
    h1 {
      color: @primary-color;
      font-size: 18pt;
      margin-bottom: 5px;
    }

    p {
      font-size: 10pt;
      color: fade(contrast(@main-color), 80%);
      margin: 10px 0;

      &.repo-url {
        margin-bottom: 20px;
      }
    }

    ul {
      margin-left: 25px;
    }

    a {
      color: lighten(@primary-color, 20%);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
