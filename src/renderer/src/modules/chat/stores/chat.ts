import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConversationSummary {
  id: string
  title: string
  conversationDate: string
  createdTime: string
  isPinned: boolean
}

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  cursor?: number
  createdAt?: number
  createdTime?: string
}

export interface AiActivity {
  type: 'generation' | 'tool'
  label: string
  toolName?: string
}

export const useChatStore = defineStore('chat', () => {
  const currentConversationId = ref<string>(crypto.randomUUID())
  const messages = ref<DisplayMessage[]>([])
  const conversations = ref<ConversationSummary[]>([])
  const isFollowingLatest = ref(true)
  const isSending = ref(false)
  const activity = ref<AiActivity>()
  const isLoadingOlderMessages = ref(false)
  const hasMoreMessages = ref(false)
  const oldestMessageCursor = ref<number>()
  const chatScrollTop = ref(0)
  let initialized = false

  const refreshConversations = async (): Promise<void> => {
    conversations.value = await window.api.chat.listConversations()
  }

  const resetConversation = (): void => {
    currentConversationId.value = crypto.randomUUID()
    messages.value = []
    oldestMessageCursor.value = undefined
    hasMoreMessages.value = false
    chatScrollTop.value = 0
    isFollowingLatest.value = true
    isSending.value = false
    activity.value = undefined
  }

  const startNewConversation = (): void => {
    if (isSending.value) return
    resetConversation()
  }

  const openConversation = async (conversationId: string): Promise<boolean> => {
    if (isSending.value || conversationId === currentConversationId.value) return false

    const page = await window.api.chat.getMessagePage(conversationId)
    currentConversationId.value = conversationId
    messages.value = page.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      cursor: message.cursor,
      createdAt: message.createdAt,
      createdTime: message.createdTime
    }))
    oldestMessageCursor.value = page.messages.at(0)?.cursor
    hasMoreMessages.value = page.hasMore
    return true
  }

  const loadOlderMessages = async (): Promise<boolean> => {
    if (
      isLoadingOlderMessages.value ||
      !hasMoreMessages.value ||
      oldestMessageCursor.value === undefined
    ) {
      return false
    }

    const conversationId = currentConversationId.value
    isLoadingOlderMessages.value = true

    try {
      const page = await window.api.chat.getMessagePage(conversationId, oldestMessageCursor.value)
      if (conversationId !== currentConversationId.value) return false

      const olderMessages = page.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        cursor: message.cursor,
        createdAt: message.createdAt,
        createdTime: message.createdTime
      }))
      messages.value = [...olderMessages, ...messages.value]
      oldestMessageCursor.value = messages.value.at(0)?.cursor
      hasMoreMessages.value = page.hasMore
      return olderMessages.length > 0
    } finally {
      isLoadingOlderMessages.value = false
    }
  }

  const sendMessage = async (content: string): Promise<void> => {
    if (!content || isSending.value) return

    const userMessage: DisplayMessage = { id: crypto.randomUUID(), role: 'user', content }
    const assistantMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: ''
    }
    messages.value.push(userMessage, assistantMessage)
    isSending.value = true

    try {
      const savedUserMessage = await window.api.chat.saveUserMessage(
        currentConversationId.value,
        content
      )
      userMessage.id = savedUserMessage.id
      userMessage.cursor = savedUserMessage.cursor
      userMessage.createdAt = savedUserMessage.createdAt
      userMessage.createdTime = savedUserMessage.createdTime
      oldestMessageCursor.value ??= savedUserMessage.cursor
      await refreshConversations()
      await window.api.chat.send(currentConversationId.value)
    } catch (error) {
      assistantMessage.content = error instanceof Error ? error.message : '发送失败，请稍后重试。'
    } finally {
      isSending.value = false
    }
  }

  const togglePinnedConversation = async (conversationId: string): Promise<void> => {
    if (isSending.value) return
    await window.api.chat.toggleConversationPinned(conversationId)
    await refreshConversations()
  }

  const archiveConversation = async (conversationId: string): Promise<void> => {
    if (isSending.value) return
    await window.api.chat.archiveConversation(conversationId)
    if (conversationId === currentConversationId.value) resetConversation()
    await refreshConversations()
  }

  const initialize = async (): Promise<void> => {
    if (initialized) return
    initialized = true

    window.api.chat.onDelta(({ conversationId, text }) => {
      if (conversationId !== currentConversationId.value) return
      const assistantMessage = messages.value.at(-1)
      if (assistantMessage?.role === 'assistant') assistantMessage.content += text
    })
    window.api.chat.onActivity(({ conversationId, activity: nextActivity }) => {
      if (conversationId !== currentConversationId.value) return
      activity.value = nextActivity
    })
    window.api.chat.onComplete(({ conversationId, assistantMessage }) => {
      if (conversationId !== currentConversationId.value) return
      const assistantDisplayMessage = messages.value.at(-1)
      if (assistantDisplayMessage?.role === 'assistant') {
        assistantDisplayMessage.id = assistantMessage.id
        assistantDisplayMessage.cursor = assistantMessage.cursor
        assistantDisplayMessage.createdAt = assistantMessage.createdAt
        assistantDisplayMessage.createdTime = assistantMessage.createdTime
      }
      isSending.value = false
      activity.value = undefined
      void refreshConversations()
    })
    window.api.chat.onError(({ conversationId, errorMessage }) => {
      if (conversationId !== currentConversationId.value) return
      activity.value = undefined
      const assistantMessage = messages.value.at(-1)
      if (assistantMessage?.role === 'assistant') assistantMessage.content = errorMessage
    })
    window.api.user.onActiveChange(() => {
      resetConversation()
      void refreshConversations()
    })

    await refreshConversations()
  }

  return {
    activity,
    chatScrollTop,
    conversations,
    currentConversationId,
    hasMoreMessages,
    initialize,
    isFollowingLatest,
    isLoadingOlderMessages,
    isSending,
    loadOlderMessages,
    messages,
    openConversation,
    refreshConversations,
    resetConversation,
    setChatScrollTop: (scrollTop: number): void => {
      chatScrollTop.value = scrollTop
    },
    sendMessage,
    startNewConversation,
    togglePinnedConversation,
    archiveConversation
  }
})
