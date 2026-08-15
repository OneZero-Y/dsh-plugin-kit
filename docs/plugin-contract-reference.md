# DSH Standalone Plugin Contract Reference

This is the shared reference the seven `dsh-forge-*` skills point back to. It describes how to build a plugin that lives in its own repository, outside the `deepseek-ai/deepseek-harness` checkout, and gets installed into someone else's profile with `dsh plugin add`.

Every rule below cites the official DSH documentation section it comes from. Where official coverage stops, this document says so instead of inventing a rule — treat an unmarked claim as directly sourced, and a marked one as this kit's own recommendation.

## Two different rulebooks: repository contributor vs. standalone plugin author

`deepseek-ai/deepseek-harness` ships its own `AGENTS.md`, `packages/AGENTS.md`, and `packages/client/AGENTS.md` for people contributing packages *inside* that repository (`packages/<group>/<pkg>/`). Those rules include things like a mandatory `./invariant` export checked by `verify-package-invariants`, a 100%-per-file coverage gate, and a two-aggregate TypeScript project layout — all enforced by scripts that only run inside that monorepo.

None of that applies to you. You are writing a plugin in your own repository that depends on DSH as a published package and gets installed with `dsh plugin add`. The applicable rulebook is the tutorial series at `docs/user/develop/` in the DSH repository ("Your first plugin" → "Build a tool" → "Plugin configuration" → "Package and install a plugin" → "Plugins and lifecycle" → "Services and dependencies" → "Event system" → "Three-role capability design") plus the generated per-version service/event catalog it points to. This kit's skills and template follow that tutorial series, not the internal contributor rules.

## The two build halves

A plugin has a **host half** — an ESM module that runs under Node.js and registers tools, services, or event listeners on a Cordis `Context` — and, optionally, a **client half** — browser code that runs inside the DSH Web GUI and renders UI.

Most plugins only need the host half. Add a client half only when the plugin must draw something in the DSH Web page itself (a settings row, a sidebar panel, a themed color). The host-half rules below are drawn directly from the official standalone-plugin tutorial series and are high-confidence. The client-half section at the end is explicitly lower-confidence: the official docs that describe `ctx.slots`, prop discipline, and plugin package layout (`packages/client/AGENTS.md`) are written for contributing a *built-in* client package to the DSH repository itself, not for a third-party plugin installed from outside. Read that section as "here is what the mechanism appears to be; verify it against a real `dsh web` instance before shipping," not as a proven tutorial.

## Plugin forms (host half)

A host-half plugin is one exported shape. DSH recognizes three:

- **Function form**: named exports `name`, optional `inject`, optional `Config`, and `apply(ctx, config)`. No default export.
- **Object form**: a default export `{ name, inject?, apply(ctx) }`.
- **Class (service) form**: a default-exported subclass of `Service` from `@deepseek-ai/cordis`, calling `super(ctx, '<serviceName>')` in its constructor.

("Your first plugin" → "Three plugin forms.")

Function form is sufficient for most plugins. Use class form specifically when the plugin *provides a service other plugins will consume* ("Your first plugin" → "Next steps" pointing to "Services and dependencies").

**Do not mix a default export with named `name`/`inject`/`apply` exports on the same module.** DSH's real Loader normalizes an imported module through `exports.default ?? exports`; if a `default` export exists, the Loader uses only that value and the named siblings (`inject`, `Config`, `apply`) are discarded from what the Loader sees. A plugin defined this way loads with an empty `inject`, and any service access inside `apply` throws `cannot get property "<name>" without inject` — not a type error, a runtime crash on load. This is not a theoretical rule: it shipped in the official DSH ACP server and crashed every real editor connection despite full unit test coverage, because every test in that suite mounted the plugin by hand (`ctx.plugin({ name, inject, apply })`) instead of through the module's actual export shape. See `docs/postmortem/0001-acp-default-export-drops-inject.md` in the DSH repository for the full account. The practical consequence: **test the plugin through the real Loader unwrap path**, not just a hand-built `ctx.plugin()` call — `dsh-forge-verify` covers this.

