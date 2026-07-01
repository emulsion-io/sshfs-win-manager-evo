<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'

import ProcessManager from '@/ProcessManager.js'

export default {
  name: 'sshfs-win-manager-evo',

  computed: {
    currentTheme () {
      return this.$store.state.Settings.settings.theme || 'dark-graphite'
    }
  },

  watch: {
    currentTheme: {
      immediate: true,
      handler (theme) {
        document.body.dataset.theme = theme
      }
    }
  },

  mounted () {
    this.$store.dispatch('APPLY_MIGRATIONS')

    ipcRenderer.on('theme:preview', (event, theme) => {
      if (theme) {
        document.body.dataset.theme = theme
      }
    })

    ipcRenderer.on('terminate-child-processes', () => {
      ProcessManager.terminateAll().then(() => {
        ipcRenderer.send('child-processes-terminated')
      })
    })
  }
}
</script>

<style lang="less">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Segoe WPC', 'Segoe UI', 'Arial', sans-serif;
}

body {
  cursor: default;
  user-select: none;
  background: var(--app-bg);
  color: var(--app-text);
}

body,
html {
  height: 100%;
}

.wrap {
  padding: 15px 20px;
}

button.btn {
  min-width: 100px;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  line-height: 22px;
  text-align: center;
  outline: none;
  background: fade(contrast(@main-color), 10%);
  color: contrast(@main-color);
  cursor: pointer;
  margin-bottom: 5px;
  transition: background 140ms, border-color 140ms, color 140ms, opacity 140ms;

  &.active,
  &.default {
    background: lighten(@primary-color, 3%);
    color: contrast(@primary-color);
  }

  &:hover {
    background: @primary-color;
    color: contrast(@primary-color);

    svg {
      fill: contrast(@primary-color);
    }
  }

  &:active {
    background: darken(@primary-color, 5%);
    color: contrast(@primary-color);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;

    &:hover {
      background: fade(contrast(@main-color), 10%);
    }
  }

  svg {
    fill: contrast(@main-color);
    width: 22px;
    float: left;
    margin-right: 5px;
  }

  &.icon-btn {
    min-width: initial;

    svg {
      margin: 0;
    }
  }
}

h1.section-title {
  font-size: 12pt;
  color: @primary-color;
  font-weight: 600;
  margin-top: 12px;
  margin-bottom: 4px;
}

div.form-row {
  display: flex;

  div.form-item {
    flex: 1;
    margin-right: 6px;

    &:last-child {
      margin-right: 0;
    }
  }
}

div.form-item {
  padding: 6px 0;
  
  // &:focus-within {
  //   label {
  //     color: @primary-color;
  //   }
  // }

  label {
    display: block;
    color: fade(contrast(@main-color), 50%);
    text-transform: uppercase;
    font-size: 10pt;
    padding-bottom: 5px;
  }

  input[type='text'],
  input[type='password'],
  textarea,
  select {
    width: 100%;
    padding: 10px;
    background-color: transparent;
    border: 1px solid fade(contrast(@main-color), 5%);
    border-radius: 6px;
    outline: none;
    color: contrast(@main-color);
    transition: border-color 140ms, background-color 140ms;

    &:focus {
      border-color: @primary-color;
      background-color: fade(@primary-color, 10%);
    }

    option {
      color: #000;
    }
  }
}

::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
  border: none;
}
::-webkit-scrollbar-thumb {
  background: lighten(@main-color, 10%);
  border-radius: 0 !important;
}
::-webkit-scrollbar-thumb:hover {
  background: @primary-color;
}
</style>

<style>
/* v-Tooltip styles */
.tooltip {
  display: block !important;
  z-index: 10000;
}

.tooltip .tooltip-inner {
  background: black;
  color: white;
  border-radius: 16px;
  padding: 5px 10px 4px;
}

.tooltip .tooltip-arrow {
  width: 0;
  height: 0;
  border-style: solid;
  position: absolute;
  margin: 5px;
  border-color: black;
  z-index: 1;
}

.tooltip[x-placement^="top"] {
  margin-bottom: 5px;
}

.tooltip[x-placement^="top"] .tooltip-arrow {
  border-width: 5px 5px 0 5px;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  bottom: -5px;
  left: calc(50% - 5px);
  margin-top: 0;
  margin-bottom: 0;
}

.tooltip[x-placement^="bottom"] {
  margin-top: 5px;
}

