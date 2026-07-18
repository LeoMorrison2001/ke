import type { Component } from 'vue'
import type { PluginManifest } from '../../../shared/plugins/plugin-manifest'

export interface RendererPlugin extends PluginManifest {
  icon: Component
  accentColor: string
  enabled: boolean
}