This kit's own `template/` was deliberately broken this way and booted against a real DSH profile to confirm the mechanism, not just cite the postmortem secondhand. The failure is worse than "inject is silently empty": Cordis's registry resolves a plugin shape with `typeof plugin === 'function' ? plugin : plugin.apply` (`vendor/cordis/src/registry.ts`) — when a default export exists, that resolved value **is** the function itself, so every sibling named export (`inject`, `Config`, `name`) is invisible to the loader, not just `inject`. Because `Config` is also lost, Cordis never runs the plugin's config through its Standard Schema validator, so schema defaults never get filled in — the plugin receives whatever raw (often `undefined`-shaped) config the loader entry passed, before any of this kit's own default-filling logic runs. On top of that, an ordinary named `function apply(ctx, config) {}` declaration has a `.prototype` property (true of any non-arrow function in JavaScript), which trips Cordis's `isConstructor()` heuristic (`vendor/cordis/src/fiber.ts`) into invoking it with `new apply(ctx, config)` instead of a plain call — visible in a real stack trace as `at new apply (...)`, which looks like a `new` call site that doesn't exist anywhere in the plugin's own source.

The reproduced failure, with `inject: ['tools']` and a stray `export default apply` added to this kit's own template, was:

```
TypeError: Cannot read properties of undefined (reading 'greeting')
    at Fiber.<anonymous> (.../dsh-plugin-kit/template/lib/index.js:41:55)
    ...
    at new apply (.../dsh-plugin-kit/template/lib/index.js:40:6)
```

not a missing-service error — the crash happens reading an unvalidated config field before any injected-service access is reached, because the schema that would have supplied the `'Hello'` default never ran.

## Declaring dependencies with `inject`

If a plugin's `apply` reads a service from `ctx` (`ctx.tools`, `ctx.llm`, `ctx.agents`, or a service another plugin provides), declare it as required in `inject`:

```ts
export const inject = ['tools']

export function apply(ctx) {
  // ctx.tools is guaranteed ready here.
  ctx.tools.register(/* ... */)
}
```

DSH waits until every required service exists before running `apply`. If a required service later disappears (its provider unloads), the dependent plugin unloads automatically and reloads when the service returns — no manual handling needed. ("Your first plugin" → "Declare dependencies"; "Plugins and lifecycle" → "Dependency-driven loading.")

For an *optional* service — one the plugin should use when present but not require — omit it from `inject` and read it explicitly with `ctx.get('serviceName')` at the point of use, rather than accessing `ctx.serviceName` directly. The property-access form (`ctx.<name>`) is topology-sensitive: it walks the Cordis fiber tree from the *caller's* position, and that walk fails in call patterns you may not control (an intermediary service invoked through a proxy, for example) even when the service genuinely exists. `ctx.get(name)` reads a global, topology-independent store instead. This is the same postmortem's second bug, independent of the first. ("Services and dependencies" → "Required and optional dependencies"; `packages/AGENTS.md` → "Optional services use `ctx.get(name)`".)

## Configuration

Export a `Config` TypeScript type and a same-named Schemastery schema (from `@deepseek-ai/schemastery`), with defaults on the schema fields, not scattered through the implementation:

```ts
import Schema from '@deepseek-ai/schemastery'

export interface Config {
  greeting: string
  maxRetries: number
}

export const Config: Schema<Config> = Schema.object({
  greeting: Schema.string().default('Hello'),
  maxRetries: Schema.number().default(3),
})
```

DSH validates configuration against this schema while loading the plugin and fills in defaults; an invalid value fails the load with an actionable error rather than surfacing later as a confusing runtime failure. Do not export a plain JavaScript object as `Config` — it does not implement the Standard Schema interface DSH's Loader expects. ("Plugin configuration" → "Define the Config type," "Schema validation.")

