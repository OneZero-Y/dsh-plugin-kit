# Optional: a browser (DSH Web GUI) half

Read "The client half" in `dsh-plugin-kit`'s `docs/plugin-contract-reference.md` before starting this. Short version: no official DSH tutorial walks a third-party author through building a Web client plugin from an outside repository. What's below combines that inferred contract with mechanics confirmed by actually shipping a client half against a real `dsh web` instance (bundling, the `ctx.theme`/`ctx.settingsScope` service pattern, and testing) — but the exact current API surface (`ctx.slots`, prop shapes, `dsh.client` manifest fields) is still more likely to have shifted between DSH versions than the host-half contract this kit's `template/` otherwise covers with confidence. Validate against the DSH version you target before relying on any of it.

This file is guidance with representative code fragments, not a directory to copy wholesale — there is no `template/client/` skeleton, because the client half's shape varies more with what UI a specific plugin actually renders than the host half's does.

## What to check before writing any client code

1. **Does `dsh.client` still work the way described here?** Open a current `deepseek-ai/deepseek-harness` checkout and read `packages/client/AGENTS.md` directly — do not rely on a summary from an older kit or plugin. Confirm the manifest field name, whether a separate build step or bundler config is expected, and what the conventional export path (`./client` in prior versions) actually is now.
2. **Is `ctx.slots.register` still the sole composition API?** As of the version this kit's contract reference was written against, a client plugin contributes UI only by registering into a named slot with a `{ name, children?, store?, inject? }` descriptor — there was no other sanctioned route, and rendering an undeclared slot failed at load. Confirm this is still current before designing around it.
3. **Do components still avoid touching `ctx` directly?** The pattern described treats `ctx` as apply-time-only; components receive everything through props derived from four sources (owner-supplied render-site data, declared child-slot keys, a declared store, and the `inject` face). If this has changed, your implementation approach changes with it.

## Two build targets, not one: host and client

