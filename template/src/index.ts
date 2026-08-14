/**
 * Loader-facing entry point for @your-scope/dsh-plugin-template.
 *
 * This is function-form: named exports `name`, `inject`, `Config`, and
 * `apply`, with NO default export. Do not add one — a default export on a
 * module that also has these named exports causes DSH's real Loader to
 * discard `inject`/`Config`/`apply` entirely (it resolves the module through
 * `exports.default ?? exports`), and the plugin loads with no injected
 * services. This exact mistake shipped in DSH's own ACP server; see "Plugin
 * forms" in dsh-plugin-kit's docs/plugin-contract-reference.md for the full
 * account and why `dsh-forge-verify`'s Loader-shape test exists.
 *
 * If this plugin should instead be consumed as a *service* by other plugins,
 * use class (service) form instead — see the contract reference — and do
 * not mix the two forms.
 * @module @your-scope/dsh-plugin-template
 */

export { Config } from './config.ts'
export { apply } from './runtime.ts'

/** Stable Cordis plugin id. Keep this unchanged after the plugin is published. */
export const name = 'dsh-plugin-template'

/**
 * Required Cordis services. DSH waits for every service listed here before
 * running `apply`. List a service here only if `apply` cannot function
 * without it — an optional service is read with `ctx.get('name')` at its
 * point of use instead, never listed here.
 */
export const inject: string[] = []
