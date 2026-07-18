<script setup lang="ts">
import { ArrowLeft, Settings2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RendererPlugin } from '../../plugins/plugin-contracts'
import { getEnabledRendererPlugins } from '../../plugins/plugin-registry'

const router = useRouter()
const plugins = ref<RendererPlugin[]>([])

onMounted(async () => {
  plugins.value = getEnabledRendererPlugins(await window.api.plugins.listInstalled())
})

const openPlugin = (plugin: RendererPlugin): void => {
  if (plugin.source === 'third-party') {
    void router.push({ name: 'plugin-host', params: { pluginId: plugin.id } })
    return
  }
  void router.push({ name: plugin.entryRouteName })
}
</script>

<template>
  <section class="page-view">
    <header class="console">
      <h1>应用</h1>
      <div class="console-actions"><button class="back-button" type="button" @click="router.push({ name: 'plugin-manager' })"><Settings2 :size="17" />管理插件</button><button class="back-button" type="button" @click="router.push({ name: 'home' })"><ArrowLeft :size="18" :stroke-width="1.8" />返回聊天</button></div>
    </header>
    <main class="apps-content">
      <section class="apps-group" aria-labelledby="installed-applications-title">
        <h2 id="installed-applications-title">已安装应用</h2>
        <div class="apps-group__content">
          <button
            v-for="plugin in plugins"
            :key="plugin.id"
            :aria-label="`打开${plugin.name}`"
            class="application-card"
            type="button"
            @click="openPlugin(plugin)"
          >
            <component
              :is="plugin.icon"
              :size="26"
              :stroke-width="1.7"
              :style="{ color: plugin.accentColor }"
            />
            <span>{{ plugin.name }}</span>
          </button>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.page-view {
  display: grid;
  height: 100%;
  color: var(--color-text);
  grid-template-rows: 48px minmax(0, 1fr);
  background: var(--color-page);
}

.console {
  display: flex;
  box-sizing: border-box;
  min-height: 48px;
  padding: 7px 12px;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface);
}

h1,
h2 {
  margin: 0;
}

h1 {
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
}

.back-button {
  display: inline-flex;
  height: 30px;
  gap: 5px;
  padding: 0 9px;
  align-items: center;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.back-button:hover {
  background: var(--color-surface-hover);
}

.console-actions { display: flex; gap: 4px; }

.apps-content {
  display: flex;
  overflow-y: auto;
  padding: var(--content-padding);
  gap: 18px;
  flex-direction: column;
}

.apps-group {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

h2 {
  padding: 14px 18px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border-subtle);
}

.apps-group__content {
  display: flex;
  min-height: 88px;
  padding: 18px;
  gap: 14px;
  align-items: flex-start;
}

.application-card {
  display: grid;
  width: 88px;
  aspect-ratio: 1;
  padding: 10px;
  gap: 6px;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
}

.application-card:hover {
  border-color: var(--color-border);
  background: var(--color-surface-hover);
}

@media (max-width: 640px) {
  .apps-content {
    padding: var(--content-padding-compact);
  }
}
</style>
