<script setup lang="ts">
import {
  ArrowUp,
  ArrowUpRight,
  Archive,
  BookOpenText,
  LayoutGrid,
  Menu,
  Pin,
  PinOff,
  Plus,
  Settings,
  Zap
} from 'lucide-vue-next'
import { nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import {
  type ChatUiAction,
  type ConversationSummary,
  useChatStore
} from '../modules/chat/stores/chat'

const message = ref('')
const isDrawerOpen = ref(false)
const maxComposerHeight = 180
const router = useRouter()
const chatStore = useChatStore()
const {
  chatScrollTop,
  activity,
  conversations,
  currentConversationId,
  isFollowingLatest,
  isLoadingOlderMessages,
  isSending,
  messages
} = storeToRefs(chatStore)
const conversationPendingArchive = ref<ConversationSummary>()
const chatArea = ref<HTMLElement>()

const resetComposer = async (): Promise<void> => {
  await nextTick()
  const textarea = document.querySelector<HTMLTextAreaElement>('.composer textarea')
  if (textarea) textarea.style.height = ''
}

const scrollToLatestMessage = async (force = false): Promise<void> => {
  if (!force && !isFollowingLatest.value) return

  await nextTick()
  const chatContainer = chatArea.value
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight
    chatStore.setChatScrollTop(chatContainer.scrollTop)
  }
}

const updateScrollFollowState = (event: Event): void => {
  const chatContainer = event.currentTarget as HTMLElement
  const distanceFromBottom =
    chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight
  isFollowingLatest.value = distanceFromBottom < 24
  chatStore.setChatScrollTop(chatContainer.scrollTop)

  if (chatContainer.scrollTop < 32) void loadOlderMessages()
}

const startNewConversation = (): void => {
  if (isSending.value) return

  chatStore.startNewConversation()
  isDrawerOpen.value = false
}

const loadConversation = async (conversationId: string): Promise<void> => {
  const opened = await chatStore.openConversation(conversationId)
  isFollowingLatest.value = true
  isDrawerOpen.value = false
  if (opened) await scrollToLatestMessage(true)
}

const loadOlderMessages = async (): Promise<void> => {
  const chatContainer = chatArea.value
  const previousScrollHeight = chatContainer?.scrollHeight ?? 0
  const loaded = await chatStore.loadOlderMessages()
  if (!loaded) return

  await nextTick()
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight - previousScrollHeight
    chatStore.setChatScrollTop(chatContainer.scrollTop)
  }
}

const togglePinnedConversation = async (conversationId: string): Promise<void> => {
  await chatStore.togglePinnedConversation(conversationId)
}

const requestConversationArchive = (conversation: ConversationSummary): void => {
  if (isSending.value) return
  conversationPendingArchive.value = conversation
}

const cancelConversationArchive = (): void => {
  conversationPendingArchive.value = undefined
}

const confirmConversationArchive = async (): Promise<void> => {
  const conversation = conversationPendingArchive.value
  if (!conversation || isSending.value) return

  await chatStore.archiveConversation(conversation.id)
  isFollowingLatest.value = true
  conversationPendingArchive.value = undefined
}

const sendMessage = async (): Promise<void> => {
  const content = message.value.trim()
  if (!content || isSending.value) return

  const sending = chatStore.sendMessage(content)
  message.value = ''
  await resetComposer()
  isFollowingLatest.value = true
  await scrollToLatestMessage(true)
  await sending
}

const resizeComposer = (event: Event): void => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.style.height = 'auto'

  const nextHeight = Math.min(textarea.scrollHeight, maxComposerHeight)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > maxComposerHeight ? 'auto' : 'hidden'
}

