<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="diary-section">
    <h2>{{ title }}</h2>
  </section>
</template>

<style scoped>
.diary-section {
  display: grid;
  min-height: 100%;
  place-items: center;
}

h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
}
</style>
