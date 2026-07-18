import type { AgentDefinition } from '../contracts/agent-contracts'
import { diaryAgent } from '../agents/diary/diary-agent'

const agents = new Map<string, AgentDefinition>([[diaryAgent.id, diaryAgent]])

export const getAgent = (agentId: string): AgentDefinition => {
  const agent = agents.get(agentId)
  if (!agent) throw new Error(`未找到 Agent：${agentId}`)
  return agent
}