const formatMessageTime = (createdAt?: number, fallback?: string): string => {
  if (!createdAt) return fallback ?? ''

  const date = new Date(createdAt)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}:${second}`
}

const executeUiAction = (action: ChatUiAction): void => {
  if (action.type !== 'navigate') return
  void router.push({ name: action.routeName, params: action.params, query: action.query })
}

onMounted(() => {
  void chatStore.initialize()
  void nextTick(() => {
    const chatContainer = chatArea.value
    if (chatContainer) chatContainer.scrollTop = chatScrollTop.value
  })
})

watch(messages, () => void scrollToLatestMessage(), { deep: true })
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
        <button class="new-chat-button" type="button" @click="startNewConversation">
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
        <p v-if="isLoadingOlderMessages" class="loading-older">正在加载更早的消息…</p>
        <div
          v-for="chatMessage in messages"
          :key="chatMessage.id"
          :class="['message-entry', chatMessage.role]"
        >
          <article :class="chatMessage.role">
            <span v-if="chatMessage.content">{{ chatMessage.content }}</span>
            <span v-else-if="chatMessage.role === 'assistant' && isSending" class="thinking">
              {{ activity?.label ?? '小可正在思考' }}<span class="thinking__dots">...</span>
            </span>
          </article>
          <time v-if="chatMessage.createdAt || chatMessage.createdTime" class="message-time">
            {{ formatMessageTime(chatMessage.createdAt, chatMessage.createdTime) }}
          </time>
          <div v-if="chatMessage.role === 'assistant' && chatMessage.uiActions?.length" class="agent-actions">
            <button
              v-for="action in chatMessage.uiActions"
              :key="`${action.routeName}-${action.label}`"
              type="button"
              @click="executeUiAction(action)"
            >
              <span class="agent-action__icon"><BookOpenText :size="18" :stroke-width="1.8" /></span>
              <span class="agent-action__content">
                <strong>{{ action.label }}</strong>
                <small v-if="action.description">{{ action.description }}</small>
              </span>
              <ArrowUpRight :size="16" :stroke-width="1.8" />
            </button>
          </div>
        </div>
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
            <li
              v-for="conversation in conversations"
              :key="conversation.id"
              class="history-list-item"
            >
              <button
                :class="['history-item', { active: conversation.id === currentConversationId }]"
                type="button"
                @click="loadConversation(conversation.id)"
              >
                {{ conversation.title }}
              </button>
              <div class="history-actions">
                <button
                  :aria-label="conversation.isPinned ? '取消置顶' : '置顶'"
                  :class="['history-action', { pinned: conversation.isPinned }]"
                  :disabled="isSending"
                  type="button"
                  @click="togglePinnedConversation(conversation.id)"
                >
                  <PinOff v-if="conversation.isPinned" :size="15" :stroke-width="1.8" />
                  <Pin v-else :size="15" :stroke-width="1.8" />
                </button>
                <button
                  aria-label="归档对话"
                  class="history-action archive"
                  :disabled="isSending"
                  type="button"
                  @click="requestConversationArchive(conversation)"
                >
                  <Archive :size="15" :stroke-width="1.8" />
                </button>
              </div>
            </li>
          </ul>
        </div>
      </aside>
    </Transition>

    <div
      v-if="conversationPendingArchive"
      class="modal-backdrop"
      @click.self="cancelConversationArchive"
    >
      <section
        aria-modal="true"
        class="modal-panel archive-dialog"
        role="dialog"
        aria-labelledby="archive-dialog-title"
      >
        <h3 id="archive-dialog-title">归档对话？</h3>
        <p>“{{ conversationPendingArchive.title }}”将从历史消息中隐藏，但全部对话内容会保留。</p>
        <div class="archive-dialog__actions">
          <button type="button" @click="cancelConversationArchive">取消</button>
          <button class="archive-dialog__confirm" type="button" @click="confirmConversationArchive">
            归档
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.home-view {
  display: grid;
  position: relative;
  height: 100%;
  overflow: hidden;
  color: var(--color-text);
  grid-template-rows: auto minmax(0, 1fr) auto;
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

.console__left {
  display: flex;
  align-items: center;
}

.drawer-button,
.new-chat-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
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
  color: var(--color-text-muted);
  cursor: pointer;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.header-icon-button:hover {
  background: var(--color-surface-hover);
}

.drawer-button {
  width: 30px;
  height: 30px;
  border-radius: 7px;
}

.drawer-button:hover,
.new-chat-button:hover {
  background: var(--color-surface-hover);
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
  background: var(--color-titlebar);
  box-shadow: 8px 0 24px rgb(0 0 0 / 12%);
}

.history-drawer__content {
  padding: 14px 12px;
}

h2 {
  margin: 0 0 10px;
  padding: 0;
  color: var(--color-text);
  font-size: 16px;
  font-weight: 600;
}

ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.history-drawer ul {
  display: flex;
  gap: 4px;
  flex-direction: column;
}

.history-list-item {
  display: flex;
  position: relative;
  min-width: 0;
  align-items: center;
}

.history-item {
  display: block;
  width: auto;
  min-width: 0;
  flex: 1;
  padding: 9px 76px 9px 8px;
  overflow: hidden;
  color: var(--color-text);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 7px;
  font-size: 14px;
}

.history-item:hover,
.history-item.active {
  background: var(--color-surface-hover);
}

.history-actions {
  display: flex;
  position: absolute;
  top: 50%;
  right: 4px;
  gap: 5px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity 120ms ease;
}

.history-list-item:hover .history-actions {
  opacity: 1;
  pointer-events: auto;
}

.history-action {
  display: grid;
  width: 28px;
  height: 28px;
  padding: 0;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
}

.history-action:hover {
  background: var(--color-surface-hover);
}

.history-action.pinned {
  color: var(--color-accent-text);
}

.history-action.archive:hover {
  color: var(--color-accent-text);
}

.history-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.archive-dialog {
  box-sizing: border-box;
  width: min(360px, 100%);
  padding: 20px;
}

.archive-dialog h3,
.archive-dialog p {
  margin: 0;
}

.archive-dialog h3 {
  font-size: 16px;
  font-weight: 600;
}

.archive-dialog p {
  margin-top: 9px;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.55;
}

.archive-dialog__actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  justify-content: flex-end;
}

.archive-dialog__actions button {
  height: 32px;
  padding: 0 12px;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background: var(--color-surface);
}

.archive-dialog__actions button:hover {
  background: var(--color-surface-hover);
}

.archive-dialog__actions .archive-dialog__confirm {
  color: #fff;
  border-color: #3d8058;
  background: #3d8058;
}

.archive-dialog__actions .archive-dialog__confirm:hover {
  background: #34704c;
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
  max-width: 100%;
  padding: 10px 13px;
  white-space: pre-wrap;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.messages article.user {
  align-self: flex-end;
  background: var(--color-accent-soft);
}

.messages article.assistant {
  align-self: flex-start;
  background: var(--color-surface-muted);
}

.message-entry {
  display: flex;
  width: fit-content;
  max-width: 68%;
  flex-direction: column;
}

.message-entry.user {
  align-self: flex-end;
  align-items: flex-end;
}

.message-entry.assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.message-time {
  margin-top: 5px;
  color: #969696;
  font-size: 12px;
  line-height: 1;
}

.agent-actions {
  display: flex;
  max-width: 100%;
  margin-top: 8px;
  gap: 8px;
  align-self: flex-start;
}

.agent-actions button {
  display: grid;
  width: min(280px, 100%);
  padding: 10px 12px;
  gap: 10px;
  align-items: center;
  color: var(--color-accent-text);
  cursor: pointer;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
}

.agent-actions button:hover {
  background: var(--color-accent-soft);
}

.agent-action__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: var(--color-accent-soft);
}

.agent-action__content {
  display: flex;
  min-width: 0;
  gap: 2px;
  flex-direction: column;
}

.agent-action__content strong {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 600;
}

.agent-action__content small {
  overflow: hidden;
  color: var(--color-text-subtle);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinking {
  color: #777;
  white-space: nowrap;
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
  border: 1px solid var(--color-border);
  border-radius: 21px;
  background: var(--color-surface);
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
  color: var(--color-text);
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
  color: var(--color-text);
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
  background: #3d8058;
}

.send-button:hover {
  background: #34704c;
}

.send-button:disabled {
  cursor: not-allowed;
  background: var(--color-border);
}

@media (max-width: 640px) {
  .chat-area {
    padding: 16px;
  }

  .messages,
  .composer {
    width: 100%;
  }

  .composer-wrap {
    padding: 10px 12px 12px;
  }
}
</style>
