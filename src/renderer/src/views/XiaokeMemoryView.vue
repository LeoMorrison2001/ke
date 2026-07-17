<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UserInformationPanel from './UserInformationPanel.vue'
import ConversationMemoryPanel from './ConversationMemoryPanel.vue'

interface MemoryMenuItem {
  title: string
  section: 'profile' | 'long-term' | 'short-term' | 'conversation' | 'scheduled'
}

const memoryMenu: MemoryMenuItem[] = [
  { title: '用户信息', section: 'profile' },
  { title: '长期记忆', section: 'long-term' },
  { title: '短期记忆', section: 'short-term' },
  { title: '对话记忆', section: 'conversation' },
  { title: '定时记忆', section: 'scheduled' }
]

const route = useRoute()
const router = useRouter()
const activeSection = computed(() => route.params.section)
const activeMenuItem = computed(() =>
  memoryMenu.find((item) => item.section === activeSection.value)
)

const openSection = (section: MemoryMenuItem['section']): void => {
  void router.push({ name: 'xiaoke-memory-section', params: { section } })
}
</script>

<template>
  <section class="page-view memory-view">
    <header class="console">
      <h1>小可记忆</h1>
      <button class="back-button" type="button" @click="router.push({ name: 'applications' })">
        <ArrowLeft :size="18" :stroke-width="1.8" />
        返回应用
      </button>
    </header>
    <main class="memory-layout">
      <nav class="memory-menu" aria-label="小可记忆菜单">
        <button
          v-for="item in memoryMenu"
          :key="item.section"
          :class="{ active: item.section === activeSection }"
          type="button"
          @click="openSection(item.section)"
        >
          {{ item.title }}
        </button>
      </nav>
      <section
        :class="[
          'memory-content',
          {
            'memory-content--panel': activeSection === 'profile' || activeSection === 'conversation'
          }
        ]"
        :aria-label="activeMenuItem?.title"
      >
        <UserInformationPanel v-if="activeSection === 'profile'" />
        <ConversationMemoryPanel v-else-if="activeSection === 'conversation'" />
        <p v-else>{{ activeMenuItem?.title }}</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.memory-view {
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
  color: inherit;
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

.memory-layout {
  display: grid;
  min-height: 0;
  grid-template-columns: 184px minmax(0, 1fr);
}

.memory-menu {
  display: flex;
  padding: 16px 10px;
  gap: 4px;
  flex-direction: column;
  background: var(--color-surface);
}

.memory-menu button {
  width: 100%;
  min-height: 36px;
  padding: 0 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  text-align: left;
  border: 0;
  border-radius: 8px;
  background: transparent;
}

.memory-menu button:hover {
  background: var(--color-surface-hover);
}

.memory-menu button.active {
  color: var(--color-accent-text);
  font-weight: 600;
  background: var(--color-accent-soft);
}

.memory-content {
  display: grid;
  min-width: 0;
  place-items: center;
  border-top: 1px solid var(--color-border-subtle);
  border-left: 1px solid var(--color-border-subtle);
  border-top-left-radius: 14px;
}

.memory-content p {
  color: inherit;
  font-size: 20px;
  font-weight: 600;
}

.memory-content--panel {
  display: block;
  overflow: auto;
  width: 100%;
}

@media (max-width: 640px) {
  .memory-layout {
    grid-template-columns: 132px minmax(0, 1fr);
  }

  .memory-menu {
    padding: 12px 8px;
  }
}
</style>