**Anything two deployments might reasonably want to set differently is a configuration field, not a hardcoded constant.** The concrete test the official docs give: could `cordis.yml` change this value without a code edit? If yes, it belongs in `Config`. ("Plugin configuration" → "Design principles" → "Do not hardcode tunable values.")

A configuration edit hot-replaces the plugin (old instance unloaded, new one loaded with the new config). Because registrations are effects that clean themselves up (see below), this replacement does not leak the old instance's registrations. ("Plugin configuration" → "Work with HMR.")

## Lifecycle: every registration is a reversible effect

Anything registered through `ctx` — an event listener (`ctx.on`), a tool (`ctx.tools.register`), an LLM adapter, a timer — is automatically undone when the plugin's fiber unloads. You do not manually call `removeListener` or `clearInterval`.

For a resource that needs its own explicit teardown (a network connection, a subprocess), wrap it in `ctx.effect()` and return the disposer:

```ts
ctx.effect(() => {
  const timer = setInterval(tick, 5000)
  return () => clearInterval(timer)
})
```

("Your first plugin" → "Automatic cleanup"; "Plugins and lifecycle" → "Automatic cleanup.")

The plugin fiber moves through a small state machine: `PENDING` (dependencies not ready) → `LOADING` (`apply` running) → `ACTIVE`, or `FAILED` if `apply` threw; `ACTIVE` → `UNLOADING` → `DISPOSED` on teardown. If a required service disappears mid-run, the plugin cycles `ACTIVE → DISPOSED` and back automatically when the service returns. ("Plugins and lifecycle" → "Fiber state machine," "Dependency-driven loading.")

During unload, disposers begin running in reverse registration order, but multiple async disposers run concurrently with **no serial completion guarantee** between them. If cleanup order matters, put every order-dependent step inside the *same* `ctx.effect()` disposer and await them serially there — do not split ordered cleanup across separate `ctx.effect()` calls and rely on unload ordering. ("Plugins and lifecycle" → "Automatic cleanup.")

## Building a tool

A tool is registered on `ctx.tools` via `defineTool`, which infers and validates its arguments from a declared parameter schema:

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'

