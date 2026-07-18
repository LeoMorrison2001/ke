import type { WebContents } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { AgentResult } from '../ai/contracts/agent-contracts'

interface PendingInvocation { resolve: (result: AgentResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
let runtime: WebContents | undefined
const pending = new Map<string, PendingInvocation>()
const invocationPluginIds = new Map<string, string>()
const invocationTimes = new Map<string, number[]>()
const MAX_CONCURRENT_INVOCATIONS = 2
const MAX_INVOCATIONS_PER_MINUTE = 20
const INVOCATION_TIMEOUT_MS = 30_000

const writeDiagnosticLog = (event: string, details: Record<string, unknown> = {}): void => {
  try {
    const directory = join(app.getPath('userData'), 'logs')
    mkdirSync(directory, { recursive: true })
    appendFileSync(
      join(directory, 'plugin-agent.log'),
      `${JSON.stringify({ time: new Date().toISOString(), event, ...details })}\n`,
      'utf8'
    )
  } catch {
    // Diagnostics must never interrupt plugin execution.
  }
}

export const registerPluginAgentRuntime = (sender: WebContents): void => {
  runtime = sender
  writeDiagnosticLog('runtime_registered', { webContentsId: sender.id })
}
export const unregisterPluginAgentRuntime = (sender: WebContents): void => {
  if (runtime?.id !== sender.id) return
  writeDiagnosticLog('runtime_unregistered', { webContentsId: sender.id, pendingCount: pending.size })
  runtime = undefined
  for (const [invocationId, invocation] of pending) {
    clearTimeout(invocation.timer)
    invocation.reject(new Error('应用 Agent 运行时已退出。'))
    pending.delete(invocationId)
    invocationPluginIds.delete(invocationId)
  }
}

const validateAgentResult = (value: unknown): AgentResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('应用 Agent 返回了无效结果。')
  const result = value as Record<string, unknown>
  if (!['completed', 'needs_input', 'needs_confirmation', 'failed'].includes(result.status as string)) throw new Error('应用 Agent 返回了无效状态。')
  if (typeof result.replyHint !== 'string' || result.replyHint.length > 4000) throw new Error('应用 Agent 返回的回复无效或过长。')
  if (result.uiActions !== undefined) throw new Error('第三方应用 Agent 暂不允许直接返回界面动作。')
  if (result.data !== undefined) {
    const serialized = JSON.stringify(result.data)
    if (!serialized || serialized.length > 32_000) throw new Error('应用 Agent 返回的数据无效或过大。')
  }
  return { status: result.status as AgentResult['status'], replyHint: result.replyHint, data: result.data as Record<string, unknown> | undefined }
}

export const invokePluginAgent = (invocationId: string, pluginId: string, capabilityId: string, input: unknown): Promise<AgentResult> => {
  if (!runtime || runtime.isDestroyed()) {
    writeDiagnosticLog('invoke_rejected', { pluginId, capabilityId, reason: 'runtime_unavailable' })
    return Promise.reject(new Error('应用 Agent 运行时不可用。'))
  }
  const serializedInput = JSON.stringify(input)
  if (!serializedInput || serializedInput.length > 32_000) return Promise.reject(new Error('应用 Agent 输入无效或过大。'))
  const activeInvocationCount = [...invocationPluginIds.values()].filter((id) => id === pluginId).length
  if (activeInvocationCount >= MAX_CONCURRENT_INVOCATIONS) return Promise.reject(new Error('应用 Agent 当前并发调用过多。'))
  const now = Date.now()
  const recentTimes = (invocationTimes.get(pluginId) ?? []).filter((time) => now - time < 60_000)
  if (recentTimes.length >= MAX_INVOCATIONS_PER_MINUTE) return Promise.reject(new Error('应用 Agent 调用过于频繁。'))
  recentTimes.push(now)
  invocationTimes.set(pluginId, recentTimes)
  writeDiagnosticLog('invoke_started', { invocationId, pluginId, capabilityId, inputBytes: serializedInput.length })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(invocationId)
      invocationPluginIds.delete(invocationId)
      writeDiagnosticLog('invoke_timeout', { invocationId, pluginId, capabilityId })
      reject(new Error('应用 Agent 响应超时。'))
    }, INVOCATION_TIMEOUT_MS)
    pending.set(invocationId, { resolve, reject, timer })
    invocationPluginIds.set(invocationId, pluginId)
    runtime.send('plugins:agent-invoke', { invocationId, pluginId, capabilityId, input })
  })
}

export const resolvePluginAgentInvocation = (invocationId: string, result: unknown): void => {
  const invocation = pending.get(invocationId)
  if (!invocation) return
  pending.delete(invocationId)
  invocationPluginIds.delete(invocationId)
  clearTimeout(invocation.timer)
  try {
    const validatedResult = validateAgentResult(result)
    writeDiagnosticLog('invoke_completed', { invocationId, status: validatedResult.status })
    invocation.resolve(validatedResult)
  } catch (error) {
    const message = error instanceof Error ? error.message : '应用 Agent 返回无效结果。'
    writeDiagnosticLog('invoke_invalid_result', { invocationId, message })
    invocation.reject(new Error(message))
  }
}
