<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const diaryMenu = ['今天', '日历', '时间线', '收藏']
const activeMenuItem = ref('今天')
</script>

<template>
  <section class="page-view diary-view">
    <header class="console">
      <h1>小可日记</h1>
      <button class="back-button" type="button" @click="router.push({ name: 'applications' })">
        <ArrowLeft :size="18" :stroke-width="1.8" />
        返回应用
      </button>
    </header>
    <main class="diary-layout">
      <nav class="diary-menu" aria-label="小可日记菜单">
        <button
          v-for="item in diaryMenu"
          :key="item"
          :class="{ active: item === activeMenuItem }"
          type="button"
          @click="activeMenuItem = item"
        >
          {{ item }}
        </button>
      </nav>
      <section class="diary-content" :aria-label="activeMenuItem">
        <p>小可日记</p>
      </section>
    </main>
  </section>
</template>

<style scoped>
.diary-view {
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

.diary-layout {
  display: grid;
  min-height: 0;
  grid-template-columns: 184px minmax(0, 1fr);
}

.diary-menu {
  display: flex;
  padding: 16px 10px;
  gap: 4px;
  flex-direction: column;
  background: var(--color-surface);
}

.diary-menu button {
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

.diary-menu button:hover {
  background: var(--color-surface-hover);
}

.diary-menu button.active {
  color: var(--color-accent-text);
  font-weight: 600;
  background: var(--color-accent-soft);
}

.diary-content {
  display: grid;
  min-width: 0;
  place-items: center;
  border-top: 1px solid var(--color-border-subtle);
  border-left: 1px solid var(--color-border-subtle);
  border-top-left-radius: 14px;
}

.diary-content p {
  font-size: 20px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .diary-layout {
    grid-template-columns: 132px minmax(0, 1fr);
  }

  .diary-menu {
    padding: 12px 8px;
  }
}
</style>
