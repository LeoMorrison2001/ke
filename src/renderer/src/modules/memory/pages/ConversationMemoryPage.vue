<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface ConversationRecord {
  id: string
  title: string
  conversationDate: string
  createdTime: string
  updatedAt: number
  messageCount: number
  isArchived: boolean
}

interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdTime: string
  cursor: number
}

const conversations = ref<ConversationRecord[]>([])
const hasMoreConversations = ref(false)
const isLoadingConversations = ref(false)
const selectedConversation = ref<ConversationRecord>()
const messages = ref<ConversationMessage[]>([])
const oldestCursor = ref<number>()
const hasMore = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
let removeActiveChangeListener: (() => void) | undefined

const formatUpdatedAt = (timestamp: number): string => {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

const loadConversations = async (reset = false): Promise<void> => {
  if (isLoadingConversations.value || (!reset && !hasMoreConversations.value)) return
  isLoadingConversations.value = true
  if (reset) errorMessage.value = ''
  try {
    const page = await window.api.memory.getConversationSummaryPage(
      reset ? 0 : conversations.value.length
    )
    conversations.value = reset ? page.items : [...conversations.value, ...page.items]
    hasMoreConversations.value = page.hasMore
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取对话记忆失败，请稍后重试。'
  } finally {
    isLoadingConversations.value = false
  }
}

const loadMoreConversations = (): void => {
  void loadConversations()
}

const handleConversationTableScroll = (event: Event): void => {
  const target = event.target as HTMLDivElement
  if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
    loadMoreConversations()
  }
}

