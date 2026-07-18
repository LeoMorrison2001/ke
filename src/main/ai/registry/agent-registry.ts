import { jsonSchema, tool, type ToolSet } from 'ai'
import type { AgentDefinition } from '../contracts/agent-contracts'
import { diaryPlugin } from '../../plugins/builtin/diary/diary-plugin'
import type { PluginAgentToolContext } from '../../plugins/plugin-agent-contracts'
import { listInstalledPlugins } from '../../plugins/plugin-installation-service'
import { invokePluginAgent } from '../../plugins/plugin-agent-runtime-service'

const plugins = [diaryPlugin] as const

const getEnabledPlugins = () => {
  const enabledPluginIds = new Set(
    listInstalledPlugins()
      .filter((plugin) => plugin.enabled)
      .map((plugin) => plugin.manifest.id)
  )
  return plugins.filter((plugin) => enabledPluginIds.has(plugin.manifest.id))
}

const getThirdPartyAgents = (): AgentDefinition[] =>
  listInstalledPlugins()
    .filter((plugin) => plugin.enabled && plugin.manifest.source === 'third-party')
    .flatMap((plugin) => {
      const capabilities = plugin.manifest.agentCapabilities ?? []
      if (capabilities.length === 0) return []
      return [{
        id: `plugin:${plugin.manifest.id}`,
        supportedOperations: capabilities.map((capability) => capability.id),
        execute: async (task) => invokePluginAgent(task.taskRunId, plugin.manifest.id, task.operation, task.context)
      }]
    })

export const getAgent = (agentId: string): AgentDefinition => {
  const agent = [...getEnabledPlugins().map((plugin) => plugin.agent), ...getThirdPartyAgents()].find((item) => item.id === agentId)
  if (!agent) throw new Error(`未找到 Agent：${agentId}`)
  return agent
}

export const createPluginAgentTools = (context: PluginAgentToolContext): ToolSet => {
  const builtinTools = getEnabledPlugins().map((plugin) => plugin.createTools(context))
  const thirdPartyTools = listInstalledPlugins()
    .filter((plugin) => plugin.enabled && plugin.manifest.source === 'third-party')
    .flatMap((plugin) => (plugin.manifest.agentCapabilities ?? []).map((capability) => ({ plugin, capability })))
    .reduce<ToolSet>((tools, { plugin, capability }) => {
      const toolName = `plugin_${plugin.manifest.id}_${capability.id}`.replace(/[^a-zA-Z0-9_]/g, '_')
      tools[toolName] = tool({
        description: `${plugin.manifest.name}：${capability.description}`,
        inputSchema: jsonSchema(capability.inputSchema),
        execute: async (input) => context.executeAgent({
          agentId: `plugin:${plugin.manifest.id}`,
          operation: capability.id,
          context: input as Record<string, unknown>,
          permissions: ['read', 'execute']
        })
      })
      return tools
    }, {})
  return Object.assign({}, ...builtinTools, thirdPartyTools) as ToolSet
}
