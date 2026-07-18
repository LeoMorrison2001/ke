import { randomUUID } from 'node:crypto'
import { getDatabase } from '../database'
import { streamDialogue } from '../ai/dialogue-service'
import { listConversationMemorySummaries, saveUserMessage } from '../modules/chat/conversation-repository'
import { getActiveUser, requireActiveUser } from '../modules/users/user-repository'
import { listInstalledPlugins } from './plugin-installation-service'
import type { PluginPermission } from '../../shared/plugins/plugin-manifest'

export type PluginBridgeRequest =
  | { operation: 'storage.get'; key: string }
  | { operation: 'storage.set'; key: string; value: unknown }
  | { operation: 'storage.delete'; key: string }
  | { operation: 'user.get-profile' }
  | { operation: 'memory.list-conversations' }
  | { operation: 'agent.request'; prompt: string }

const requirePluginPermission = (pluginId: string, permission: PluginPermission): void => {
  const plugin = listInstalledPlugins().find((item) => item.manifest.id === pluginId)
  if (!plugin?.enabled) throw new Error('应用不存在或未启动。')
  if (!plugin.manifest.permissions.includes(permission)) throw new Error('应用未声明该权限。')
}

const validateKey = (key: string): string => {
  if (typeof key !== 'string' || key.length < 1 || key.length > 128) throw new Error('存储键无效。')
  return key
}

export const listGrantedPluginPermissions = (pluginId: string): PluginPermission[] => {
  const user = getActiveUser()
  if (!user) return []
  return (getDatabase()
    .prepare('SELECT permission FROM plugin_permission_grants WHERE plugin_id = ? AND user_id = ?')
    .all(pluginId, user.id) as Array<{ permission: PluginPermission }>).map((row) => row.permission)
}

export const setPluginPermission = (
  pluginId: string,
  permission: PluginPermission,
  granted: boolean
): PluginPermission[] => {
  const plugin = listInstalledPlugins().find((item) => item.manifest.id === pluginId)
  if (!plugin) throw new Error('未找到已安装应用。')
  if (!plugin.manifest.permissions.includes(permission)) throw new Error('应用未声明该权限。')
  const user = requireActiveUser()
  const database = getDatabase()
  if (granted) {
    database
      .prepare(
        `INSERT OR REPLACE INTO plugin_permission_grants (plugin_id, user_id, permission, granted_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(pluginId, user.id, permission, Date.now())
  } else {
    database
      .prepare('DELETE FROM plugin_permission_grants WHERE plugin_id = ? AND user_id = ? AND permission = ?')
      .run(pluginId, user.id, permission)
  }
  return listGrantedPluginPermissions(pluginId)
}

export const executePluginBridgeRequest = async (
  pluginId: string,
  request: PluginBridgeRequest
): Promise<unknown> => {
  if (request.operation === 'storage.get') {
    requirePluginPermission(pluginId, 'storage.read')
    const row = getDatabase()
      .prepare('SELECT value_json FROM plugin_storage WHERE plugin_id = ? AND user_id = ? AND storage_key = ?')
      .get(pluginId, requireActiveUser().id, validateKey(request.key)) as { value_json: string } | undefined
    return row ? JSON.parse(row.value_json) : undefined
  }
  if (request.operation === 'storage.set') {
    requirePluginPermission(pluginId, 'storage.write')
    const valueJson = JSON.stringify(request.value)
    if (valueJson === undefined || valueJson.length > 100_000) throw new Error('存储值无效或过大。')
    getDatabase()
      .prepare(
        `INSERT OR REPLACE INTO plugin_storage (plugin_id, user_id, storage_key, value_json, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(pluginId, requireActiveUser().id, validateKey(request.key), valueJson, Date.now())
    return true
  }
  if (request.operation === 'storage.delete') {
    requirePluginPermission(pluginId, 'storage.write')
    getDatabase()
      .prepare('DELETE FROM plugin_storage WHERE plugin_id = ? AND user_id = ? AND storage_key = ?')
      .run(pluginId, requireActiveUser().id, validateKey(request.key))
    return true
  }
  if (request.operation === 'user.get-profile') {
    requirePluginPermission(pluginId, 'user.profile.read')
    const user = requireActiveUser()
    return { name: user.name, preferredName: user.preferredName, gender: user.gender, birthDate: user.birthDate }
  }
  if (request.operation === 'memory.list-conversations') {
    requirePluginPermission(pluginId, 'memory.read')
    return listConversationMemorySummaries()
  }
  if (request.operation === 'agent.request') {
    requirePluginPermission(pluginId, 'agent.request')
    if (typeof request.prompt !== 'string' || request.prompt.trim().length === 0 || request.prompt.length > 4000) {
      throw new Error('主 Agent 请求内容无效。')
    }
    const user = requireActiveUser()
    const conversationId = randomUUID()
    saveUserMessage(conversationId, `[应用 ${pluginId}] ${request.prompt.trim()}`)
    const result = await streamDialogue(conversationId, user, { onActivity: () => undefined, onDelta: () => undefined })
    return { conversationId, reply: result.assistantMessage.content }
  }
  throw new Error('不支持的应用请求。')
}
