import type { PluginManifest } from './plugin-manifest'

export const builtinPluginManifests: readonly PluginManifest[] = [
  {
    id: 'xiaoke-diary',
    name: '小可日记',
    version: '1.0.0',
    description: '记录和回顾每天的生活。',
    entryRouteName: 'xiaoke-diary',
    permissions: ['storage.read', 'storage.write'],
    source: 'builtin'
  }
]

export const getBuiltinPluginManifest = (pluginId: string): PluginManifest => {
  const manifest = builtinPluginManifests.find((item) => item.id === pluginId)
  if (!manifest) throw new Error(`未找到内置插件 manifest：${pluginId}`)
  return manifest
}
