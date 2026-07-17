<script setup lang="ts">
import { ArrowUp, LayoutGrid, Menu, Plus, Settings, Zap } from 'lucide-vue-next'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const message = ref('')
const isDrawerOpen = ref(false)
const isSending = ref(false)
const maxComposerHeight = 180
const historyMessages = ['欢迎使用小可', '新对话']
const router = useRouter()
const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const chatArea = ref<HTMLElement>()
const isFollowingLatest = ref(true)
let removeDeltaListener: (() => void) | undefined
let removeCompleteListener: (() => void) | undefined
let removeErrorListener: (() => void) | undefined

const resetComposer = async (): Promise<void> => {
  await nextTick()
  const textarea = document.querySelector<HTMLTextAreaElement>('.composer textarea')
  if (textarea) textarea.style.height = ''
}

const scrollToLatestMessage = async (force = false): Promise<void> => {
  if (!force && !isFollowingLatest.value) return

  await nextTick()
  const chatContainer = chatArea.value
  if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight
}

const updateScrollFollowState = (event: Event): void => {
  const chatContainer = event.currentTarget as HTMLElement
  const distanceFromBottom =
    chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight
  isFollowingLatest.value = distanceFromBottom < 24
}

const sendMessage = async (): Promise<void> => {
  const content = message.value.trim()
  if (!content || isSending.value) return

  messages.value.push({ role: 'user', content })
  const conversation = messages.value.map(({ role, content: messageContent }) => ({
    role,
    content: messageContent
  }))
  const assistantMessage = { role: 'assistant' as const, content: '' }
  messages.value.push(assistantMessage)
  message.value = ''
  isSending.value = true
  await resetComposer()
  isFollowingLatest.value = true
  await scrollToLatestMessage(true)

  try {
    await window.api.chat.send(conversation)
  } catch (error) {
    assistantMessage.content = error instanceof Error ? error.message : '发送失败，请稍后重试。'
  } finally {
    isSending.value = false
  }
}

const resizeComposer = (event: Event): void => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'

  const nextHeight = Math.min(textarea.scrollHeight, maxComposerHeight)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > maxComposerHeight ? 'auto' : 'hidden'
}

onMounted(() => {
  removeDeltaListener = window.api.chat.onDelta((text) => {
    const assistantMessage = messages.value.at(-1)
    if (assistantMessage?.role === 'assistant') assistantMessage.content += text
    void scrollToLatestMessage()
  })
  removeCompleteListener = window.api.chat.onComplete(() => {
    isSending.value = false
  })
  removeErrorListener = window.api.chat.onError((errorMessage) => {
    const assistantMessage = messages.value.at(-1)
    if (assistantMessage?.role === 'assistant') assistantMessage.content = errorMessage
  })
})

onUnmounted(() => {
  removeDeltaListener?.()
  removeCompleteListener?.()
  removeErrorListener?.()
})
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

    <main ref="chatArea" class="chat-area" @scroll="updateScrollFollowState">
      <div v-if="messages.length === 0" class="chat-empty">
        <Zap :size="24" :stroke-width="1.8" />
        <p>有什么可以帮你的？</p>
      </div>
      <div v-else class="messages">
        <article v-for="(chatMessage, index) in messages" :key="index" :class="chatMessage.role">
          <span v-if="chatMessage.content">{{ chatMessage.content }}</span>
          <span v-else-if="chatMessage.role === 'assistant' && isSending" class="thinking">
            小可努力思考中<span class="thinking__dots">...</span>
          </span>
        </article>
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
          @keydown.enter.exact.prevent="sendMessage"
        ></textarea>
        <div class="composer__actions">
          <button
            :disabled="!message.trim() || isSending"
            aria-label="发送消息"
            class="send-button"
            type="button"
            @click="sendMessage"
          >
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
  box-sizing: border-box;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  place-items: center;
}

.chat-area::-webkit-scrollbar {
  width: 5px;
}

.chat-area::-webkit-scrollbar-track {
  background: transparent;
}

.chat-area::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #a9a9a9;
}

.chat-area::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.messages {
  display: flex;
  width: 82%;
  height: 100%;
  min-width: 0;
  gap: 14px;
  flex-direction: column;
  align-self: start;
}

.messages article {
  max-width: 78%;
  padding: 10px 13px;
  white-space: pre-wrap;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.messages .user {
  align-self: flex-end;
  background: #eaf4fe;
}

.messages .assistant {
  align-self: flex-start;
  background: #f4f4f4;
}

.thinking {
  color: #777;
}

.thinking__dots {
  display: inline-block;
  width: 16px;
  overflow: hidden;
  vertical-align: bottom;
  animation: thinking-dots 1.2s steps(4, end) infinite;
}

@keyframes thinking-dots {
  from {
    width: 0;
  }

  to {
    width: 16px;
  }
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
  width: 0;
  height: 0;
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

.send-button:disabled {
  cursor: not-allowed;
  background: #d2d2d2;
}
</style>
