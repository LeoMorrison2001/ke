<script setup lang="ts">
import { ArrowLeft, Download, Trash2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const plugins = ref<InstalledPlugin[]>([])
const grants = ref<Record<string, PluginPermission[]>>({})
const errorMessage = ref('')

const refresh = async (): Promise<void> => {
  errorMessage.value = ''
  plugins.value = await window.api.plugins.listInstalled()
  const entries = await Promise.all(
    plugins.value.map(async (plugin) => [plugin.manifest.id, await window.api.plugins.getGrantedPermissions(plugin.manifest.id)] as const)
  )
  grants.value = Object.fromEntries(entries)
}

const installPlugin = async (): Promise<void> => {
  try {
    await window.api.plugins.chooseAndInstall()
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '导入插件失败。'
  }
}

const setEnabled = async (plugin: InstalledPlugin, enabled: boolean): Promise<void> => {
  try {
    await window.api.plugins.setEnabled(plugin.manifest.id, enabled)
    await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新插件状态失败。'
  }
}

const setPermission = async (pluginId: string, permission: PluginPermission, granted: boolean): Promise<void> => {
  try {
    grants.value[pluginId] = await window.api.plugins.setPermission(pluginId, permission, granted)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新权限失败。'
  }
}

const uninstall = async (pluginId: string): Promise<void> => {
  try {
    if (await window.api.plugins.uninstall(pluginId)) await refresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '卸载插件失败。'
  }
}

const readChecked = (event: Event): boolean => (event.target as HTMLInputElement).checked

onMounted(() => void refresh())
</script>

<template>
  <section class="page-view">
    <header class="console">
      <h1>插件管理</h1>
      <div class="console-actions">
        <button type="button" class="install-button" @click="installPlugin">
          <Download :size="16" :stroke-width="1.8" />
          导入插件
        </button>
        <button type="button" class="back-button" @click="router.push({ name: 'applications' })">
          <ArrowLeft :size="17" :stroke-width="1.8" />
          返回应用
        </button>
      </div>
    </header>
    <main class="content">
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <article v-for="plugin in plugins" :key="plugin.manifest.id" class="plugin-card">
        <div class="plugin-title"><div><h2>{{ plugin.manifest.name }}</h2><p>{{ plugin.manifest.id }} · v{{ plugin.manifest.version }}</p></div><label><input type="checkbox" :checked="plugin.enabled" @change="setEnabled(plugin, readChecked($event))" />启用</label></div>
        <p>{{ plugin.manifest.description }}</p>
        <div v-if="plugin.manifest.permissions.length" class="permissions"><span>权限</span><label v-for="permission in plugin.manifest.permissions" :key="permission"><input type="checkbox" :checked="grants[plugin.manifest.id]?.includes(permission)" @change="setPermission(plugin.manifest.id, permission, readChecked($event))" />{{ permission }}</label></div>
        <button v-if="plugin.manifest.source === 'third-party'" type="button" class="uninstall" @click="uninstall(plugin.manifest.id)"><Trash2 :size="15" />卸载</button>
      </article>
    </main>
  </section>
</template>

<style scoped>
.page-view { display: grid; height: 100%; color: var(--color-text); grid-template-rows: 48px minmax(0, 1fr); background: var(--color-page); }
.console { display: flex; box-sizing: border-box; min-height: 48px; padding: 7px 12px; align-items: center; justify-content: space-between; background: var(--color-surface); }
h1,h2,p { margin: 0; } h1 { font-size: 16px; font-weight: 600; }
.console-actions { display: flex; gap: 4px; align-items: center; }
.back-button,.install-button { display: inline-flex; height: 30px; gap: 5px; padding: 0 9px; align-items: center; color: var(--color-text-muted); cursor: pointer; font: inherit; font-size: 13px; border: 0; border-radius: 7px; background: transparent; }
.back-button:hover { background: var(--color-surface-hover); }.install-button { color: var(--color-accent-text); background: var(--color-accent-soft); }.install-button:hover { background: var(--color-surface-hover); }
.content { display: grid; overflow: auto; padding: 20px; gap: 12px; align-content: start; }.plugin-card { padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); }.plugin-title { display: flex; align-items: center; justify-content: space-between; }h2 { font-size: 14px; }.plugin-title p,.plugin-card>p { margin-top: 5px; color: var(--color-text-subtle); font-size: 12px; }.permissions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; font-size: 12px; }.permissions>span { color: var(--color-text-muted); }label { display: inline-flex; gap: 4px; align-items: center; font-size: 12px; }.uninstall { margin-top: 14px; color: var(--color-danger); }.error { color: var(--color-danger); font-size: 13px; }
</style>
