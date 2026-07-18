<script setup lang="ts">
import { Copy, Minus, Square, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'
import titlebarLogo from '../../../resources/icon.png'
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
const scrollbarTimers = new Map<HTMLElement, number>()

const revealScrollbar = (event: Event): void => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  target.classList.add('scrollbar-visible')
  const existingTimer = scrollbarTimers.get(target)
  if (existingTimer !== undefined) window.clearTimeout(existingTimer)
  scrollbarTimers.set(
    target,
    window.setTimeout(() => {
      target.classList.remove('scrollbar-visible')
      scrollbarTimers.delete(target)
    }, 700)
  )
}

onMounted(async () => {
  applyTheme()
  removeSystemThemeListener = watchSystemTheme()
  isMaximized.value = await getIsMaximized()
  removeMaximizeListener = onMaximizeChange((maximized) => {
    isMaximized.value = maximized
  })
  document.addEventListener('scroll', revealScrollbar, true)
})

onUnmounted(() => {
  removeMaximizeListener?.()
  removeSystemThemeListener?.()
  document.removeEventListener('scroll', revealScrollbar, true)
  scrollbarTimers.forEach((timer) => window.clearTimeout(timer))
  scrollbarTimers.clear()
})
</script>

<template>
  <div class="app-window">
    <header class="titlebar">
      <div class="window-identity">
        <img :src="titlebarLogo" alt="" class="window-logo" />
        <span class="window-title">小可</span>
      </div>
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

:root {
  --color-titlebar: #f5f5f5;
  --color-page: #fff;
  --color-surface: #fff;
  --color-surface-muted: #f8f9fa;
  --color-surface-hover: #f5f6f8;
  --color-text: #252525;
  --color-text-muted: #667085;
  --color-text-subtle: #8993a1;
  --color-border: #e3e6ea;
  --color-border-subtle: #e3e6ea;
  --color-accent: #3d8058;
  --color-accent-hover: #34704c;
  --color-accent-text: #28704a;
  --color-accent-soft: #f0f8f2;
  --color-calendar-today-background: #252525;
  --color-calendar-today-text: #fff;
  --color-tip-background: #252525;
  --color-tip-text: #fff;
  --color-danger: #bf4646;
  --color-on-accent: #fff;
  --color-scrollbar-thumb: #a9a9a9;
  --shadow-modal: 0 16px 40px rgb(0 0 0 / 18%);
  --modal-backdrop-color: rgb(0 0 0 / 40%);
  --content-padding: 24px 40px 40px;
  --content-padding-compact: 20px 20px 28px;
}

html[data-theme='dark'] {
  --color-titlebar: #141414;
  --color-page: #181818;
  --color-surface: #181818;
  --color-surface-muted: #202020;
  --color-surface-hover: #303030;
  --color-text: #e4e8ee;
  --color-text-muted: #aeb7c3;
  --color-text-subtle: #777f8b;
  --color-border: #242424;
  --color-border-subtle: #242424;
  --color-accent: #3d8058;
  --color-accent-hover: #34704c;
  --color-accent-text: #a8d8b5;
  --color-accent-soft: #253d2d;
  --color-calendar-today-background: #253d2d;
  --color-calendar-today-text: #a8d8b5;
  --color-tip-background: #3d8058;
  --color-tip-text: #fff;
  --color-scrollbar-thumb: #6e6e6e;
  --shadow-modal: 0 16px 40px rgb(0 0 0 / 45%);
}

body {
  overflow: hidden;
}

button {
  font: inherit;
}

*::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: transparent !important;
  border-radius: 999px;
  transition: background-color 180ms ease;
}

*.scrollbar-visible::-webkit-scrollbar-thumb {
  background-color: var(--color-scrollbar-thumb) !important;
}

*::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.app-window {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.modal-backdrop {
  position: fixed;
  z-index: 10;
  inset: 32px 0 0;
  display: grid;
  padding: 20px;
  place-items: center;
  background: var(--modal-backdrop-color);
}

.modal-panel {
  color: var(--color-text);
  border-radius: 14px;
  background: var(--color-surface);
  box-shadow: var(--shadow-modal);
}

.titlebar {
  display: flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: space-between;
  padding-left: 12px;
  border-bottom: 0;
  background: var(--color-titlebar);
  -webkit-app-region: drag;
}

.window-title {
  color: #4a4a4a;
  font-size: 15px;
  font-weight: 600;
}

.window-identity {
  display: flex;
  align-items: center;
  gap: 6px;
}

.window-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
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
  background: var(--color-page);
}

