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

const loadConversations = async (): Promise<void> => {
  errorMessage.value = ''
  try {
    conversations.value = await window.api.memory.listConversationSummaries()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取对话记忆失败，请稍后重试。'
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
  void loadConversations()
  removeActiveChangeListener = window.api.user.onActiveChange(() => {
    selectedConversation.value = undefined
    messages.value = []
    void loadConversations()
  })
})

onBeforeUnmount(() => {
  removeActiveChangeListener?.()
})
</script>

<template>
  <div class="conversation-memory">
    <div class="table-wrap">
      <table>
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
    </div>
    <p v-if="errorMessage && !selectedConversation" class="page-error">{{ errorMessage }}</p>

    <div v-if="selectedConversation" class="modal-backdrop" @click.self="closeDialog">
      <section
        class="dialog"
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
  width: 100%;
  min-height: 100%;
}
.table-wrap {
  box-sizing: border-box;
  width: 100%;
  padding: 20px;
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 840px;
  table-layout: fixed;
  border-spacing: 0;
  color: #4c596c;
  font-size: 13px;
  border: 1px solid #e3e6ea;
  border-radius: 10px;
}
th,
td {
  padding: 12px 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  border-bottom: 1px solid #edf0f2;
}
th {
  color: #667085;
  font-weight: 600;
  background: #f8f9fa;
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
  color: #28704a;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  border: 0;
  background: transparent;
}
.empty-cell,
.empty-history {
  padding: 30px;
  color: #8993a1;
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
  color: #2c3544;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 40px rgb(15 23 42 / 20%);
}
.dialog header {
  display: flex;
  padding: 18px 20px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #edf0f2;
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
  color: #8993a1;
  font-size: 12px;
}
.close-button {
  padding: 6px 8px;
  color: #4c596c;
  border-radius: 6px;
}
.close-button:hover {
  background: #f5f6f8;
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
  color: #8993a1;
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
  background: #eaf4fe;
}
article p {
  color: inherit;
}
article.assistant {
  align-self: flex-start;
  background: #f4f4f4;
}
:global(html[data-theme='dark']) table {
  color: #d8dee8;
  border-color: #303030;
}
:global(html[data-theme='dark']) th {
  color: #aeb7c3;
  background: #202020;
}
:global(html[data-theme='dark']) th,
:global(html[data-theme='dark']) td,
:global(html[data-theme='dark']) .dialog header {
  border-color: #303030;
}
:global(html[data-theme='dark']) .dialog {
  color: #e4e8ee;
  background: #181818;
}
:global(html[data-theme='dark']) .close-button:hover,
:global(html[data-theme='dark']) article.assistant {
  background: #252525;
}
:global(html[data-theme='dark']) article.user {
  background: #244b68;
}
</style>