A client-half package builds two separate outputs from the same `src/`: a host ESM library (`lib/index.js`, unchanged from a host-only plugin) and a browser CJS bundle (`lib/client.js`) wrapped in the loader contract the DSH Web GUI's module loader expects. Confirmed against a real installed package's compiled output (`@deepseek-ai/dsh-client-ui-theme`'s own `lib/client.js`), the client bundle's shape is:

```js
window.__ModuleLoader__.load({
  id: '<your-package-name>',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    // ...bundled code, using `require(...)` for externals...
    return module.exports
  },
})
```

A `tsdown.config.ts` producing both targets looks like this — note the two separate config objects exported as an array, one per target:

```ts
import type { UserConfig } from 'tsdown'

const PLUGIN_ID = '@your-scope/your-plugin'

/**
 * Specifiers this client bundle resolves through the host's frozen loader
 * module table (`require(...)` inside the wrapped factory) rather than
 * inlining. See "Never guess your externals list" below for how to derive
 * this list instead of assuming it.
 */
const CLIENT_EXTERNALS: readonly string[] = ['react/jsx-runtime']

const hostLibrary: UserConfig = {
  name: PLUGIN_ID,
  entry: { index: 'lib/types/index.js' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}

const clientBundle: UserConfig = {
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'lib/types/client/index.js' },
  outDir: 'lib',
  // CJS is required, not a legacy leftover: the loader wraps the bundle in
  // `factory: (require) => { ... return module.exports }`, which only makes
  // sense against CJS-shaped require/module.exports semantics.
  format: 'cjs',
  // tsdown's CJS output always forces the `node` platform internally
  // regardless of what's set here (a documented tsdown limitation) — kept
  // for intent/documentation, and in case a future tsdown version honors it.
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  // tsdown's own "prefer ESM" warning doesn't apply to a bundle
  // synthesizing a specific runtime-loader shape; suppress it rather than
  // "fixing" it by switching format (which would break the wrapper).
  suppressWarnings: ['We recommend using the ESM format instead of CommonJS'],
  deps: {
    neverBundle: [...CLIENT_EXTERNALS],
    alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [hostLibrary, clientBundle]
```

`package.json` needs the matching `exports`/`files`/`dsh.client` entries:

```json
{
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "files": ["lib/index.js", "lib/client.js", "lib/types/**/*.d.ts", "cordis.patch.yml"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web" }
  }
}
```

## Never guess your externals list

Leaving `CLIENT_EXTERNALS` empty (or wrong) is not a "warnings-only" mistake — it silently bundles a *second copy* of anything you value-import from an `@deepseek-ai/dsh-client-*` package or from `react`, instead of sharing the host page's single instance through its module table. For React this risks duplicate-instance bugs; for a service module like `dsh-client-runtime/client`'s `defineStore`, it means your bundled copy doesn't share the module-scoped state the real one relies on.

Do not guess this list from documentation. Instead, read the **already-compiled** `lib/client.js` of any installed `@deepseek-ai/dsh-client-*` package your client half depends on, and copy the exact specifiers it passes to `require(...)` near the top of the factory body — those are, by construction, the specifiers the real host loader's module table can answer, because that package ships as an official client plugin too. For example, a plugin that renders JSX (via the automatic transform, `"jsx": "react-jsx"` in `tsconfig.json`) and calls `defineStore` needs at minimum:

```ts
const CLIENT_EXTERNALS: readonly string[] = [
  'react/jsx-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
]
```

Re-derive this list whenever you add a new value import from any `@deepseek-ai/dsh-client-*` package — don't assume a list written for one plugin's dependency set transfers unchanged to another's.

## Client-owned durable preferences aren't `Config`

A client-half plugin's user-visible preference (a theme choice, a toggle the settings UI exposes) is a *different concept* from the host-half `Config` schema described in "Configuration" above, and needs a different mechanism — see "Client-owned user preferences vs. `Config`" in `docs/plugin-contract-reference.md` for the full contract. In short: even a plugin with no deployment-time `Config` at all still needs a minimal host half if it wants a preference to survive a reload, because only the host side can register a durable settings section:

```ts
// src/index.ts (host half) — no Config export needed for this alone.
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { Context } from '@deepseek-ai/cordis'

export const name = 'your-plugin'
export const inject: string[] = [] // settings stays optional — see below

export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace('your-plugin-preferences'), YourPreferencesSchema)
  })
}
```

The client half then binds that namespace through `ctx.settingsScope.bind({ namespace })` (from `@deepseek-ai/dsh-client-ui-settings`'s client half), never through the host `Config` path.

**This only actually persists on `@deepseek-ai/dsh-client-ui-theme` `0.1.0-rc.7` or later.** Confirmed by shipping a real plugin against both versions: on `rc.6` and earlier, the official Host's `packages/host/apiproxy` gated every registered settings namespace behind a hardcoded allowlist a third-party repository could never join, so the namespace above registers correctly, `scope.set(...)` resolves without throwing, and the value still silently fails to survive a page reload — there is no error anywhere in this path telling you it didn't work. This was fixed upstream (`2026-08-12-plugin-owned-settings-surface`, "Registering is exposing") starting at `rc.7`. Do not trust a non-throwing `set()` call as proof this works — write a value, reload the browser, and confirm it's still there, against the actual DSH version you're targeting.

## If the slot mechanism still matches

Add a browser entry (conventionally `src/client/index.ts`, exported as `./client` from `package.json`), export a minimal plugin shape from it (`{ name, inject, apply(ctx) }` mounting whatever slot registration the capability needs), and keep the same lifecycle discipline as the host half: every registration is a `ctx.slots.register(...)` / `ctx.theme.register(...)` / `ctx.effect(...)` call whose removal you can verify, not a side effect that runs once and hopes.

## Verification

`dsh-forge-verify`'s "Testing a client half" section covers this in detail now (hand-mounting with faked services, why importing a real `@deepseek-ai/dsh-client-*/client` subpath under plain Node throws, and the official `@deepseek-ai/dsh-client-test-runtime` package). At minimum, beyond automated tests: manually load the plugin into a real `dsh web` instance and confirm the UI renders, updates, and cleanly disappears when the plugin is removed from the profile — automated hand-mounted tests prove your own glue code behaves, not that DSH's real Loader and renderer actually activate it end to end. If the plugin persists a preference through `ctx.settingsScope`, this manual check is where the "Client-owned durable preferences aren't `Config`" caveat above would actually surface — a version mismatch produces no error at any layer, only a value that quietly doesn't survive a reload.
