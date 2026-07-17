<script setup lang="ts">
import { ArrowUp, LayoutGrid, Menu, Plus, Settings, Zap } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const message = ref('')
const isDrawerOpen = ref(false)
const maxComposerHeight = 180
const historyMessages = ['欢迎使用小可', '新对话']
const router = useRouter()

const resizeComposer = (event: Event): void => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'

  const nextHeight = Math.min(textarea.scrollHeight, maxComposerHeight)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > maxComposerHeight ? 'auto' : 'hidden'
}
</script>

<template>
  <section class="home-view">
    <header class="console">
      <div class="console__left">
        <button
          aria-label="打开抽屉"
          class="drawer-button"
          type="button"
          @click="isDrawerOpen = !isDrawerOpen"
        >
          <Menu :size="19" :stroke-width="1.8" />
        </button>
      </div>
      <div class="console__actions">
        <button class="new-chat-button" type="button">
          <Plus :size="17" :stroke-width="2" />
          新对话
        </button>
        <button
          aria-label="应用"
          class="header-icon-button"
          type="button"
          @click="router.push({ name: 'applications' })"
        >
          <LayoutGrid :size="18" :stroke-width="1.8" />
        </button>
        <button
          aria-label="设置"
          class="header-icon-button"
          type="button"
          @click="router.push({ name: 'settings' })"
        >
          <Settings :size="18" :stroke-width="1.8" />
        </button>
      </div>
    </header>

    <main class="chat-area">
      <div class="chat-empty">
        <Zap :size="24" :stroke-width="1.8" />
        <p>有什么可以帮你的？</p>
      </div>
    </main>

    <footer class="composer-wrap">
      <div class="composer">
        <textarea
          v-model="message"
          aria-label="消息内容"
          placeholder="给我发送消息..."
          rows="1"
          @input="resizeComposer"
        ></textarea>
        <div class="composer__actions">
          <button aria-label="发送消息" class="send-button" type="button">
            <ArrowUp :size="18" :stroke-width="2.2" />
          </button>
        </div>
      </div>
    </footer>

    <div v-if="isDrawerOpen" class="drawer-backdrop" @click="isDrawerOpen = false"></div>
    <Transition name="drawer">
      <aside v-if="isDrawerOpen" class="history-drawer" @click.stop>
        <div class="history-drawer__content">
          <h2>历史消息</h2>
          <ul>
            <li v-for="historyMessage in historyMessages" :key="historyMessage">
              <button type="button">{{ historyMessage }}</button>
            </li>
          </ul>
        </div>
      </aside>
    </Transition>
  </section>
</template>

<style scoped>
.home-view {
  display: grid;
  position: relative;
  height: 100%;
  overflow: hidden;
  color: #252525;
  grid-template-rows: auto minmax(0, 1fr) auto;
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

.console__left {
  display: flex;
  align-items: center;
}

.drawer-button,
.new-chat-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4a4a4a;
  cursor: pointer;
  font: inherit;
  border: 0;
  background: transparent;
}

.console__actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.header-icon-button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  color: #4a4a4a;
  cursor: pointer;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.header-icon-button:hover {
  background: #f3f3f3;
}

.drawer-button {
  width: 30px;
  height: 30px;
  border-radius: 7px;
}

.drawer-button:hover,
.new-chat-button:hover {
  background: #f3f3f3;
}

.new-chat-button {
  gap: 5px;
  height: 30px;
  padding: 0 9px;
  border-radius: 7px;
  font-size: 13px;
}

.drawer-backdrop {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: rgb(0 0 0 / 12%);
}

.history-drawer {
  position: absolute;
  z-index: 2;
  top: 0;
  bottom: 0;
  left: 0;
  width: clamp(280px, 30vw, 360px);
  background: #f5f5f5;
  box-shadow: 8px 0 24px rgb(0 0 0 / 12%);
}

.history-drawer__content {
  padding: 18px 12px;
}

h2 {
  margin: 0 0 10px;
  padding: 0 8px;
  color: #777;
  font-size: 12px;
  font-weight: 500;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

li button {
  display: block;
  width: 100%;
  padding: 9px 8px;
  overflow: hidden;
  color: #303030;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 7px;
}

li button:hover {
  background: #e8e8e8;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 180ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(-100%);
}

.chat-area {
  display: grid;
  min-height: 0;
  padding: 24px;
  place-items: center;
}

.chat-empty {
  display: grid;
  gap: 10px;
  color: #969696;
  text-align: center;
  place-items: center;
}

.chat-empty p {
  margin: 0;
  font-size: 15px;
}

.composer-wrap {
  padding: 12px 6px 12px;
}

.composer {
  width: 82%;
  overflow: hidden;
  padding: 12px;
  margin: 0 auto;
  border: 1px solid #e6e6e6;
  border-radius: 21px;
  background: #fff;
  box-shadow: 0 3px 12px rgb(0 0 0 / 5%);
}

textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 64px;
  padding: 4px;
  resize: none;
  overflow-y: hidden;
  color: #272727;
  font: inherit;
  line-height: 1.5;
  outline: none;
  border: 0;
  background: transparent;
}

textarea::placeholder {
  color: #a8a8a8;
}

textarea::-webkit-scrollbar {
  width: 5px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #a9a9a9;
}

textarea::-webkit-scrollbar-button {
  display: none;
}

.composer__actions {
  display: flex;
  margin-top: 12px;
  padding: 0;
  align-items: center;
  justify-content: flex-end;
}

button {
  display: inline-flex;
  padding: 0;
  align-items: center;
  justify-content: center;
  color: #323232;
  cursor: pointer;
  font: inherit;
  border: 0;
  background: transparent;
}

.send-button {
  width: 29px;
  height: 29px;
  color: #fff;
  border-radius: 50%;
  background: #91c8f7;
}

.send-button:hover {
  background: #6eb5ee;
}
</style>
