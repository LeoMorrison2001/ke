<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface RuntimePlugin { id: string; url: string }
const plugins = ref<RuntimePlugin[]>([])
const frames = new Map<string, HTMLIFrameElement>()

const registerFrame = (pluginId: string, element: unknown): void => {
  if (element instanceof HTMLIFrameElement) frames.set(pluginId, element)
}

const postResult = (source: MessageEventSource | null, invocationId: string, result: unknown): void => {
  source?.postMessage({ type: 'ke-plugin:agent-result', invocationId, result }, '*')
}

const handleMessage = (event: MessageEvent<unknown>): void => {
  if (typeof event.data !== 'object' || event.data === null) return
  const data = event.data as Record<string, unknown>
  const pluginId = [...frames.entries()].find(([, frame]) => frame.contentWindow === event.source)?.[0]
  if (!pluginId) return
  if (data.type === 'ke-plugin:agent-result' && typeof data.invocationId === 'string') {
    window.api.plugins.resolveAgentInvocation(data.invocationId, data.result)
    return
  }
  if (data.type !== 'ke-plugin:request' || typeof data.requestId !== 'string' || !('request' in data)) return
  void window.api.plugins
    .bridgeRequest(pluginId, data.request)
    .then((value) => event.source?.postMessage({ type: 'ke-plugin:response', requestId: data.requestId, ok: true, value }, '*'))
    .catch((error) => event.source?.postMessage({ type: 'ke-plugin:response', requestId: data.requestId, ok: false, error: error instanceof Error ? error.message : '平台请求失败。' }, '*'))
}

onMounted(async () => {
  const installed = await window.api.plugins.listInstalled()
  plugins.value = installed.flatMap((plugin) => {
    const entry = plugin.manifest.uiEntry
    if (!plugin.enabled || plugin.manifest.source !== 'third-party' || !entry || !plugin.manifest.agentCapabilities?.length) return []
    return [{ id: plugin.manifest.id, url: `ke-plugin://${plugin.manifest.id}/${entry.split('/').map(encodeURIComponent).join('/')}` }]
  })
  window.api.plugins.registerAgentRuntime()
  window.addEventListener('message', handleMessage)
  window.api.plugins.onAgentInvoke((value) => {
    const invocation = value as { invocationId?: string; pluginId?: string; capabilityId?: string; input?: unknown }
    if (!invocation.invocationId || !invocation.pluginId || !invocation.capabilityId) return
    const frame = frames.get(invocation.pluginId)
    if (!frame?.contentWindow) {
      window.api.plugins.resolveAgentInvocation(invocation.invocationId, {
        status: 'failed',
        replyHint: '应用 Agent 运行时尚未准备完成，请稍后重试。'
      })
      return
    }
    frame.contentWindow.postMessage({ type: 'ke-plugin:agent-invoke', ...invocation }, '*')
  })
})

onBeforeUnmount(() => { window.api.plugins.unregisterAgentRuntime(); window.removeEventListener('message', handleMessage) })
</script>

<template><div aria-hidden="true" class="plugin-agent-runtime"><iframe v-for="plugin in plugins" :key="plugin.id" :src="plugin.url" sandbox="allow-scripts" :ref="(element) => registerFrame(plugin.id, element)"></iframe></div></template>

<style scoped>
.plugin-agent-runtime {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  inset: -1px auto auto -1px;
}

.plugin-agent-runtime iframe {
  width: 1px;
  height: 1px;
  border: 0;
}
</style>
