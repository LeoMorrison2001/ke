import { randomUUID } from 'node:crypto'
import { getDatabase } from '../../database'
import type { AgentResult, AgentStepStatus, AgentTaskStatus } from '../contracts/agent-contracts'

export const createTaskRun = (conversationId: string, userId: number, goal: string): string => {
  const id = randomUUID()
  const now = Date.now()
  getDatabase()
    .prepare(
      `INSERT INTO agent_task_runs
       (id, conversation_id, user_id, goal, status, context_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'running', '{}', ?, ?)`
    )
    .run(id, conversationId, userId, goal, now, now)
  return id
}

export const recordTaskStep = (
  taskRunId: string,
  agentId: string,
  operation: string,
  input: Record<string, unknown>,
  result: AgentResult
): void => {
  const now = Date.now()
  const stepId = randomUUID()
  getDatabase()
    .prepare(
      `INSERT INTO agent_task_steps
       (id, task_run_id, agent_id, operation, status, input_json, output_json, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(stepId, taskRunId, agentId, operation, result.status, JSON.stringify(input), JSON.stringify(result), now, now)
  getDatabase()
    .prepare(`UPDATE agent_task_runs SET active_agent_id = ?, status = ?, updated_at = ? WHERE id = ?`)
    .run(agentId, toTaskStatus(result.status), now, taskRunId)
}

export const completeTaskRun = (taskRunId: string): void => {
  getDatabase()
    .prepare(`UPDATE agent_task_runs SET status = 'completed', updated_at = ? WHERE id = ? AND status = 'running'`)
    .run(Date.now(), taskRunId)
}

const toTaskStatus = (status: AgentStepStatus): AgentTaskStatus => {
  if (status === 'needs_input') return 'waiting_user'
  if (status === 'needs_confirmation') return 'waiting_confirmation'
  if (status === 'failed') return 'failed'
  return 'running'
}
