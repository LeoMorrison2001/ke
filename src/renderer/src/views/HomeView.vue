<script setup lang="ts">
import { ArrowUp, Zap } from 'lucide-vue-next'
import { ref } from 'vue'

const message = ref('')
const maxComposerHeight = 180

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
      <h1>控制台</h1>
      <span class="console__status"><i></i> 已就绪</span>
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
  </section>
</template>

<style scoped>
.home-view {
  display: grid;
  height: 100%;
  color: #252525;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #fff;
}

.console {
  display: flex;
  box-sizing: border-box;
  min-height: 48px;
  padding: 7px 18px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #efefef;
  background: #fff;
}

h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
}

.console__status {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  color: #5b9f5d;
  font-size: 13px;
}

.console__status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #63ae67;
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
  padding: 12px 6px 32px;
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
