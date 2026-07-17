import { streamText, type ModelMessage } from 'ai'
import { getConversationMessagesForModel, saveAssistantMessage } from '../conversation-repository'
import { requireActiveUser } from '../user-repository'
import { getChatModel } from './model-client'
import { buildSystemPrompt } from './system-prompt'

export interface StreamDialogueOptions {
  onDelta: (text: string) => void
}

export const streamDialogue = async (
  conversationId: string,
  { onDelta }: StreamDialogueOptions
): Promise<void> => {
  if (!process.env.NEW_API_KEY) {
    throw new Error('未配置 AI API Key，请在 .env 中设置 NEW_API_KEY。')
  }

  const user = requireActiveUser()
  const conversationMessages = getConversationMessagesForModel(conversationId)
  const modelMessages: ModelMessage[] = conversationMessages.map((message) => ({
    role: message.role,
    content: message.content
  }))
  const result = streamText({
    model: getChatModel(),
    system: buildSystemPrompt(user),
    messages: modelMessages
  })
  let response = ''

  for await (const text of result.textStream) {
    response += text
    onDelta(text)
  }

  saveAssistantMessage(conversationId, response)
}