.tooltip[x-placement^="bottom"] .tooltip-arrow {
  border-width: 0 5px 5px 5px;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-top-color: transparent !important;
  top: -5px;
  left: calc(50% - 5px);
  margin-top: 0;
  margin-bottom: 0;
}

.tooltip[x-placement^="right"] {
  margin-left: 5px;
}

.tooltip[x-placement^="right"] .tooltip-arrow {
  border-width: 5px 5px 5px 0;
  border-left-color: transparent !important;
  border-top-color: transparent !important;
  border-bottom-color: transparent !important;
  left: -5px;
  top: calc(50% - 5px);
  margin-left: 0;
  margin-right: 0;
}

.tooltip[x-placement^="left"] {
  margin-right: 5px;
}

.tooltip[x-placement^="left"] .tooltip-arrow {
  border-width: 5px 0 5px 5px;
  border-top-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  right: -5px;
  top: calc(50% - 5px);
  margin-left: 0;
  margin-right: 0;
}

.tooltip.popover .popover-inner {
  background: #f9f9f9;
  color: black;
  padding: 24px;
  border-radius: 5px;
  box-shadow: 0 5px 30px rgba(black, .1);
}

.tooltip.popover .popover-arrow {
  border-color: #f9f9f9;
}

.tooltip[aria-hidden='true'] {
  visibility: hidden;
  opacity: 0;
  transition: opacity .15s, visibility .15s;
}

.tooltip[aria-hidden='false'] {
  visibility: visible;
  opacity: 1;
  transition: opacity .15s;
}

body[data-theme='dark-classic'] {
  --app-bg: #21252b;
  --app-sidebar: #21252b;
  --app-sidebar-text: #f2f4f8;
  --app-surface: #2b3038;
  --app-surface-soft: #333944;
  --app-surface-raised: #3c4350;
  --app-border: #1a1d22;
  --app-text: #f2f4f8;
  --app-muted: #aab2bf;
  --app-faint: rgba(255, 255, 255, 0.08);
  --app-primary: #2486d8;
  --app-primary-text: #ffffff;
  --app-success: #6ba368;
  --app-danger: #e71d36;
  --app-debug: #2fff54;
}

body[data-theme='dark-blue'] {
  --app-bg: #111827;
  --app-sidebar: #111827;
  --app-sidebar-text: #f8fbff;
  --app-surface: #1f2937;
  --app-surface-soft: #2f3b4c;
  --app-surface-raised: #3b4a5f;
  --app-border: #0b1220;
  --app-text: #f8fbff;
  --app-muted: #c5d0df;
  --app-faint: rgba(255, 255, 255, 0.09);
  --app-primary: #2f8ee5;
  --app-primary-text: #ffffff;
  --app-success: #52b788;
  --app-danger: #ff5a6a;
  --app-debug: #63f2a5;
}

body[data-theme='dark-contrast'] {
  --app-bg: #101112;
  --app-sidebar: #101112;
  --app-sidebar-text: #ffffff;
  --app-surface: #1b1d1f;
  --app-surface-soft: #24272a;
  --app-surface-raised: #303337;
  --app-border: #050607;
  --app-text: #ffffff;
  --app-muted: #c3c7cc;
  --app-faint: rgba(255, 255, 255, 0.12);
  --app-primary: #f2c14e;
  --app-primary-text: #17130a;
  --app-success: #7bd88f;
  --app-danger: #ff4d5f;
  --app-debug: #7dff9b;
}

body[data-theme='light-neutral'] {
  --app-bg: #dce1e8;
  --app-sidebar: #f8fafc;
  --app-sidebar-text: #111827;
  --app-surface: #f2f4f7;
  --app-surface-soft: #ffffff;
  --app-surface-raised: #e7ebf0;
  --app-border: #aeb7c3;
  --app-text: #111827;
  --app-muted: #42505f;
  --app-faint: rgba(17, 24, 39, 0.10);
  --app-primary: #0d6fb8;
  --app-primary-text: #ffffff;
  --app-success: #3f8f58;
  --app-danger: #c92d3d;
  --app-debug: #0f8a2d;
}

