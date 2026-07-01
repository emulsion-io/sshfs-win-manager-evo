import { createRouter, createWebHashHistory } from 'vue-router'

import MainWindow from '@/components/MainWindow/index.vue'
import AddEditConnectionWindow from '@/components/AddEditConnectionWindow/index.vue'
import SettingsWindow from '@/components/SettingsWindow/index.vue'
import PasswordPromptWindow from '@/components/PasswordPromptWindow/index.vue'
import AboutWindow from '@/components/AboutWindow/index.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'main',
      component: MainWindow
    },
    {
      path: '/add-new-connection',
      name: 'add-new-connection',
      component: AddEditConnectionWindow
    },
    {
      path: '/edit-connection/:uuid',
      name: 'edit-connection',
      component: AddEditConnectionWindow
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsWindow
    },
    {
      path: '/password-prompt/:uuid',
      name: 'password-prompt',
      component: PasswordPromptWindow
    },
    {
      path: '/about',
      name: 'about',
      component: AboutWindow
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})
