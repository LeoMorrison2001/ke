<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
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
    <main>应用</main>
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

h1 {
  margin: 0;
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

main {
  display: grid;
  font-size: 20px;
  font-weight: 600;
  place-items: center;
}
</style>
