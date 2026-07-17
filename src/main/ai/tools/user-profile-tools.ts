import { jsonSchema, tool, type Tool, type ToolSet } from 'ai'
import type { AiActivity } from '../activity'
import { updateActiveUserPreferredName } from '../../user-repository'

interface PreferredNameToolOutput {
  changed: boolean
  previousPreferredName: string
  preferredName: string
}

interface ToolActivityPresentation {
  started: AiActivity
  completed: AiActivity
}

type UserProfileTools = ToolSet & {
  update_preferred_name: Tool<{ preferredName: string }, PreferredNameToolOutput>
}

export const userProfileToolActivities: Record<string, ToolActivityPresentation> = {
  update_preferred_name: {
    started: {
      type: 'tool',
      label: '正在更新称呼',
      toolName: 'update_preferred_name'
    },
    completed: {
      type: 'tool',
      label: '称呼已更新',
      toolName: 'update_preferred_name'
    }
  }
}

const preferredNameSchema = jsonSchema<{ preferredName: string }>({
  type: 'object',
  properties: {
    preferredName: {
      type: 'string',
      description: '用户希望小可长期使用的称呼，长度不超过 40 个字符。'
    }
  },
  required: ['preferredName'],
  additionalProperties: false
})

export const createUserProfileTools = (conversationId: string): UserProfileTools => ({
  update_preferred_name: tool({
    description:
      '仅当用户明确要求长期修改小可对自己的称呼时使用，例如“以后叫我宝贝”或“请记住叫我小航”。不要根据推测、临时玩笑、第三方信息或不明确表达调用。',
    inputSchema: preferredNameSchema,
    execute: async ({ preferredName }, { toolCallId }) => {
      const result = updateActiveUserPreferredName({
        preferredName,
        source: 'ai_tool',
        toolName: 'update_preferred_name',
        conversationId,
        toolCallId
      })

      return {
        changed: result.changed,
        previousPreferredName: result.previousPreferredName,
        preferredName: result.preferredName
      }
    }
  })
})
