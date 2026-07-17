<script setup lang="ts">
import { Copy, Minus, Square, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import { applyTheme, watchSystemTheme } from './theme'

const {
  close,
  isMaximized: getIsMaximized,
  minimize,
  onMaximizeChange,
  toggleMaximize
} = window.api.windowControls
const isMaximized = ref(false)
let removeMaximizeListener: (() => void) | undefined
let removeSystemThemeListener: (() => void) | undefined

onMounted(async () => {
  applyTheme()
  removeSystemThemeListener = watchSystemTheme()
  isMaximized.value = await getIsMaximized()
  removeMaximizeListener = onMaximizeChange((maximized) => {
    isMaximized.value = maximized
  })
})

onUnmounted(() => {
  removeMaximizeListener?.()
  removeSystemThemeListener?.()
})
</script>

<template>
  <div class="app-window">
    <header class="titlebar">
      <span class="window-title">小可</span>
      <div class="window-controls">
        <button aria-label="最小化" class="window-control" type="button" @click="minimize">
          <Minus :size="16" :stroke-width="1.8" />
        </button>
        <button
          aria-label="最大化或还原"
          class="window-control"
          type="button"
          @click="toggleMaximize"
        >
          <component :is="isMaximized ? Copy : Square" :size="14" :stroke-width="1.8" />
        </button>
        <button aria-label="关闭" class="window-control" type="button" @click="close">
          <X :size="17" :stroke-width="1.8" />
        </button>
      </div>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style>
html,
body,
#app {
  width: 100%;
  min-width: 0;
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
}

button {
  font: inherit;
}

.app-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.titlebar {
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: space-between;
  padding-left: 12px;
  -webkit-app-region: drag;
}

.window-title {
  color: #4a4a4a;
  font-size: 15px;
  font-weight: 600;
}

.window-controls {
  display: flex;
  align-self: stretch;
  -webkit-app-region: no-drag;
}

.window-control {
  display: grid;
  width: 40px;
  padding: 0;
  color: #1f1f1f;
  cursor: pointer;
  place-items: center;
  border: 0;
  background: transparent;
}

.window-control:hover,
.window-control:active {
  background: #dedede;
}

.content {
  flex: 1;
  min-height: 0;
  background: #ffffff;
}

html[data-theme='dark'] .app-window {
  color: #e4e8ee;
  background: #141414;
}

html[data-theme='dark'] .titlebar,
html[data-theme='dark'] .content,
html[data-theme='dark'] .home-view,
html[data-theme='dark'] .settings-view,
html[data-theme='dark'] .page-view {
  color: #e4e8ee;
  background: #141414;
}

html[data-theme='dark'] .console {
  color: #e4e8ee;
  background: #181818;
}

html[data-theme='dark'] .titlebar {
  border-bottom: 1px solid #242424;
}

html[data-theme='dark'] .window-title,
html[data-theme='dark'] .window-control,
html[data-theme='dark'] .console h1,
html[data-theme='dark'] .settings-view h1,
html[data-theme='dark'] .settings-view h2,
html[data-theme='dark'] .settings-view .setting-row__title,
html[data-theme='dark'] .settings-view code {
  color: #e4e8ee;
}

html[data-theme='dark'] .window-control:hover,
html[data-theme='dark'] .window-control:active,
html[data-theme='dark'] .drawer-button:hover,
html[data-theme='dark'] .new-chat-button:hover,
html[data-theme='dark'] .header-icon-button:hover,
html[data-theme='dark'] .back-button:hover,
html[data-theme='dark'] .outline-button:hover,
html[data-theme='dark'] .theme-options button:hover {
  background: #303030;
}

html[data-theme='dark'] .console,
html[data-theme='dark'] .page-toolbar {
  border-color: #242424;
}

html[data-theme='dark'] .drawer-button,
html[data-theme='dark'] .new-chat-button,
html[data-theme='dark'] .header-icon-button,
html[data-theme='dark'] .back-button,
html[data-theme='dark'] .page-toolbar button {
  color: #d8dee8;
}

html[data-theme='dark'] .history-drawer {
  background: #181818;
  box-shadow: 8px 0 24px rgb(0 0 0 / 35%);
}

html[data-theme='dark'] .history-drawer h2,
html[data-theme='dark'] .history-drawer li button {
  color: #dce2ea;
}

html[data-theme='dark'] .history-drawer li button:hover {
  background: #303030;
}

html[data-theme='dark'] .history-drawer .history-item.active {
  background: #303030;
}

html[data-theme='dark'] .history-drawer .history-action {
  color: #aeb7c3;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .history-drawer .history-action:hover {
  background: #303030;
}

html[data-theme='dark'] .history-drawer .history-action.pinned {
  color: #8ed3a2;
}

html[data-theme='dark'] .history-drawer .history-action.archive:hover {
  color: #8ec5f5;
}

html[data-theme='dark'] .archive-dialog {
  color: #e4e8ee;
  background: #181818;
  box-shadow: 0 16px 40px rgb(0 0 0 / 45%);
}

html[data-theme='dark'] .archive-dialog p {
  color: #aeb7c3;
}

html[data-theme='dark'] .archive-dialog__actions button {
  color: #d7dee8;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .archive-dialog__actions button:hover {
  background: #303030;
}

html[data-theme='dark'] .archive-dialog__actions .archive-dialog__confirm,
html[data-theme='dark'] .archive-dialog__actions .archive-dialog__confirm:hover {
  color: #fff;
  border-color: #3b6da2;
  background: #3b6da2;
}

html[data-theme='dark'] .messages .user {
  color: #e6edf5;
  background: #244b68;
}

html[data-theme='dark'] .messages .assistant {
  color: #e4e8ee;
  background: #252525;
}

html[data-theme='dark'] .composer {
  border-color: #303030;
  background: #181818;
  box-shadow: 0 3px 12px rgb(0 0 0 / 20%);
}

html[data-theme='dark'] .composer textarea {
  color: #e4e8ee;
}

html[data-theme='dark'] .send-button {
  background: #2f7db7;
}

html[data-theme='dark'] .send-button:hover {
  background: #3f91cf;
}

html[data-theme='dark'] .send-button:disabled {
  background: #3a3a3a;
}

html[data-theme='dark'] .settings-group {
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .settings-view h2 {
  border-color: #303030;
}

html[data-theme='dark'] .settings-view .setting-row p,
html[data-theme='dark'] .settings-view code,
html[data-theme='dark'] .version {
  color: #aeb7c3;
}

html[data-theme='dark'] .outline-button,
html[data-theme='dark'] .theme-options button {
  color: #d7dee8;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .settings-view .outline-button:disabled {
  color: #777f8b;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .theme-options button.active {
  color: #a8d8b5;
  border-color: #4f8160;
  background: #253d2d;
}
</style>
