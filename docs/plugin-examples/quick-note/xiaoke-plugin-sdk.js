export class XiaokePlugin {
  constructor() { this.pending = new Map(); window.addEventListener('message', (event) => this.handleMessage(event)) }
  request(request) { const requestId = crypto.randomUUID(); window.parent.postMessage({ type: 'ke-plugin:request', requestId, request }, '*'); return new Promise((resolve, reject) => this.pending.set(requestId, { resolve, reject })) }
  storage = { get: (key) => this.request({ operation: 'storage.get', key }), set: (key, value) => this.request({ operation: 'storage.set', key, value }), delete: (key) => this.request({ operation: 'storage.delete', key }) }
  getUserProfile = () => this.request({ operation: 'user.get-profile' })
  getConversationMemory = () => this.request({ operation: 'memory.list-conversations' })
  askAgent = (prompt) => this.request({ operation: 'agent.request', prompt })
  handleMessage(event) { const message = event.data; if (!message || typeof message !== 'object') return; if (message.type === 'ke-plugin:response') { const pending = this.pending.get(message.requestId); if (!pending) return; this.pending.delete(message.requestId); message.ok ? pending.resolve(message.value) : pending.reject(new Error(message.error || '平台请求失败。')); return } if (message.type === 'ke-plugin:agent-invoke') this.handleAgentInvocation(message) }
  async handleAgentInvocation(message) { try { const result = await this.onAgentInvoke?.(message.capabilityId, message.input); window.parent.postMessage({ type: 'ke-plugin:agent-result', invocationId: message.invocationId, result }, '*') } catch (error) { window.parent.postMessage({ type: 'ke-plugin:agent-result', invocationId: message.invocationId, result: { status: 'failed', replyHint: error instanceof Error ? error.message : '插件 Agent 执行失败。' } }, '*') } }
}
