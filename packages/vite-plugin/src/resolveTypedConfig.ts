import { none, some, type Option } from '@effect/data/Option'
import { resolveConfig } from 'vite'

import { PLUGIN_NAME } from './constants.js'
import type { TypedVitePlugin } from './vite-plugin.js'

export async function resolveTypedConfig(
  ...args: ArgsOf<typeof resolveConfig>
): Promise<Option<ResolvedOptions>> {
  const config = await resolveConfig(...args)
  const typedPlugin = config.plugins.find((p): p is TypedVitePlugin => p.name === PLUGIN_NAME)

  if (!typedPlugin) {
    return none()
  }

  return some(typedPlugin.resolvedOptions)
}

type ArgsOf<T> = T extends (...args: infer A) => any ? A : never

export interface ResolvedOptions {
  readonly assetDirectory: string
  readonly base: string
  readonly clientOutputDirectory: string
  readonly debug: boolean
  readonly exclusions: readonly string[]
  readonly htmlFiles: readonly string[]
  readonly isStaticBuild: boolean
  readonly saveGeneratedModules: boolean
  readonly serverFilePath: Option<string>
  readonly serverOutputDirectory: string
  readonly sourceDirectory: string
  readonly tsConfig: string
}
