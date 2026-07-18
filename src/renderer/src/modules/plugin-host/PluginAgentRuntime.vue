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
  if (data.type !== 'ke-plugin:agent-result' || typeof data.invocationId !== 'string') return
  if (![...frames.values()].some((frame) => frame.contentWindow === event.source)) return
  window.api.plugins.resolveAgentInvocation(data.invocationId, data.result)
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
    if (!frame?.contentWindow) return
    frame.contentWindow.postMessage({ type: 'ke-plugin:agent-invoke', ...invocation }, '*')
  })
})

onBeforeUnmount(() => { window.api.plugins.unregisterAgentRuntime(); window.removeEventListener('message', handleMessage) })
</script>

<template><div aria-hidden="true" class="plugin-agent-runtime"><iframe v-for="plugin in plugins" :key="plugin.id" :src="plugin.url" sandbox="allow-scripts" :ref="(element) => registerFrame(plugin.id, element)"></iframe></div></template>

<style scoped>.plugin-agent-runtime{display:none}</style>
