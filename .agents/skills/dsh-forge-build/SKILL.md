---
name: dsh-forge-build
description: Use when implementing behavior inside a scaffolded standalone DSH plugin — tools, event listeners, services, or configuration-driven logic. Covers defineTool usage, the four Cordis event dispatch modes, effect-based lifecycle ownership, and the optional-service ctx.get rule.
---

# Implement a Standalone DSH Plugin's Behavior

This skill covers writing the actual `apply()` body and supporting code once `dsh-forge-init` has produced a working, empty skeleton. It implements the `dsh-forge-design` decision record; it does not re-decide plugin form or dependencies — return to `dsh-forge-design` if implementation reveals the earlier decision was wrong, rather than quietly working around it here.

Every rule below is explained in more depth in `docs/plugin-contract-reference.md`; this skill is the applied checklist.

## Keep the Loader-facing surface stable

`src/index.ts` should end up exporting exactly the form decided in `dsh-forge-design` — and nothing else that looks like a competing export. If you're writing function form, do not later add a default export to the same module for convenience (a bundler re-export, a test helper) — that default export is what the Loader will actually use, silently discarding the named `inject`/`apply`. This is the single most consequential rule in this kit; see the contract reference's "Plugin forms" section for why.

## Register a tool

Use `defineTool` from `@deepseek-ai/dsh-tools`, declare `parameters` and `output.schema` precisely, and keep `execute` returning only the canonical value declared by `output.schema` — not pre-rendered display text. `output.render` is where the canonical value becomes model-facing content. Requires `inject: ['tools']`. See the contract reference's "Building a tool" section for the minimal shape, and the DSH repository's own `docs/cookbook/adding-a-tool.md` directly for anything beyond it (background execution, UI cards, execution-policy hooks) — that document is long enough that duplicating it here would go stale.

## Choose the right event dispatch mode

Before wiring an event listener, decide which of the four modes the interaction actually needs — do not default to `waterfall` out of habit:

- **`emit`** for a fire-and-forget broadcast nobody needs to react-and-continue to.
- **`bail`** for "first listener with an opinion wins," synchronous.
- **`serial`** for the same first-wins semantics but where listeners need to `await`.
- **`waterfall`** only when listeners genuinely need to transform or wrap a value in a chain.

If you use `waterfall`, **every listener that isn't deliberately terminating the chain must call `next()`** and return its result (or a wrapped version of it). Write the listener, then trace through what happens if `next()` is accidentally omitted — if the answer is "every later listener silently stops firing," that's correct waterfall behavior when intentional and a bug when not. Test both cases explicitly in `dsh-forge-verify` rather than assuming it's obviously right.

## Own the lifecycle of everything you register

Every `ctx.on(...)`, `ctx.tools.register(...)`, and adapter registration is already a self-cleaning effect — you do not write teardown code for these. For anything else that needs explicit teardown (a timer, a subprocess, a network connection), wrap creation and cleanup together in one `ctx.effect()`:

```ts
ctx.effect(() => {
  const timer = setInterval(tick, 5000)
  return () => clearInterval(timer)
})
```

If you have multiple resources whose cleanup order matters relative to each other, put all of them inside *one* `ctx.effect()` call and sequence the teardown steps yourself — do not spread ordered cleanup across multiple `ctx.effect()` calls and rely on Cordis's unload ordering, which runs disposers starting in reverse-registration order but does not guarantee serial completion between concurrent async disposers.

## Read optional services correctly

If `dsh-forge-design` marked a service as optional, read it with `ctx.get('serviceName')` at the point of use — never as a bare `ctx.serviceName` property access. Guard for `undefined` (the service may not be present) and handle that case explicitly rather than assuming presence.

## Respect the configuration contract

Read configuration values through the typed `config` parameter `apply` already receives — do not re-derive a config value from environment variables or module-level state inside implementation code. If implementation reveals a value should have been configurable but wasn't designed as a `Config` field, go back and add it properly (schema, default, documentation) rather than hardcoding a fallback inline.

**Do not reach for `Config` when what you're actually building is a client-half user preference.** If `dsh-forge-design` flagged this plugin as needing a browser half, and the thing you're implementing is a setting the plugin's *own UI* lets someone change at runtime (a color, a toggle) rather than something an operator sets before the process starts, that's a durable settings section registered from the host half through the optional `ctx.inject(['settings'], ...)` pattern, not a `Config` field — see "`Config` is not the same thing as a client-owned user preference" in `docs/plugin-contract-reference.md` and `template/optional-client-half.md`'s matching client-side section.

## If you're building a client half

Follow `template/optional-client-half.md` for the bundling setup (two `tsdown.config.ts` targets, and deriving `CLIENT_EXTERNALS` from the target dependency's own compiled `lib/client.js` rather than guessing it — an incomplete externals list bundles a silent duplicate copy of `react` or a `@deepseek-ai/dsh-client-*` service instead of sharing the host's instance). Keep the client half's own Loader-facing surface (`src/client/index.ts`'s `name`/`inject`/`apply`) under the same no-default-export discipline as the host half above — `dsh-forge-verify`'s Loader-shape test applies to both entry modules independently.

## If you're building a three-role capability

When `dsh-forge-design` called for a Service Definition / Provider / Consumer split, keep the definition package's public interface limited to the abstract service class and its request/result types — no implementation detail. A provider package depends on the definition; a consumer package depends on the definition; providers and consumers never import each other directly.

## Document as you go

Update the package's `README.md` in the same change as any behavior that's visible to a consumer: new config fields, new tool names/schemas, new failure modes. A plugin whose README describes yesterday's behavior is a support burden on day one.

## Handoff

Report which files changed, which services are now injected (required and optional), which config fields exist, and which registrations happen where. Hand off to `dsh-forge-wire` once the plugin is expected to be installable, and to `dsh-forge-verify` for test coverage regardless of whether composition has been proven yet.
