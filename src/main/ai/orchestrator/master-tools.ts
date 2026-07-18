import type { ToolSet } from 'ai'
import { createPluginAgentTools, getAgent } from '../registry/agent-registry'
import type { UiAction } from '../contracts/agent-contracts'
import { completeTaskRun, createTaskRun, recordTaskStep } from './task-repository'

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
    tools: createPluginAgentTools({
      executeAgent: async ({ agentId, operation, context, permissions }) => {
        const agent = getAgent(agentId)
        const result = await agent.execute({
          taskRunId: ensureTaskRun(),
          conversationId,
          userId,
          intent: `${agentId}.${operation}`,
          operation,
          userMessage,
          context,
          permissions
        })
        recordTaskStep(ensureTaskRun(), agent.id, operation, context, result)
        if (result.uiActions?.length) onUiActions(result.uiActions)
        return result
      }
    }),
    complete: () => {
      if (taskRunId) completeTaskRun(taskRunId)
    }
  }
}