body[data-theme='light-sky'] {
  --app-bg: #d6e8f2;
  --app-sidebar: #f8fcff;
  --app-sidebar-text: #10202b;
  --app-surface: #f2f9fd;
  --app-surface-soft: #ffffff;
  --app-surface-raised: #e2f0f7;
  --app-border: #9ebdce;
  --app-text: #10202b;
  --app-muted: #3f5968;
  --app-faint: rgba(16, 32, 43, 0.10);
  --app-primary: #0b6fa8;
  --app-primary-text: #ffffff;
  --app-success: #358f67;
  --app-danger: #c93f4d;
  --app-debug: #087f3b;
}

body[data-theme='light-mint'] {
  --app-bg: #d9ebe3;
  --app-sidebar: #f8fcfa;
  --app-sidebar-text: #10231a;
  --app-surface: #f3faf7;
  --app-surface-soft: #ffffff;
  --app-surface-raised: #e4f2ec;
  --app-border: #9fc4b3;
  --app-text: #10231a;
  --app-muted: #405f50;
  --app-faint: rgba(16, 35, 26, 0.10);
  --app-primary: #16745d;
  --app-primary-text: #ffffff;
  --app-success: #3f8f58;
  --app-danger: #c63f4a;
  --app-debug: #0b7f35;
}

body[data-theme='dark-graphite'] {
  --app-bg: #171b22;
  --app-sidebar: #11151b;
  --app-sidebar-text: #f7fafc;
  --app-surface: #20262f;
  --app-surface-soft: #29313d;
  --app-surface-raised: #343e4d;
  --app-border: #0d1117;
  --app-text: #f7fafc;
  --app-muted: #b8c2cf;
  --app-faint: rgba(255, 255, 255, 0.08);
  --app-primary: #4f8cff;
  --app-primary-text: #ffffff;
  --app-success: #45b883;
  --app-danger: #ff5c7a;
  --app-debug: #72f59d;
}

body[data-theme='dark-midnight'] {
  --app-bg: #0f172a;
  --app-sidebar: #0b1120;
  --app-sidebar-text: #f8fafc;
  --app-surface: #172033;
  --app-surface-soft: #22304a;
  --app-surface-raised: #2d3d5c;
  --app-border: #07101f;
  --app-text: #f8fafc;
  --app-muted: #c0ccdc;
  --app-faint: rgba(255, 255, 255, 0.09);
  --app-primary: #38bdf8;
  --app-primary-text: #082f49;
  --app-success: #34d399;
  --app-danger: #fb7185;
  --app-debug: #7dd3fc;
}

body[data-theme='dark-aurora'] {
  --app-bg: #141821;
  --app-sidebar: #10141c;
  --app-sidebar-text: #f8fafc;
  --app-surface: #202532;
  --app-surface-soft: #2b3142;
  --app-surface-raised: #373f55;
  --app-border: #0b0f16;
  --app-text: #f8fafc;
  --app-muted: #c6ceda;
  --app-faint: rgba(255, 255, 255, 0.09);
  --app-primary: #a78bfa;
  --app-primary-text: #1f1147;
  --app-success: #2dd4bf;
  --app-danger: #fb7185;
  --app-debug: #5eead4;
}

body[data-theme='light-quartz'] {
  --app-bg: #e8edf5;
  --app-sidebar: #ffffff;
  --app-sidebar-text: #172033;
  --app-surface: #f7f9fc;
  --app-surface-soft: #ffffff;
  --app-surface-raised: #edf1f7;
  --app-border: #bcc7d6;
  --app-text: #172033;
  --app-muted: #455468;
  --app-faint: rgba(23, 32, 51, 0.10);
  --app-primary: #2563eb;
  --app-primary-text: #ffffff;
  --app-success: #16805a;
  --app-danger: #c2415b;
  --app-debug: #0b7a35;
}

body[data-theme='light-arctic'] {
  --app-bg: #dbeafe;
  --app-sidebar: #f8fbff;
  --app-sidebar-text: #102033;
  --app-surface: #f1f8ff;
  --app-surface-soft: #ffffff;
  --app-surface-raised: #e2effc;
  --app-border: #9fbedc;
  --app-text: #102033;
  --app-muted: #38546e;
  --app-faint: rgba(16, 32, 51, 0.11);
  --app-primary: #0369a1;
  --app-primary-text: #ffffff;
  --app-success: #087f5b;
  --app-danger: #be4051;
  --app-debug: #096f43;
}

