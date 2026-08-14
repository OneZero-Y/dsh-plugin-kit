/**
 * Plugin behavior. Implement the actual capability here.
 *
 * Every registration made through `ctx` — `ctx.on(...)`, `ctx.tools.register(...)`,
 * an adapter registration — is a self-cleaning effect: it is automatically
 * undone when this plugin's fiber unloads. For a resource that needs its own
 * explicit teardown (a timer, a subprocess, a network connection), wrap
 * creation and cleanup together in one `ctx.effect()` call so ordering stays
 * predictable — see "Lifecycle: every registration is a reversible effect"
 * in dsh-plugin-kit's docs/plugin-contract-reference.md.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Config } from './config.ts'

/**
 * Runs once this plugin's declared dependencies (see `inject` in index.ts)
 * are ready. Replace this body with the plugin's actual behavior.
 * @param ctx - The Cordis context this plugin was loaded into.
 * @param config - Validated configuration, matching the `Config` schema.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.effect(() => {
    // eslint-disable-next-line no-console -- replace with real behavior
    console.log(`[dsh-plugin-template] loaded: ${config.greeting}`)
    return () => {
      // Runs when the plugin unloads. This line exists so
      // tests/runtime.spec.ts can prove disposal actually ran, not just that
      // fiber.dispose() resolved without throwing. Replace it with real
      // teardown (or delete the whole ctx.effect() wrapper) once this
      // plugin registers something that needs explicit cleanup — ctx.on()
      // and ctx.tools.register() already clean themselves up and never
      // need this pattern.
      // eslint-disable-next-line no-console -- replace with real behavior
      console.log('[dsh-plugin-template] unloaded')
    }
  })
}
