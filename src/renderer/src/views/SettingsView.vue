<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <section class="page-view">
    <header class="page-toolbar">
      <button type="button" @click="router.push({ name: 'home' })">
        <ArrowLeft :size="18" :stroke-width="1.8" />
        返回首页
      </button>
    </header>
    <main>设置</main>
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

.page-toolbar {
  display: flex;
  box-sizing: border-box;
  padding: 7px 12px;
  align-items: center;
  border-bottom: 1px solid #efefef;
}

button {
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

button:hover {
  background: #f3f3f3;
}

main {
  display: grid;
  font-size: 20px;
  font-weight: 600;
  place-items: center;
}
</style>
