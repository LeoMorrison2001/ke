<script setup lang="ts">
import { ArrowLeft, BookOpenText, Brain } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="page-view">
    <header class="console">
      <h1>应用</h1>
      <button class="back-button" type="button" @click="router.push({ name: 'home' })">
        <ArrowLeft :size="18" :stroke-width="1.8" />
        返回聊天
      </button>
    </header>
    <main class="apps-content">
      <section class="apps-group" aria-labelledby="system-applications-title">
        <h2 id="system-applications-title">系统应用</h2>
        <div class="apps-group__content">
          <button
            class="application-card"
            type="button"
            @click="router.push({ name: 'xiaoke-memory' })"
          >
            <Brain class="memory-icon" :size="26" :stroke-width="1.7" />
            <span>小可记忆</span>
          </button>
        </div>
      </section>
      <section class="apps-group" aria-labelledby="life-applications-title">
        <h2 id="life-applications-title">生活应用</h2>
        <div class="apps-group__content">
          <button
            class="application-card"
            type="button"
            @click="router.push({ name: 'xiaoke-diary' })"
          >
            <BookOpenText class="diary-icon" :size="26" :stroke-width="1.7" />
            <span>小可日记</span>
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

.memory-icon {
  color: #5c8e70;
}

.diary-icon {
  color: #b97842;
}

@media (max-width: 640px) {
  .apps-content {
    padding: var(--content-padding-compact);
  }
}
</style>
