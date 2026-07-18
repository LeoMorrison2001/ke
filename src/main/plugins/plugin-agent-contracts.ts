import type { ToolSet } from 'ai'
import type { AgentDefinition, AgentResult, AgentTask } from '../ai/contracts/agent-contracts'
import type { PluginManifest } from '../../shared/plugins/plugin-manifest'

export interface PluginAgentExecutionInput {
  agentId: string
  operation: string
  context: Record<string, unknown>
  permissions: AgentTask['permissions']
}

export interface PluginAgentToolContext {
  executeAgent: (input: PluginAgentExecutionInput) => Promise<AgentResult>
}

export interface PluginAgentRegistration {
  manifest: PluginManifest
  agent: AgentDefinition
  createTools: (context: PluginAgentToolContext) => ToolSet
}
