import { BookOpenText, Puzzle } from 'lucide-vue-next'
import { builtinPluginManifests } from '../../../shared/plugins/builtin-plugin-manifests'
import type { RendererPlugin } from './plugin-contracts'

const pluginPresentation = {
  'xiaoke-diary': {
    icon: BookOpenText,
    accentColor: '#b97842'
  }
} as const

export const getEnabledRendererPlugins = (
  installedPlugins: InstalledPlugin[]
): RendererPlugin[] => {
  return installedPlugins.flatMap((plugin) => {
    if (!plugin.enabled) return []
    if (plugin.manifest.source === 'third-party') {
      if (!plugin.manifest.uiEntry) return []
      return [{ ...plugin.manifest, icon: Puzzle, accentColor: '#527a9b', enabled: true }]
    }

    const manifest = builtinPluginManifests.find((item) => item.id === plugin.manifest.id)
    if (!manifest) return []

    const presentation = pluginPresentation[manifest.id as keyof typeof pluginPresentation]
    if (!presentation) return []

    return [{ ...manifest, ...presentation, enabled: true }]
  })
}
