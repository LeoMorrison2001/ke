<script setup lang="ts">
import { Copy, Minus, Square, X } from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const {
  close,
  isMaximized: getIsMaximized,
  minimize,
  onMaximizeChange,
  toggleMaximize
} = window.api.windowControls
const isMaximized = ref(false)
let removeMaximizeListener: (() => void) | undefined

onMounted(async () => {
  isMaximized.value = await getIsMaximized()
  removeMaximizeListener = onMaximizeChange((maximized) => {
    isMaximized.value = maximized
  })
})

onUnmounted(() => {
  removeMaximizeListener?.()
})
</script>

<template>
  <div class="app-window">
    <header class="titlebar">
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
    <main class="content"></main>
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
  justify-content: flex-end;
  -webkit-app-region: drag;
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
</style>