const viewConversation = async (conversation: ConversationRecord): Promise<void> => {
  selectedConversation.value = conversation
  messages.value = []
  oldestCursor.value = undefined
  hasMore.value = false
  isLoading.value = true
  errorMessage.value = ''
  try {
    const page = await window.api.chat.getMessagePage(conversation.id)
    messages.value = page.messages
    oldestCursor.value = page.messages.at(0)?.cursor
    hasMore.value = page.hasMore
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取历史对话失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

const loadOlderMessages = async (): Promise<void> => {
  const conversation = selectedConversation.value
  if (!conversation || !hasMore.value || oldestCursor.value === undefined || isLoading.value) return

  isLoading.value = true
  try {
    const page = await window.api.chat.getMessagePage(conversation.id, oldestCursor.value)
    messages.value = [...page.messages, ...messages.value]
    oldestCursor.value = messages.value.at(0)?.cursor
    hasMore.value = page.hasMore
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载更早消息失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

const closeDialog = (): void => {
  if (isLoading.value) return
  selectedConversation.value = undefined
  messages.value = []
  errorMessage.value = ''
}

onMounted(() => {
  void loadConversations(true)
  removeActiveChangeListener = window.api.user.onActiveChange(() => {
    selectedConversation.value = undefined
    messages.value = []
    void loadConversations(true)
  })
})

onBeforeUnmount(() => {
  removeActiveChangeListener?.()
})
</script>

<template>
  <div class="conversation-memory">
    <div class="table-wrap">
      <table class="conversation-table table-header">
        <colgroup>
          <col class="column-title" />
          <col class="column-date" />
          <col class="column-time" />
          <col class="column-count" />
          <col class="column-status" />
          <col class="column-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>对话标题</th>
            <th>对话日期</th>
            <th>最近更新</th>
            <th>消息数</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
      </table>
      <div class="table-scroll" @scroll="handleConversationTableScroll">
        <table class="conversation-table table-body">
          <colgroup>
            <col class="column-title" />
            <col class="column-date" />
            <col class="column-time" />
            <col class="column-count" />
            <col class="column-status" />
            <col class="column-actions" />
          </colgroup>
        <tbody>
          <tr v-for="conversation in conversations" :key="conversation.id">
            <td :title="conversation.title">{{ conversation.title }}</td>
            <td>{{ conversation.conversationDate }}</td>
            <td>{{ formatUpdatedAt(conversation.updatedAt) }}</td>
            <td>{{ conversation.messageCount }}</td>
            <td>{{ conversation.isArchived ? '已归档' : '进行中' }}</td>
            <td class="row-actions">
              <button type="button" @click="viewConversation(conversation)">查看</button>
            </td>
          </tr>
          <tr v-if="conversations.length === 0">
            <td class="empty-cell" colspan="6">暂无对话记忆</td>
          </tr>
        </tbody>
        </table>
        <p v-if="isLoadingConversations" class="table-load-state">加载中…</p>
        <p v-else-if="!hasMoreConversations && conversations.length > 0" class="table-load-state">
          已加载全部对话
        </p>
      </div>
    </div>
    <p v-if="errorMessage && !selectedConversation" class="page-error">{{ errorMessage }}</p>

    <div v-if="selectedConversation" class="modal-backdrop" @click.self="closeDialog">
      <section
        class="modal-panel dialog"
        aria-modal="true"
        role="dialog"
        :aria-label="selectedConversation.title"
      >
        <header>
          <div>
            <h2>{{ selectedConversation.title }}</h2>
            <p>
              {{ selectedConversation.conversationDate }} ·
              {{ selectedConversation.messageCount }} 条消息
            </p>
          </div>
          <button class="close-button" type="button" @click="closeDialog">关闭</button>
        </header>
        <p v-if="errorMessage" class="dialog-error">{{ errorMessage }}</p>
        <main class="message-list">
          <button
            v-if="hasMore"
            :disabled="isLoading"
            class="load-older"
            type="button"
            @click="loadOlderMessages"
          >
            {{ isLoading ? '加载中…' : '加载更早消息' }}
          </button>
          <article v-for="message in messages" :key="message.id" :class="message.role">
            <p>{{ message.content }}</p>
          </article>
          <p v-if="!isLoading && messages.length === 0" class="empty-history">暂无消息</p>
        </main>
      </section>
    </div>
  </div>
</template>

<style scoped>
.conversation-memory {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
}
.table-wrap {
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  flex: 1;
  padding: 20px;
  overflow: hidden;
  flex-direction: column;
}
.table-scroll {
  min-height: 0;
  overflow: auto;
  flex: 1;
}
.table-scroll::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.table-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.table-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #a9a9a9;
}
.table-scroll::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}
.table-load-state {
  margin: 12px 0;
  color: var(--color-text-subtle);
  font-size: 13px;
  text-align: center;
}
.conversation-table {
  width: 100%;
  min-width: 840px;
  table-layout: fixed;
  border-spacing: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  border: 1px solid var(--color-border);
}
.table-header {
  overflow: hidden;
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
}
.table-body {
  border-top: 0;
  border-radius: 0 0 10px 10px;
}
th,
td {
  padding: 12px 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  border-bottom: 1px solid var(--color-border-subtle);
}
th {
  color: var(--color-text-muted);
  font-weight: 600;
  background: var(--color-surface-muted);
}
tbody tr:last-child td {
  border-bottom: 0;
}
.column-title {
  width: 30%;
}
.column-date,
.column-time {
  width: 16%;
}
.column-count {
  width: 10%;
}
.column-status {
  width: 12%;
}
.column-actions {
  width: 16%;
}
.row-actions button,
.close-button,
.load-older {
  padding: 0;
  color: var(--color-accent-text);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 0;
  background: transparent;
}
.empty-cell,
.empty-history {
  padding: 30px;
  color: var(--color-text-subtle);
  text-align: center;
}
.page-error,
.dialog-error {
  margin: 0 20px 12px;
  color: #c44040;
  font-size: 13px;
}
.dialog {
  display: grid;
  box-sizing: border-box;
  width: min(100%, 820px);
  height: min(640px, calc(100vh - 40px));
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}
.dialog header {
  display: flex;
  padding: 18px 20px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border-subtle);
}
h2,
p {
  margin: 0;
}
h2 {
  font-size: 16px;
}
.dialog header p {
  margin-top: 5px;
  color: var(--color-text-subtle);
  font-size: 12px;
}
.close-button {
  padding: 6px 8px;
  color: var(--color-text-muted);
  border-radius: 6px;
}
.close-button:hover {
  background: var(--color-surface-hover);
}
.message-list {
  display: flex;
  min-height: 0;
  padding: 16px 20px 20px;
  overflow-y: auto;
  gap: 14px;
  flex-direction: column;
}
.message-list::-webkit-scrollbar {
  width: 5px;
}
.message-list::-webkit-scrollbar-track {
  background: transparent;
}
.message-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #a9a9a9;
}
.message-list::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}
.load-older {
  display: block;
  margin: 0 auto 16px;
}
.load-older:disabled {
  color: var(--color-text-subtle);
  cursor: wait;
}
article {
  max-width: 78%;
  padding: 10px 13px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  border-radius: 12px;
}
article.user {
  align-self: flex-end;
  background: var(--color-accent-soft);
}
article p {
  color: inherit;
}
article.assistant {
  align-self: flex-start;
  background: var(--color-surface-muted);
}
</style>