ctx.tools.register(defineTool({
  name: 'greet',
  description: 'Greet someone by name.',       // what the model sees
  parameters: {
    name: { type: 'string', required: true, description: 'The name to greet' },
  },
  output: {
    schema: { type: 'string' },
    render: (_args, value) => [{ type: 'text', text: value }],
  },
  async execute(args) {
    return `Hello, ${args.name}!`
  },
}))
```

`execute` returns the canonical value declared by `output.schema`; `output.render` converts that value into the content blocks the model actually sees. Registering the tool requires `inject: ['tools']`; the tool's schema flows into prompt assembly automatically once registered, and disposing the plugin's effect unregisters it. ("Build a tool" → the complete example.)

For anything beyond the minimal shape — background/long-running execution, execution policy hooks (`tools/pre-execute` etc.), UI card presentation (`presentCall`/`presentResult`), Code Mode — the DSH repository's own `docs/cookbook/adding-a-tool.md` is the authoritative reference; it is longer and more detailed than a standalone-plugin kit should duplicate. Read it directly against the DSH version you are targeting.

## The event system

Cordis gives plugins four dispatch modes with different contracts:

| Mode | Awaited | Order | Return value | Use it for |
|---|---|---|---|---|
| `emit` | No | registration order | ignored | broadcast notifications |
| `bail` | No | registration order | first non-`null`/`false`/`undefined` result wins, stops there | first-match short-circuit checks |
| `serial` | Yes | registration order | first non-`null`/`false`/`undefined` result wins, stops there | ordered async setup/validation |
| `waterfall` | No (but chains via `next()`) | registration order | the composed pipeline result | policy/transform pipelines |

A `waterfall` listener **must call `next()`** to delegate to the next listener in the chain; returning without calling it deliberately short-circuits the pipeline. This is by design (it is how a permission gate denies a call), but an *unintentional* missing `next()` silently drops every listener registered after it. ("Event system" → "waterfall — pipeline"; the official docs mark this with an explicit warning callout.)

Type events through TypeScript declaration merging on the `Events` interface so `ctx.on`/`ctx.emit` are inferred correctly rather than left as `any`. ("Event system" → "Typed events.") An event listener registered with `ctx.on()` is itself an effect and is removed automatically on unload — no separate bookkeeping needed. ("Event system" → "Event listeners are effects.")

Durable facts (`turn/*`, `step/*`, `tool/call`, `tool/result`, `compaction/*`) are session-log event *types*, not same-named Cordis events — to observe them, listen to the Cordis event `session/event` and switch on `event.type`, rather than trying to `ctx.on('tool/result', ...)` directly. ("Event system" → "Cordis events and session records.")

## Three-role capability design (when to split into multiple packages)

For a capability general enough to need swappable backends (the official example: Bash execution), DSH's own architecture separates three roles — a **Service Definition** (the Cordis service interface and its request/result types), one or more **Service Providers** (concrete implementations), and one or more **Consumers** (typically a model-facing tool using the service). The Service Definition and Consumer depend on nothing but the Service Definition package; providers depend on the definition but never on each other or on a specific consumer.

**Do not split into three packages preemptively.** The official guidance is explicit: use separate packages only when the roles genuinely need to evolve or be replaced independently. An ordinary single-purpose plugin — most plugins — stays one package with one role. ("Three-role capability design" → "Design points.")

## Packaging: bundle manifest vs. profile manifest

Two different concepts, both expressed through a `package.json`, answering two different questions:

- A **bundle** is an npm package whose manifest declares `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`. It answers "what does installing this package contribute?" — a patch file that inserts or overrides Cordis config rows.
- A **profile** is a directory under `$DSH_HOME/profiles/<name>` describing one runnable composition, with its own manifest declaring `"dsh": { "profile": { "bundles": [...] } }` — the ordered list of bundles it stacks. You never hand-write this file; `dsh plugin` creates and maintains it.

You author and distribute a bundle. A user boots a profile. Nothing is both. ("Package and install a plugin" → "Two concepts, two manifests.")

A package **without** the `dsh.bundle` declaration still installs as an ordinary dependency, but `dsh plugin` prints a warning and activates no config layer for it — use that shape only for a library other plugin packages import, never for something meant to be user-enabled directly. ("Package and install a plugin" → "The bundle manifest.")

The bundle's `cordis.patch.yml` references the plugin by installed package name, not by relative source path, so Node module resolution finds the code once installed:

```yaml
- insert:
    - id: hello
      name: dsh-hello-plugin
```

## Installing and the loading order

```sh
dsh plugin --profile <name> add <spec>
```

forwards to pnpm inside the profile directory — every pnpm install spec form works (a local checkout path, a registry version, a `github:` spec, a `.tgz` tarball). The first install of any package initializes the profile with `@deepseek-ai/dsh-base` as its first bundle automatically.

The effective configuration composes, over an empty root, in this fixed order:

1. Each bundle patch in the profile's `dsh.profile.bundles` list, **in list order** (base first, then each installed bundle in the order it was added).
2. The profile's own `cordis.patch.yml`.
3. The home-level `$DSH_HOME/cordis.patch.yml` (shared across every profile on the machine).
4. Each `--patch <path>` command-line overlay, in argv order.

**A later layer replaces a targeted row's entire `config` value — it does not deep-merge individual keys.** If your bundle's patch overrides a row from an earlier layer by `id`, you must restate every config key that row needs, not just the one you're changing. Conversely, a user can override your plugin's row in their own profile's `cordis.patch.yml` without touching your package at all — so prefer schema defaults a typical user is likely to keep, and let the override mechanism carry the rest. ("Package and install a plugin" → "The loading order.")

Verify the composed result before trusting an install:

```sh
dsh --profile <name> --dump-config
```

This prints the actual assembled row tree, including a layer-source comment for your bundle — inspect it rather than assuming installation succeeded because the command didn't error. `dsh-forge-wire` covers this in detail.

## Distribution: the three channels and the build-script trap

Three ways to get a bundle into someone's profile, in order of friction:

1. **A git spec** (`dsh plugin add github:you/name`): fetches source only. If your package is TypeScript, nothing builds it — a `prepare` script must produce `lib/` from `src/` after install, self-contained (no assumption of a sibling monorepo checkout or dev-only tooling context). Even with a correct `prepare` script, **pnpm 10+ refuses to run a git dependency's `prepare` script until the consumer explicitly allows it** — the first `dsh plugin add` from a fresh profile fails, and the error names the exact package key to add under `allowBuilds` in that profile's `pnpm-workspace.yaml`. The user copies that key, re-runs the same `add` command, and it succeeds. **This is the single most common reason a plugin "looks broken" on first install and it is not a bug in the plugin** — it's pnpm's supply-chain safety gate working as intended. Document it in your README so the failure isn't mistaken for a broken package. Authorizing that build is explicit permission to run this repository's code on the user's machine, outside any agent sandbox — pin a commit (`#<sha>`), not a branch, so a future push cannot silently change what already-installed users run next. ("Package and install a plugin" → "Installing from GitHub: the build-script catch.")
2. **A tarball** (`pnpm pack` → `dsh plugin add ./name-0.1.0.tgz`): ships pre-built files, no `prepare` step or `allowBuilds` prompt.
3. **An npm registry package** (`dsh plugin add your-package`): built at `pnpm publish` time, same no-build-on-install property as a tarball.

Choosing (2) or (3) as your primary distribution path avoids the `allowBuilds` friction entirely; choosing (1) means you own documenting it clearly. `dsh-forge-ship` walks through preparing whichever channel you pick.

## The client half (lower confidence — verify before shipping)

Read this section knowing that no official tutorial walks a third-party author through building a DSH Web client plugin from scratch. What follows is inferred from `packages/client/AGENTS.md` in the DSH repository, which documents contributing a *built-in* client package to that repository — two of its three "registration surfaces" are edits to files inside the DSH repository itself (`tsconfig.client.json`, the official web-app bundle's own `cordis.patch.yml` and `package.json`), which do not apply to a package living outside that repository. Treat the mechanism described below as a starting hypothesis to validate against a real `dsh web` instance running the version you target, not as a proven recipe.

The parts of that document that read as general API contract rather than repository-internal wiring:

- **One composition API, no exceptions**: a client plugin contributes UI only through `ctx.slots.register({ name, children?, store?, inject? }, Component)`. There is no other sanctioned way to add UI.
- **Declared children are the only slots you may render into.** Attempting to render an undeclared slot, or declaring one another plugin already declared, fails at load.
- **Components never touch `ctx` directly.** All data a component needs arrives through props derived from four sources: owner-supplied render-site data, declared child-slot keys, a declared store, and the `inject` face — never a hand-rolled hook reaching back into `ctx`.
- **A UI plugin's public export surface is minimal**: effectively just what Cordis loading needs (`apply`/`inject`/`Config`) plus store factories consumed type-only. Internal components, helpers, and store instances are not meant to be imported by other packages.

A client-half plugin package declares a `dsh.client` field in `package.json` (informational metadata used for preflight display and HMR diffing — it does not itself sequence load order the way `inject` does for Cordis services) and ships a browser entry conventionally exported as `./client`. Confirm the exact current shape — field names, required build tooling, bundling expectations — against the DSH version you're targeting before relying on it; this kit does not template a client half by default for that reason.

## Sources

Everything above traces to files in a `deepseek-ai/deepseek-harness` checkout: `docs/user/develop/basic/{index,tool,config,publish}.md`, `docs/user/develop/framework/{index,service,events}.md`, `docs/user/develop/practice/index.md`, `docs/postmortem/0001-acp-default-export-drops-inject.md`, `packages/AGENTS.md`, and — flagged above as lower-confidence — `packages/client/AGENTS.md`. Re-check against your target DSH version's copies of these files; DSH is explicitly a developer preview with compatibility-breaking changes expected.
