import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { getConversationMessagesForModel, saveAssistantMessage } from '../conversation-repository'
import type { ActiveUser } from '../user-repository'
import { getChatModel } from './model-client'
import { generationActivity, type AiActivity } from './activity'
import { buildSystemPrompt } from './system-prompt'
import { createUserProfileTools, userProfileToolActivities } from './tools/user-profile-tools'

export interface StreamDialogueOptions {
  onDelta: (text: string) => void
  onActivity: (activity: AiActivity) => void
}

export const streamDialogue = async (
  conversationId: string,
  user: ActiveUser,
  { onActivity, onDelta }: StreamDialogueOptions
): Promise<void> => {
  if (!process.env.NEW_API_KEY) {
    throw new Error('未配置 AI API Key，请在 .env 中设置 NEW_API_KEY。')
  }

  const conversationMessages = getConversationMessagesForModel(conversationId, user.id)
  const modelMessages: ModelMessage[] = conversationMessages.map((message) => ({
    role: message.role,
    content: message.content
  }))
  const result = streamText({
    model: getChatModel(),
    system: buildSystemPrompt(user),
    messages: modelMessages,
    tools: createUserProfileTools(conversationId, user.id),
    stopWhen: stepCountIs(3)
  })
  let response = ''
  onActivity(generationActivity)

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      response += part.text
      onDelta(part.text)
      continue
    }

    if (part.type === 'tool-input-start' || part.type === 'tool-call') {
      onActivity(
        userProfileToolActivities[part.toolName]?.started ?? {
          type: 'tool',
          label: '正在处理请求',
          toolName: part.toolName
        }
      )
      continue
    }

    if (part.type === 'tool-result') {
      continue
    }

    if (part.type === 'tool-error') {
      continue
    }

    if (part.type === 'error') {
      throw part.error instanceof Error ? part.error : new Error('AI 响应失败，请稍后重试。')
    }
  }

  saveAssistantMessage(conversationId, response, user.id)
}
