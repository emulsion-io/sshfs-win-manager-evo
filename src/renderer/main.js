import { createApp } from 'vue'

import App from './App.vue'
import router from './router/index.js'
import store from './store/index.js'

const app = createApp(App)

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
app.mount('#app')
