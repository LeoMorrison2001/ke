import type { WebContents } from 'electron'
import type { AgentResult } from '../ai/contracts/agent-contracts'

interface PendingInvocation { resolve: (result: AgentResult) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
let runtime: WebContents | undefined
const pending = new Map<string, PendingInvocation>()

export const registerPluginAgentRuntime = (sender: WebContents): void => { runtime = sender }
export const unregisterPluginAgentRuntime = (sender: WebContents): void => { if (runtime?.id === sender.id) runtime = undefined }

export const invokePluginAgent = (invocationId: string, pluginId: string, capabilityId: string, input: unknown): Promise<AgentResult> => {
  if (!runtime || runtime.isDestroyed()) return Promise.reject(new Error('插件 Agent 运行时不可用。'))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(invocationId); reject(new Error('插件 Agent 响应超时。')) }, 30_000)
    pending.set(invocationId, { resolve, reject, timer })
    runtime.send('plugins:agent-invoke', { invocationId, pluginId, capabilityId, input })
  })
}

export const resolvePluginAgentInvocation = (invocationId: string, result: AgentResult): void => {
  const invocation = pending.get(invocationId)
  if (!invocation) return
  pending.delete(invocationId)
  clearTimeout(invocation.timer)
  invocation.resolve(result)
}
