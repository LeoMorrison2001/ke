export const pluginPermissions = [
  'user.profile.read',
  'memory.read',
  'memory.write',
  'storage.read',
  'storage.write',
  'agent.request'
] as const

export type PluginPermission = (typeof pluginPermissions)[number]
export type PluginSource = 'builtin' | 'third-party'

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  entryRouteName: string
  uiEntry?: string
  agentCapabilities?: PluginAgentCapability[]
  permissions: PluginPermission[]
  source: PluginSource
}

export interface PluginAgentCapability {
  id: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  permissions: PluginPermission[]
}

const pluginIdPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const permissionSet = new Set<string>(pluginPermissions)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const requireString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`插件 manifest 的 ${fieldName} 必须是非空字符串。`)
  }
  return value.trim()
}

const validateUiEntry = (value: unknown): string => {
  const uiEntry = requireString(value, 'uiEntry')
  if (
    uiEntry.startsWith('/') ||
    uiEntry.includes('\\') ||
    uiEntry.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error('插件 manifest 的 uiEntry 必须是插件目录内的相对路径。')
  }
  return uiEntry
}

const validateAgentCapabilities = (value: unknown): PluginAgentCapability[] | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('插件 manifest 的 agentCapabilities 必须是数组。')
  return value.map((item) => {
    if (!isRecord(item) || !isRecord(item.inputSchema)) throw new Error('插件 Agent 能力声明无效。')
    const permissions = item.permissions
    if (!Array.isArray(permissions) || !permissions.every((permission) => typeof permission === 'string' && permissionSet.has(permission))) {
      throw new Error('插件 Agent 能力请求了不支持的权限。')
    }
    return {
      id: requireString(item.id, 'agentCapabilities.id'),
      name: requireString(item.name, 'agentCapabilities.name'),
      description: requireString(item.description, 'agentCapabilities.description'),
      inputSchema: item.inputSchema,
      permissions: [...new Set(permissions)] as PluginPermission[]
    }
  })
}

export const validatePluginManifest = (value: unknown): PluginManifest => {
  if (!isRecord(value)) throw new Error('插件 manifest 必须是对象。')

  const id = requireString(value.id, 'id')
  if (!pluginIdPattern.test(id)) {
    throw new Error('插件 manifest 的 id 只能包含小写字母、数字、点和连字符。')
  }

  const version = requireString(value.version, 'version')
  if (!versionPattern.test(version)) {
    throw new Error('插件 manifest 的 version 必须是语义化版本，例如 1.0.0。')
  }

  if (!Array.isArray(value.permissions) || !value.permissions.every((item) => typeof item === 'string')) {
    throw new Error('插件 manifest 的 permissions 必须是权限数组。')
  }
  if (!value.permissions.every((permission) => permissionSet.has(permission))) {
    throw new Error('插件 manifest 请求了不支持的权限。')
  }

  const source = value.source
  if (source !== 'builtin' && source !== 'third-party') {
    throw new Error('插件 manifest 的 source 无效。')
  }

  const uiEntry = value.uiEntry === undefined ? undefined : validateUiEntry(value.uiEntry)
  if (source === 'third-party' && !uiEntry) {
    throw new Error('第三方插件 manifest 必须提供 uiEntry。')
  }
  const agentCapabilities = validateAgentCapabilities(value.agentCapabilities)

  return {
    id,
    name: requireString(value.name, 'name'),
    version,
    description: requireString(value.description, 'description'),
    entryRouteName: requireString(value.entryRouteName, 'entryRouteName'),
    uiEntry,
    agentCapabilities,
    permissions: [...new Set(value.permissions)] as PluginPermission[],
    source
  }
}
