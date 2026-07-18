export type AgentTaskStatus =
  | 'running'
  | 'waiting_user'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type AgentStepStatus = 'completed' | 'needs_input' | 'needs_confirmation' | 'failed'

export interface UiAction {
  type: 'navigate'
  label: string
  description?: string
  routeName: 'xiaoke-diary-today' | 'xiaoke-diary-entry'
  params?: Record<string, string>
  query?: Record<string, string>
}

export interface AgentTask {
  taskRunId: string
  conversationId: string
  userId: number
  intent: string
  operation: string
  userMessage: string
  context: Record<string, unknown>
  permissions: Array<'read' | 'execute'>
}

export interface AgentResult {
  status: AgentStepStatus
  replyHint: string
  data?: Record<string, unknown>
  uiActions?: UiAction[]
}

export interface AgentDefinition {
  id: string
  supportedOperations: readonly string[]
  execute: (task: AgentTask) => Promise<AgentResult>
}