html[data-theme='dark'] .content,
html[data-theme='dark'] .home-view,
html[data-theme='dark'] .settings-view,
html[data-theme='dark'] .page-view {
  color: #e4e8ee;
  background: var(--color-page);
}

html[data-theme='dark'] .console {
  color: #e4e8ee;
  background: #181818;
}

html[data-theme='dark'] .window-title,
html[data-theme='dark'] .window-control,
html[data-theme='dark'] .console h1,
html[data-theme='dark'] .settings-view h1,
html[data-theme='dark'] .settings-view h2,
html[data-theme='dark'] .settings-view .setting-row__title,
html[data-theme='dark'] .page-view h1,
html[data-theme='dark'] .page-view h2,
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
  background: var(--color-titlebar);
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
  color: #8ed3a2;
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
  border-color: #3d8058;
  background: #3d8058;
}

html[data-theme='dark'] .messages article.user {
  color: #e4e8ee;
  background: #253d2d;
}

html[data-theme='dark'] .messages article.assistant {
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
  background: #3d8058;
}

html[data-theme='dark'] .send-button:hover {
  background: #34704c;
}

html[data-theme='dark'] .send-button:disabled {
  background: #3a3a3a;
}

html[data-theme='dark'] .settings-group {
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .settings-view h2,
html[data-theme='dark'] .page-view h2 {
  border-color: #303030;
}

html[data-theme='dark'] .apps-group {
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .application-card {
  color: #e4e8ee;
  border-color: #303030;
  background: #181818;
}

html[data-theme='dark'] .application-card:hover {
  border-color: #3c3c3c;
  background: #303030;
}

html[data-theme='dark'] .memory-icon {
  color: #8ed3a2;
}

html[data-theme='dark'] .memory-content {
  border-color: #303030;
}

html[data-theme='dark'] .memory-menu {
  background: #181818;
}

html[data-theme='dark'] .memory-menu button {
  color: #aeb7c3;
}

html[data-theme='dark'] .memory-menu button:hover {
  background: #303030;
}

html[data-theme='dark'] .memory-menu button.active {
  color: #a8d8b5;
  background: #253d2d;
}

html[data-theme='dark'] .diary-content {
  border-color: #303030;
}

html[data-theme='dark'] .diary-menu {
  background: #181818;
}

html[data-theme='dark'] .diary-menu button {
  color: #aeb7c3;
}

html[data-theme='dark'] .diary-menu button:hover {
  background: #303030;
}

html[data-theme='dark'] .diary-menu button.active {
  color: #a8d8b5;
  background: #253d2d;
}

html[data-theme='dark'] .memory-content table {
  color: #d8dee8;
  border-color: #303030;
}

html[data-theme='dark'] .memory-content table th {
  color: #aeb7c3;
  border-color: #303030;
  background: #202020;
}

html[data-theme='dark'] .memory-content table td {
  border-color: #303030;
}

html[data-theme='dark'] .memory-content .row-actions button,
html[data-theme='dark'] .memory-content .status,
html[data-theme='dark'] .memory-content .empty-cell {
  color: #aeb7c3;
}

html[data-theme='dark'] .memory-content .status.active,
html[data-theme='dark'] .memory-content .row-actions button:hover {
  color: #8ed3a2;
}

html[data-theme='dark'] .memory-content .primary-button {
  color: #fff;
  border-color: #3d8058;
  background: #3d8058;
}

html[data-theme='dark'] .memory-content .primary-button:hover {
  background: #34704c;
}

html[data-theme='dark'] .memory-content .dialog {
  color: #e4e8ee;
  background: #181818;
  box-shadow: 0 16px 40px rgb(0 0 0 / 45%);
}

html[data-theme='dark'] .memory-content .dialog header {
  border-color: #303030;
}

html[data-theme='dark'] .memory-content .dialog > p,
html[data-theme='dark'] .memory-content .dialog header p,
html[data-theme='dark'] .memory-content .dialog label {
  color: #aeb7c3;
}

html[data-theme='dark'] .memory-content .dialog h2 {
  color: #e4e8ee;
}

html[data-theme='dark'] .memory-content .dialog input,
html[data-theme='dark'] .memory-content .dialog select,
html[data-theme='dark'] .memory-content .dialog .outline-button {
  color: #d8dee8;
  border-color: #303030;
  background: #202020;
}

html[data-theme='dark'] .memory-content .dialog .outline-button:hover,
html[data-theme='dark'] .memory-content .dialog .close-button:hover {
  background: #303030;
}

html[data-theme='dark'] .memory-content .dialog article.assistant {
  color: #e4e8ee;
  background: #252525;
}

html[data-theme='dark'] .memory-content .dialog article.user {
  color: #e4e8ee;
  background: #253d2d;
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
