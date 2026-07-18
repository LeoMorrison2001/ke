import { jsonSchema, tool, type ToolSet } from 'ai'
import { getAgent } from '../registry/agent-registry'
import type { UiAction } from '../contracts/agent-contracts'
import { completeTaskRun, createTaskRun, recordTaskStep } from './task-repository'

interface DiaryDelegationInput {
  operation: 'check_today' | 'open_editor' | 'read_entry' | 'update_entry' | 'set_favorite'
  entryDate?: string
  favorite?: boolean
  content?: string
  contentMode?: 'replace' | 'append'
}

const diaryDelegationSchema = jsonSchema<DiaryDelegationInput>({
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['check_today', 'open_editor', 'read_entry', 'update_entry', 'set_favorite'],
      description: '日记 Agent 要执行的明确操作。'
    },
    entryDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: '需要读取或收藏的日记日期。仅在操作需要时传 YYYY-MM-DD。'
    },
    favorite: { type: 'boolean', description: 'set_favorite 时的目标收藏状态。' },
    content: { type: 'string', description: 'update_entry 时用户明确提供的日记内容。' },
    contentMode: {
      type: 'string',
      enum: ['replace', 'append'],
      description: 'update_entry 时替换原内容或追加到原内容后。'
    }
  },
  required: ['operation'],
  additionalProperties: false
})

export interface MasterToolsContext {
  conversationId: string
  userId: number
  userMessage: string
  onUiActions: (actions: UiAction[]) => void
}

export const createMasterTools = ({
  conversationId,
  userId,
  userMessage,
  onUiActions
}: MasterToolsContext): { tools: ToolSet; complete: () => void } => {
  let taskRunId: string | undefined
  const ensureTaskRun = (): string => {
    taskRunId ??= createTaskRun(conversationId, userId, userMessage)
    return taskRunId
  }

  return {
    tools: {
      delegate_to_diary_agent: tool({
        description:
          '将明确的日记任务交给小可日记 Agent。用于查询、打开、读取、修改、收藏日记。修改内容时，仅在用户明确提供新内容以及“替换/追加”意图时调用；未指定日期的修改默认是今天。其他日期不明确时不要猜测，应先追问。',
        inputSchema: diaryDelegationSchema,
        strict: true,
        execute: async (input) => {
          const agent = getAgent('diary')
          const result = await agent.execute({
            taskRunId: ensureTaskRun(),
            conversationId,
            userId,
            intent: `diary.${input.operation}`,
            operation: input.operation,
            userMessage,
            context: {
              entryDate: input.entryDate,
              favorite: input.favorite,
              content: input.content,
              contentMode: input.contentMode
            },
            permissions:
              input.operation === 'set_favorite' || input.operation === 'update_entry'
                ? ['read', 'execute']
                : ['read']
          })
          recordTaskStep(ensureTaskRun(), agent.id, input.operation, input, result)
          if (result.uiActions?.length) onUiActions(result.uiActions)
          return result
        }
      })
    },
    complete: () => {
      if (taskRunId) completeTaskRun(taskRunId)
    }
  }
}
