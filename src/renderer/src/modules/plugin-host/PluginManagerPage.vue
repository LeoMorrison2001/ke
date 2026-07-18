<script setup lang="ts">
import { ArrowLeft, Download } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const plugins = ref<InstalledPlugin[]>([])
const pluginPendingUninstall = ref<InstalledPlugin>()
const errorMessage = ref('')
const thirdPartyPlugins = computed(() => plugins.value.filter((plugin) => plugin.manifest.source === 'third-party'))
const notifyApplicationChange = (): void => window.dispatchEvent(new Event('applications:changed'))

const refresh = async (): Promise<void> => {
  errorMessage.value = ''
  plugins.value = await window.api.plugins.listInstalled()
}

const installPlugin = async (): Promise<void> => {
  try {
    await window.api.plugins.chooseAndInstall()
    await refresh()
    notifyApplicationChange()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '导入应用失败。'
  }
}

const setEnabled = async (plugin: InstalledPlugin, enabled: boolean): Promise<void> => {
  try {
    await window.api.plugins.setEnabled(plugin.manifest.id, enabled)
    await refresh()
    notifyApplicationChange()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新应用状态失败。'
  }
}

const requestUninstall = (plugin: InstalledPlugin): void => {
  errorMessage.value = ''
  pluginPendingUninstall.value = plugin
}

const uninstall = async (): Promise<void> => {
  const plugin = pluginPendingUninstall.value
  if (!plugin) return
  try {
    if (await window.api.plugins.uninstall(plugin.manifest.id)) {
      pluginPendingUninstall.value = undefined
      await refresh()
      notifyApplicationChange()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '卸载应用失败。'
  }
}

onMounted(() => void refresh())
</script>

<template>
  <section class="page-view">
    <header class="console">
      <h1>应用管理</h1>
      <div class="console-actions">
        <button type="button" class="install-button" @click="installPlugin">
          <Download :size="16" :stroke-width="1.8" />
          导入应用
        </button>
        <button type="button" class="back-button" @click="router.push({ name: 'applications' })">
          <ArrowLeft :size="17" :stroke-width="1.8" />
          返回应用
        </button>
      </div>
    </header>
    <main class="content">
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="!thirdPartyPlugins.length" class="empty-state">还没有安装第三方应用。</p>
      <article v-for="plugin in thirdPartyPlugins" :key="plugin.manifest.id" class="plugin-card">
        <div class="plugin-title">
          <div class="plugin-details">
            <h2>{{ plugin.manifest.name }}</h2>
            <p>{{ plugin.manifest.id }} · v{{ plugin.manifest.version }}</p>
            <p class="plugin-description">{{ plugin.manifest.description }}</p>
          </div>
          <div class="plugin-actions">
            <button type="button" class="toggle-plugin" :class="{ enabled: plugin.enabled }" @click="setEnabled(plugin, !plugin.enabled)">{{ plugin.enabled ? '关闭' : '启动' }}</button>
            <button type="button" class="uninstall" @click="requestUninstall(plugin)">卸载</button>
          </div>
        </div>
      </article>
    </main>
    <div v-if="pluginPendingUninstall" class="modal-backdrop" @click.self="pluginPendingUninstall = undefined">
      <section class="modal-panel uninstall-dialog" role="dialog" aria-modal="true" aria-labelledby="uninstall-dialog-title">
        <h2 id="uninstall-dialog-title">卸载应用？</h2>
        <p>将会删除当前应用的所有数据，无法恢复。</p>
        <p v-if="errorMessage" class="dialog-error">{{ errorMessage }}</p>
        <div class="uninstall-dialog-actions">
          <button type="button" @click="pluginPendingUninstall = undefined">取消</button>
          <button type="button" class="confirm-uninstall" @click="uninstall">卸载</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.page-view { display: grid; height: 100%; color: var(--color-text); grid-template-rows: 48px minmax(0, 1fr); background: var(--color-page); }
.console { display: flex; box-sizing: border-box; min-height: 48px; padding: 7px 12px; align-items: center; justify-content: space-between; background: var(--color-surface); }
h1,h2,p { margin: 0; } h1 { font-size: 16px; font-weight: 600; }
.console-actions { display: flex; gap: 4px; align-items: center; }
.back-button,.install-button { display: inline-flex; height: 30px; gap: 5px; padding: 0 9px; align-items: center; color: var(--color-text-muted); cursor: pointer; font: inherit; font-size: 13px; border: 0; border-radius: 7px; background: transparent; }
.back-button:hover { background: var(--color-surface-hover); }.install-button { color: var(--color-accent-text); background: var(--color-accent-soft); }.install-button:hover { background: var(--color-surface-hover); }
.content { display: grid; position: relative; overflow: auto; padding: 20px; gap: 12px; align-content: start; }.plugin-card { padding: 16px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface); }.plugin-title { display: flex; align-items: flex-start; justify-content: space-between; }h2 { margin: 0; font-size: 14px; }.plugin-details p { margin: 5px 0 0; color: var(--color-text-subtle); font-size: 12px; }.plugin-details .plugin-description { margin-top: 10px; }.plugin-actions { display: grid; justify-items: end; gap: 7px; }.toggle-plugin,.uninstall { display: inline-flex; min-height: 25px; gap: 4px; padding: 0 7px; align-items: center; cursor: pointer; font: inherit; font-size: 12px; border-radius: 6px; background: transparent; }.toggle-plugin { color: var(--color-accent-text); border: 1px solid color-mix(in srgb, var(--color-accent-text) 30%, var(--color-border)); }.toggle-plugin:hover { background: var(--color-accent-soft); }.toggle-plugin.enabled { color: var(--color-text-muted); border-color: var(--color-border); }.toggle-plugin.enabled:hover { background: var(--color-surface-hover); }.uninstall { color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 34%, var(--color-border)); }.uninstall:hover { background: color-mix(in srgb, var(--color-danger) 9%, transparent); }.uninstall-dialog { box-sizing: border-box; width: min(360px, 100%); padding: 20px; }.uninstall-dialog h2 { font-size: 16px; font-weight: 600; }.uninstall-dialog p { margin: 9px 0 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.55; }.uninstall-dialog .dialog-error { color: var(--color-danger); }.uninstall-dialog-actions { display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end; }.uninstall-dialog-actions button { height: 32px; padding: 0 12px; color: var(--color-text-muted); cursor: pointer; font: inherit; border: 1px solid var(--color-border); border-radius: 7px; background: var(--color-surface); }.uninstall-dialog-actions button:hover { background: var(--color-surface-hover); }.uninstall-dialog-actions .confirm-uninstall { color: #fff; border-color: var(--color-danger); background: var(--color-danger); }.uninstall-dialog-actions .confirm-uninstall:hover { background: color-mix(in srgb, var(--color-danger) 86%, #000); }.error { color: var(--color-danger); font-size: 13px; }.empty-state { position: absolute; inset: 0; display: grid; place-items: center; color: var(--color-text-subtle); font-size: 13px; }
</style>
