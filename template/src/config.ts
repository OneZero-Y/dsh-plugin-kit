/**
 * Configuration schema and defaults.
 *
 * Per "Configuration" in dsh-plugin-kit's docs/plugin-contract-reference.md:
 * anything two different deployments of this plugin might reasonably want to
 * set differently belongs here as a validated field, not as a hardcoded
 * constant inside runtime.ts. The concrete test: could a user's cordis.yml
 * or cordis.patch.yml change this value without a code edit? If yes, it's a
 * Config field.
 */

import Schema from '@deepseek-ai/schemastery'

export interface Config {
  /** Replace with this plugin's actual configuration fields. */
  greeting: string
}

/**
 * The exported schema DSH validates configuration against while loading the
 * plugin. Defaults live on the schema fields, not scattered through
 * implementation code. An invalid value fails the load with an actionable
 * error rather than surfacing later as a confusing runtime failure.
 */
export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
})
