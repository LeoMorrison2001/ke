import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { app } from 'electron'
import { getDatabase } from '../database'
import { builtinPluginManifests } from '../../shared/plugins/builtin-plugin-manifests'
import { validatePluginManifest, type PluginManifest } from '../../shared/plugins/plugin-manifest'

const PLUGINS_DIRECTORY_NAME = 'plugins'
const PLUGIN_MANIFEST_FILE_NAME = 'manifest.json'
const PLUGIN_STATE_FILE_NAME = 'plugins-state.json'

interface PluginState {
  enabledPluginIds?: string[]
}

export interface InstalledPlugin {
  manifest: PluginManifest
  enabled: boolean
}

interface DiscoveredThirdPartyPlugin {
  manifest: PluginManifest
  installDirectory: string
}

const getPluginsDirectory = (): string => join(app.getPath('userData'), PLUGINS_DIRECTORY_NAME)

const getPluginStatePath = (): string => join(app.getPath('userData'), PLUGIN_STATE_FILE_NAME)

const getEnabledPluginIds = (): Set<string> => {
  const statePath = getPluginStatePath()
  if (!existsSync(statePath)) return new Set(builtinPluginManifests.map((plugin) => plugin.id))

  try {
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as PluginState
    if (!Array.isArray(state.enabledPluginIds)) return new Set()
    return new Set(state.enabledPluginIds.filter((pluginId) => typeof pluginId === 'string'))
  } catch {
    return new Set()
  }
}

const saveEnabledPluginIds = (pluginIds: Set<string>): void => {
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(
    getPluginStatePath(),
    JSON.stringify({ enabledPluginIds: [...pluginIds].sort() }, null, 2),
    'utf8'
  )
}

const listThirdPartyPlugins = (): DiscoveredThirdPartyPlugin[] => {
  const pluginsDirectory = getPluginsDirectory()
  mkdirSync(pluginsDirectory, { recursive: true })

  return readdirSync(pluginsDirectory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return []

    const installDirectory = join(pluginsDirectory, entry.name)
    const manifestPath = join(installDirectory, PLUGIN_MANIFEST_FILE_NAME)
    if (!existsSync(manifestPath)) return []

    try {
      const manifest = validatePluginManifest(JSON.parse(readFileSync(manifestPath, 'utf8')))
      if (manifest.source !== 'third-party') return []
      return [{ manifest, installDirectory }]
    } catch {
      // An invalid third-party package is ignored until it is repaired or removed.
      return []
    }
  })
}

const readThirdPartyManifest = (directory: string): PluginManifest => {
  const manifestPath = join(directory, PLUGIN_MANIFEST_FILE_NAME)
  if (!existsSync(manifestPath)) throw new Error('应用目录中缺少 manifest.json。')
  const manifest = validatePluginManifest(JSON.parse(readFileSync(manifestPath, 'utf8')))
  if (manifest.source !== 'third-party') throw new Error('导入的应用必须声明为 third-party。')
  return manifest
}

const ensureNoSymbolicLinks = (directory: string): void => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (lstatSync(entryPath).isSymbolicLink()) throw new Error('应用包不能包含符号链接。')
    if (entry.isDirectory()) ensureNoSymbolicLinks(entryPath)
  }
}

export const listInstalledPlugins = (): InstalledPlugin[] => {
  const enabledPluginIds = getEnabledPluginIds()
  const installedPlugins: InstalledPlugin[] = builtinPluginManifests.map((manifest) => ({
    manifest,
    enabled: enabledPluginIds.has(manifest.id)
  }))
  const knownPluginIds = new Set(installedPlugins.map((plugin) => plugin.manifest.id))

  for (const plugin of listThirdPartyPlugins()) {
    if (knownPluginIds.has(plugin.manifest.id)) continue
    knownPluginIds.add(plugin.manifest.id)
    installedPlugins.push({
      manifest: plugin.manifest,
      enabled: enabledPluginIds.has(plugin.manifest.id)
    })
  }

  return installedPlugins
}

export const getEnabledThirdPartyPluginDirectory = (pluginId: string): string | undefined => {
  const enabledPluginIds = getEnabledPluginIds()
  if (!enabledPluginIds.has(pluginId)) return undefined

  return listThirdPartyPlugins().find((plugin) => plugin.manifest.id === pluginId)?.installDirectory
}

export const installPluginFromDirectory = (sourceDirectory: string): InstalledPlugin => {
  if (!isAbsolute(sourceDirectory)) throw new Error('应用目录必须使用绝对路径。')
  const source = resolve(sourceDirectory)
  if (!existsSync(source) || !lstatSync(source).isDirectory()) throw new Error('应用目录不存在。')
  ensureNoSymbolicLinks(source)
  const manifest = readThirdPartyManifest(source)
  if (listInstalledPlugins().some((plugin) => plugin.manifest.id === manifest.id)) {
    throw new Error('同 ID 的应用已安装，请先卸载旧版本。')
  }

  const destination = join(getPluginsDirectory(), manifest.id)
  mkdirSync(getPluginsDirectory(), { recursive: true })
  cpSync(source, destination, { recursive: true, errorOnExist: true, force: false })
  return { manifest, enabled: false }
}

export const uninstallPlugin = (pluginId: string): void => {
  const plugin = listThirdPartyPlugins().find((item) => item.manifest.id === pluginId)
  if (!plugin) throw new Error('只能卸载已安装的第三方应用。')
  rmSync(plugin.installDirectory, { recursive: true, force: false })
  const database = getDatabase()
  database.prepare('DELETE FROM plugin_storage WHERE plugin_id = ?').run(pluginId)
  database.prepare('DELETE FROM plugin_permission_grants WHERE plugin_id = ?').run(pluginId)
  const enabledPluginIds = getEnabledPluginIds()
  enabledPluginIds.delete(pluginId)
  saveEnabledPluginIds(enabledPluginIds)
}

export const setPluginEnabled = (pluginId: string, enabled: boolean): InstalledPlugin => {
  if (typeof enabled !== 'boolean') throw new Error('应用启动状态无效。')

  const plugin = listInstalledPlugins().find((item) => item.manifest.id === pluginId)
  if (!plugin) throw new Error('未找到已安装应用。')

  const enabledPluginIds = getEnabledPluginIds()
  if (enabled) {
    enabledPluginIds.add(pluginId)
  } else {
    enabledPluginIds.delete(pluginId)
  }
  saveEnabledPluginIds(enabledPluginIds)
  return { ...plugin, enabled }
}
