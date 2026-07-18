<script setup lang="ts">
import { ArrowLeft, Database } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getThemePreference, setThemePreference, type ThemePreference } from '../theme'

interface DatabaseLocation {
  directory: string
  databasePath: string
  isDefault: boolean
}

const router = useRouter()
const databaseLocation = ref<DatabaseLocation>()
const isMigrating = ref(false)
const statusMessage = ref('')
const statusType = ref<'success' | 'error'>('success')
const themePreference = ref<ThemePreference>(getThemePreference())

const changeTheme = (preference: ThemePreference): void => {
  themePreference.value = preference
  setThemePreference(preference)
}

const loadDatabaseLocation = async (): Promise<void> => {
  databaseLocation.value = await window.api.settings.getDatabaseLocation()
}

const migrateDatabase = async (): Promise<void> => {
  isMigrating.value = true
  statusMessage.value = ''

  try {
    const targetDirectory = await window.api.settings.chooseDatabaseDirectory()
    if (!targetDirectory) return

    const location = await window.api.settings.migrateDatabaseDirectory(targetDirectory)
    if (!location) return

    databaseLocation.value = location
    statusType.value = 'success'
    statusMessage.value = '聊天数据已迁移至新位置。'
  } catch (error) {
    statusType.value = 'error'
    statusMessage.value = error instanceof Error ? error.message : '数据迁移失败，请稍后重试。'
  } finally {
    isMigrating.value = false
  }
}

onMounted(() => {
  void loadDatabaseLocation()
})
</script>

<template>
  <section class="settings-view">
    <header class="console">
      <h1>设置</h1>
      <button class="back-button" type="button" @click="router.push({ name: 'home' })">
        <ArrowLeft :size="17" :stroke-width="1.8" />
        返回聊天
      </button>
    </header>

    <main class="settings-content">
      <section class="settings-group" aria-labelledby="appearance-title">
        <h2 id="appearance-title">外观</h2>
        <div class="setting-row theme-row">
          <div class="setting-row__main">
            <div class="setting-row__title">主题</div>
            <p>选择你偏好的显示方式</p>
          </div>
          <div class="theme-options" role="group" aria-label="主题选择">
            <button
              :class="{ active: themePreference === 'light' }"
              type="button"
              @click="changeTheme('light')"
            >
              浅色
            </button>
            <button
              :class="{ active: themePreference === 'dark' }"
              type="button"
              @click="changeTheme('dark')"
            >
              深色
            </button>
            <button
              :class="{ active: themePreference === 'system' }"
              type="button"
              @click="changeTheme('system')"
            >
              跟随系统
            </button>
          </div>
        </div>
      </section>

      <section class="settings-group" aria-labelledby="data-privacy-title">
        <h2 id="data-privacy-title">数据与隐私</h2>
        <div class="setting-row">
          <div class="setting-row__main">
            <div class="setting-row__title">
              <Database :size="17" :stroke-width="1.8" />
              数据保存位置
            </div>
            <template v-if="databaseLocation">
              <code>{{ databaseLocation.directory }}</code>
              <p>
                {{ databaseLocation.isDefault ? '当前使用默认数据目录' : '当前使用自定义数据目录' }}
              </p>
            </template>
            <p v-else>正在读取数据目录…</p>
            <p v-if="statusMessage" :class="['status-message', statusType]">{{ statusMessage }}</p>
          </div>
          <button
            class="outline-button"
            :disabled="isMigrating || !databaseLocation"
            type="button"
            @click="migrateDatabase"
          >
            {{ isMigrating ? '迁移中…' : '更改位置' }}
          </button>
        </div>
      </section>

      <section class="settings-group" aria-labelledby="about-title">
        <h2 id="about-title">关于</h2>
        <div class="setting-row about-row">
          <div class="setting-row__main">
            <div class="setting-row__title">小可</div>
            <p>本地存储对话记录的 AI 助手。</p>
          </div>
          <span class="version">版本 1.0.0</span>
        </div>
      </section>
    </main>
  </section>
</template>

<style scoped>
.settings-view {
  display: grid;
  height: 100%;
  min-height: 0;
  color: var(--color-text);
  grid-template-rows: auto minmax(0, 1fr);
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
h2,
p {
  margin: 0;
}

h1 {
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

.back-button,
.outline-button {
  display: inline-flex;
  height: 34px;
  gap: 5px;
  padding: 0 11px;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
}

.back-button {
  height: 30px;
  padding: 0 9px;
  border-color: transparent;
  background: transparent;
}

.back-button:hover,
.outline-button:hover {
  background: var(--color-surface-hover);
}

.outline-button:disabled {
  color: var(--color-text-subtle);
  cursor: not-allowed;
  background: var(--color-surface-muted);
}

.settings-content {
  overflow-y: auto;
  padding: var(--content-padding);
}

.settings-group {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  background: var(--color-surface);
}

.settings-group + .settings-group {
  margin-top: 24px;
}

h2 {
  padding: 14px 18px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border-subtle);
}

.setting-row {
  display: flex;
  min-height: 88px;
  padding: 16px 18px;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.setting-row__main {
  min-width: 0;
}

.setting-row__title {
  display: flex;
  gap: 7px;
  align-items: center;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.setting-row__title svg {
  color: var(--color-text-muted);
}

.theme-row {
  min-height: 88px;
}

.theme-options {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.theme-options button {
  height: 34px;
  padding: 0 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
}

.theme-options button:hover {
  background: var(--color-surface-hover);
}

.theme-options button.active {
  color: var(--color-accent-text);
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.setting-row p {
  margin-top: 5px;
  color: var(--color-text-subtle);
  font-size: 13px;
  line-height: 1.45;
}

code {
  display: block;
  margin-top: 6px;
  overflow-wrap: anywhere;
  color: var(--color-text-muted);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.45;
}

.status-message.success {
  color: #20834a;
}

.status-message.error {
  color: #c44040;
}

.about-row {
  min-height: 74px;
}

.version {
  flex: 0 0 auto;
  color: #8993a1;
  font-size: 13px;
}

@media (max-width: 640px) {
  .settings-content {
    padding: var(--content-padding-compact);
  }

  .setting-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .outline-button {
    align-self: flex-end;
  }

  .theme-options {
    align-self: flex-end;
  }
}
</style>
