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
  color: #252525;
  grid-template-rows: 48px minmax(0, 1fr);
  background: #fff;
}

.console {
  display: flex;
  box-sizing: border-box;
  min-height: 48px;
  padding: 7px 12px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #efefef;
  background: #fff;
}

h1,
h2 {
  margin: 0;
}

h1 {
  color: #252525;
  font-size: 16px;
  font-weight: 600;
}

.back-button {
  display: inline-flex;
  height: 30px;
  gap: 5px;
  padding: 0 9px;
  align-items: center;
  color: #4a4a4a;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.back-button:hover {
  background: #f3f3f3;
}

.apps-content {
  display: flex;
  overflow-y: auto;
  padding: 24px 40px 40px;
  gap: 18px;
  flex-direction: column;
}

.apps-group {
  overflow: hidden;
  border: 1px solid #e3e6ea;
  border-radius: 15px;
  background: #fff;
}

h2 {
  padding: 14px 18px;
  color: #2c3544;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid #e9ebee;
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
  color: #4c596c;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  place-items: center;
  border: 1px solid #e3e6ea;
  border-radius: 12px;
  background: #fff;
}

.application-card:hover {
  border-color: #cfd5dc;
  background: #f7f8fa;
}

.memory-icon {
  color: #5c8e70;
}

.diary-icon {
  color: #b97842;
}

@media (max-width: 640px) {
  .apps-content {
    padding: 20px 20px 28px;
  }
}
</style>
