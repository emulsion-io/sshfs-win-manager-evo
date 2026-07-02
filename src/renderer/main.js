import { createApp } from 'vue'

import App from './App.vue'
import router from './router/index.js'
import store from './store/index.js'
import i18n, { setLocale } from './i18n/index.js'

const app = createApp(App)
setLocale(store.state.Settings.settings.language)

store.subscribe((mutation, state) => {
  if (mutation.type === 'UPDATE_SETTINGS' || mutation.type === 'MIGRATE_SETTINGS' || mutation.type === 'RESET_SETTINGS') {
    setLocale(state.Settings.settings.language)
  }
})

app.directive('tooltip', {
  mounted (el, binding) {
    el.setAttribute('title', binding.value)
  },
  updated (el, binding) {
    el.setAttribute('title', binding.value)
  }
})

app.use(router)
app.use(store)
app.use(i18n)
app.mount('#app')
