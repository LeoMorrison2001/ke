<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const pluginName = ref('应用')
const pluginUrl = ref<string>()
const loadError = ref('')
const pluginFrame = ref<HTMLIFrameElement>()
let themeObserver: MutationObserver | undefined

const pluginId = computed(() => (typeof route.params.pluginId === 'string' ? route.params.pluginId : ''))

const sendTheme = (): void => {
  pluginFrame.value?.contentWindow?.postMessage(
    { type: 'ke-plugin:theme', theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light' },
    '*'
  )
}

const buildPluginUrl = (plugin: InstalledPlugin): string => {
  const entryPath = plugin.manifest.uiEntry
  if (!entryPath) throw new Error('应用未声明页面入口。')
  const encodedPath = entryPath.split('/').map(encodeURIComponent).join('/')
  return `ke-plugin://${plugin.manifest.id}/${encodedPath}`
}

const isBridgeRequest = (value: unknown): value is { type: string; requestId: string; request: unknown } => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const message = value as Record<string, unknown>
  return (
    message.type === 'ke-plugin:request' &&
    typeof message.requestId === 'string' &&
    message.requestId.length > 0 &&
    'request' in message
  )
}

const handlePluginMessage = (event: MessageEvent<unknown>): void => {
  if (event.source !== pluginFrame.value?.contentWindow || !isBridgeRequest(event.data)) return

  void window.api.plugins
    .bridgeRequest(pluginId.value, event.data.request)
    .then((value) => {
      event.source?.postMessage({ type: 'ke-plugin:response', requestId: event.data.requestId, ok: true, value }, '*')
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : '应用请求失败。'
      event.source?.postMessage({ type: 'ke-plugin:response', requestId: event.data.requestId, ok: false, error: message }, '*')
    })
}

onMounted(async () => {
  window.addEventListener('message', handlePluginMessage)
  themeObserver = new MutationObserver(sendTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  try {
    const plugin = (await window.api.plugins.listInstalled()).find(
      (item) =>
        item.manifest.id === pluginId.value &&
        item.manifest.source === 'third-party' &&
        item.enabled
    )
    if (!plugin) throw new Error('应用不存在、未启动，或暂时不可用。')

    pluginName.value = plugin.manifest.name
    pluginUrl.value = buildPluginUrl(plugin)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载应用失败。'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handlePluginMessage)
  themeObserver?.disconnect()
})
</script>

<template>
  <section class="plugin-host-view">
    <header class="console">
      <h1>{{ pluginName }}</h1>
      <button class="back-button" type="button" @click="router.push({ name: 'applications' })">
        <ArrowLeft :size="18" :stroke-width="1.8" />
        返回应用
      </button>
    </header>
    <main class="plugin-host-content">
      <iframe
        v-if="pluginUrl"
        :src="pluginUrl"
        :title="pluginName"
        ref="pluginFrame"
        class="plugin-frame"
        sandbox="allow-scripts allow-forms"
        referrerpolicy="no-referrer"
        @load="sendTheme"
      ></iframe>
      <p v-else class="plugin-state">{{ loadError || '正在加载应用…' }}</p>
    </main>
  </section>
</template>

<style scoped>
.plugin-host-view {
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
p {
  margin: 0;
}

h1 {
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

.plugin-host-content {
  min-height: 0;
  overflow: hidden;
}

.plugin-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--color-surface);
}

.plugin-state {
  padding: 36px;
  color: var(--color-text-subtle);
  font-size: 14px;
  text-align: center;
}
</style>