body[data-theme='light-sage'] {
  --app-bg: #dcebe2;
  --app-sidebar: #fbfefc;
  --app-sidebar-text: #10231a;
  --app-surface: #f2faf5;
  --app-surface-soft: #ffffff;
  --app-surface-raised: #e5f1ea;
  --app-border: #9fc2ae;
  --app-text: #10231a;
  --app-muted: #3e5e4c;
  --app-faint: rgba(16, 35, 26, 0.11);
  --app-primary: #047857;
  --app-primary-text: #ffffff;
  --app-success: #15803d;
  --app-danger: #b84455;
  --app-debug: #087f3b;
}

body[data-theme] .window {
  border-color: var(--app-border);
}

body[data-theme] .content-container {
  background-color: var(--app-surface);
}

body[data-theme] .header,
body[data-theme] .right {
  background: var(--app-sidebar, var(--app-bg));
}

body[data-theme] .right,
body[data-theme] .right button.btn {
  color: var(--app-sidebar-text, var(--app-text));
}

body[data-theme] .header .title,
body[data-theme] .wrap,
body[data-theme] .item .info .title,
body[data-theme] .switch-label {
  color: var(--app-text);
}

body[data-theme] .header .controls svg,
body[data-theme] button.btn svg,
body[data-theme] .item .controls button,
body[data-theme] .debug-actions button svg,
body[data-theme] .grip svg,
body[data-theme] .icon svg {
  fill: var(--app-text);
}

body[data-theme] .item:hover,
body[data-theme] button.btn,
body[data-theme] .item .controls button,
body[data-theme] .item .info .local-path,
body[data-theme] .debug-actions button,
body[data-theme] .switch-ui {
  background: var(--app-faint);
}

body[data-theme] .right button.btn {
  background: transparent;
  border: 1px solid var(--app-faint);
}

body[data-theme] .right button.btn:hover,
body[data-theme] .right button.btn.active {
  background: var(--app-primary);
  border-color: var(--app-primary);
  color: var(--app-primary-text);
}

body[data-theme] button.btn {
  color: var(--app-text);
}

body[data-theme] button.btn:hover,
body[data-theme] button.btn.default,
body[data-theme] button.btn.active,
body[data-theme] .item .controls button:hover,
body[data-theme] .debug-actions button:hover,
body[data-theme] .switch-input:checked + .switch-ui {
  background: var(--app-primary);
  color: var(--app-primary-text);
}

body[data-theme] button.btn:hover svg,
body[data-theme] button.btn.default svg,
body[data-theme] button.btn.active svg,
body[data-theme] .item .controls button:hover svg {
  fill: var(--app-primary-text);
}

body[data-theme] h1.section-title,
body[data-theme] .tabs-container .tabs-selector .tab-selector--selected,
body[data-theme] .content h1,
body[data-theme] .content a,
body[data-theme] .no-data h1 {
  color: var(--app-primary);
}

body[data-theme] .tabs-container .tabs-selector,
body[data-theme] .debug-panel,
body[data-theme] .sep {
  border-bottom-color: var(--app-faint);
  border-top-color: var(--app-faint);
}

body[data-theme] .tabs-container .tabs-selector .tab-selector,
body[data-theme] div.form-item label,
body[data-theme] .item .info .details,
body[data-theme] .content p,
body[data-theme] .content li,
body[data-theme] .no-data,
body[data-theme] .debug-panel .title {
  color: var(--app-muted);
}

body[data-theme] div.form-item input[type='text'],
body[data-theme] div.form-item input[type='password'],
body[data-theme] div.form-item textarea,
body[data-theme] div.form-item select {
  border-color: var(--app-faint);
  color: var(--app-text);
  background-color: var(--app-surface-soft);
}

body[data-theme] div.form-item input::placeholder,
body[data-theme] div.form-item textarea::placeholder {
  color: var(--app-muted);
}

body[data-theme] div.form-item select option {
  color: var(--app-text);
  background-color: var(--app-surface-soft);
}

body[data-theme] div.form-item input[type='text']:focus,
body[data-theme] div.form-item input[type='password']:focus,
body[data-theme] div.form-item textarea:focus,
body[data-theme] div.form-item select:focus {
  border-color: var(--app-primary);
}

body[data-theme] .item {
  border-bottom: 1px solid var(--app-faint);
}

body[data-theme] .item .info .local-path {
  color: var(--app-text);
}

body[data-theme] .item .controls button.success {
  background: var(--app-success);
}

