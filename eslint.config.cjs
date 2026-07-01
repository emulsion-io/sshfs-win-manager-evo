const js = require('@eslint/js')
const vue = require('eslint-plugin-vue')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['src/**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'arrow-parens': 'off',
      'generator-star-spacing': 'off',
      'no-async-promise-executor': 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-reserved-component-names': 'off',
      'vue/no-mutating-props': 'off'
    }
  }
]