body[data-theme] .item .controls button.danger {
  background: var(--app-danger);
}

body[data-theme] .item .controls button.success svg,
body[data-theme] .item .controls button.danger svg {
  fill: #ffffff;
}

body[data-theme] .debug-panel textarea {
  color: var(--app-debug);
}

body[data-theme] .highlight-item {
  border-color: var(--app-primary);
}

body[data-theme] ::-webkit-scrollbar-thumb {
  background: var(--app-surface-raised);
}

body[data-theme] ::-webkit-scrollbar-thumb:hover {
  background: var(--app-primary);
}

body[data-theme] .window {
  background: var(--app-surface) !important;
  border-color: var(--app-border) !important;
}

body[data-theme] .content-container,
body[data-theme] .connection-list,
body[data-theme] .left,
body[data-theme] .debug-panel {
  background: var(--app-surface) !important;
}

body[data-theme] .header,
body[data-theme] .right {
  background: var(--app-sidebar, var(--app-bg)) !important;
  color: var(--app-sidebar-text, var(--app-text)) !important;
}

body[data-theme] .header .title,
body[data-theme] .right,
body[data-theme] .right button.btn,
body[data-theme] .wrap,
body[data-theme] .item,
body[data-theme] .item .info .title,
body[data-theme] .switch-label,
body[data-theme] h1,
body[data-theme] p,
body[data-theme] li {
  color: var(--app-text) !important;
}

body[data-theme] .right,
body[data-theme] .right .bottom-actions,
body[data-theme] .right button.btn,
body[data-theme] .right svg {
  color: var(--app-sidebar-text, var(--app-text)) !important;
  fill: var(--app-sidebar-text, var(--app-text)) !important;
}

body[data-theme] .item .info .details,
body[data-theme] .no-data,
body[data-theme] .debug-panel .title,
body[data-theme] div.form-item label,
body[data-theme] .tabs-container .tabs-selector .tab-selector {
  color: var(--app-muted) !important;
}

body[data-theme] .item .icon svg,
body[data-theme] .item .grip svg,
body[data-theme] .item .controls button svg,
body[data-theme] button.btn svg,
body[data-theme] .debug-actions button svg {
  fill: currentColor !important;
}

body[data-theme] .item:hover,
body[data-theme] .item .info .local-path,
body[data-theme] .debug-actions button,
body[data-theme] .switch-ui {
  background: var(--app-faint) !important;
}

body[data-theme] button.btn,
body[data-theme] .item .controls button {
  background: var(--app-surface-raised) !important;
  color: var(--app-text) !important;
}

body[data-theme] .right button.btn {
  background: transparent !important;
  border: 1px solid var(--app-faint) !important;
  color: var(--app-sidebar-text, var(--app-text)) !important;
}

body[data-theme] button.btn:hover,
body[data-theme] button.btn.default,
body[data-theme] button.btn.active,
body[data-theme] .right button.btn:hover,
body[data-theme] .right button.btn.active,
body[data-theme] .item .controls button:hover,
body[data-theme] .debug-actions button:hover,
body[data-theme] .switch-input:checked + .switch-ui {
  background: var(--app-primary) !important;
  border-color: var(--app-primary) !important;
  color: var(--app-primary-text) !important;
}

body[data-theme] .item .controls button.success {
  background: var(--app-success) !important;
  color: #ffffff !important;
}

body[data-theme] .item .controls button.danger {
  background: var(--app-danger) !important;
  color: #ffffff !important;
}

body[data-theme] h1.section-title,
body[data-theme] .tabs-container .tabs-selector .tab-selector--selected,
body[data-theme] .content h1,
body[data-theme] .content a,
body[data-theme] .no-data h1 {
  color: var(--app-primary) !important;
}

body[data-theme] div.form-item input[type='text'],
body[data-theme] div.form-item input[type='password'],
body[data-theme] div.form-item textarea,
body[data-theme] div.form-item select {
  background: var(--app-surface-soft) !important;
  border-color: var(--app-border) !important;
  color: var(--app-text) !important;
}

body[data-theme] div.form-item input::placeholder,
body[data-theme] div.form-item textarea::placeholder {
  color: var(--app-muted) !important;
  opacity: 0.78;
}

body[data-theme] .sep,
body[data-theme] .debug-panel,
body[data-theme] .tabs-container .tabs-selector {
  border-color: var(--app-border) !important;
}
</style>
