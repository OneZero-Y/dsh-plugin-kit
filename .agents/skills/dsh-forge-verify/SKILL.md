---
name: dsh-forge-verify
description: Use when selecting or writing tests for a standalone DSH plugin. Covers the real-Loader export-shape test that catches the default-export/inject bug, disposal/HMR-safety tests for registrations, waterfall next() coverage, and when a hand-mounted unit test is not sufficient evidence.
---

# Verify a Standalone DSH Plugin

This skill selects test evidence that would actually fail if the plugin were broken in the specific ways DSH plugins have shipped broken before — not a generic "write some tests" instruction. Match the test to the failure mode it exists to catch.

## The one test every plugin needs: prove the real Loader shape

A hand-built `ctx.plugin({ name, inject, apply })` call in a test **cannot** catch the default-export bug described in `docs/plugin-contract-reference.md`'s "Plugin forms" section, because the test itself is supplying `inject` manually instead of going through the module's actual exports. This is exactly why DSH's own ACP server shipped broken with 178 passing tests and full line coverage — none of them exercised the actual unwrap path.

Write this test against the real module import, not a hand-assembled object:

```ts
import * as plugin from '../src/index.ts'

// A function-form plugin must have no default export...
expect('default' in plugin).toBe(false)
// ...and its named exports must be exactly what the Loader will see.
expect(plugin.name).toBe('expected-plugin-id')
expect(plugin.inject).toEqual([/* expected required services */])
expect(plugin.Config).toBeDefined()
expect(typeof plugin.apply).toBe('function')
```

If you have access to the real Cordis Loader's unwrap logic (`@cordisjs/plugin-loader` or equivalent), route the import through it rather than asserting the shape by hand — that proves the exact code path DSH uses, not your best guess at it. If you don't have that dependency available, the export-shape assertions above are the minimum acceptable substitute; note in the test which one you're doing.

For service (class) form, verify instead that the default export is the expected `Service` subclass with the expected `inject`/`name`, not the function-form assertions above — the two forms have different loader-unwrap paths and need different tests, never the same assertion pattern for both.

## Prove registrations actually get cleaned up

Mount the plugin through a real `ctx.plugin(...)` call (this part *is* fine to hand-mount, since it's testing behavior, not the Loader's export handling), observe that its registrations exist while active, dispose the fiber, and assert the registration is gone:

```ts
const fiber = ctx.plugin(myPlugin, config)
// ... assert the tool/listener/service is present and behaves correctly
await fiber.dispose()
// ... assert it is now absent — don't just assert dispose() resolved without throwing
```

Resolving without throwing is not evidence of cleanup; check the actual registry or service state after disposal.

## Test both sides of a waterfall's `next()`

If `dsh-forge-build` wired a `waterfall` listener, write one test where the listener calls `next()` and delegates correctly, and one deliberate test of what happens when it doesn't (either because that's an intentional short-circuit you're verifying, or to catch a regression that accidentally drops the call). Do not assume the "happy path with `next()`" test alone is sufficient — the whole reason `waterfall` is dangerous is the silent failure mode when `next()` is missing.

## Test optional-service handling on both branches

If the plugin reads an optional service via `ctx.get('name')`, test both with the service present (behavior uses it) and absent (`undefined`, and the plugin degrades or skips gracefully — it should not throw an unguarded property access error).

## When a unit test is not enough: real composition

If the plugin is meant to be visibly consumer-facing (a tool the model can call, UI it renders, output a user reads), a suite of hand-mounted unit tests is not sufficient evidence that it works — those tests prove the code runs, not that DSH actually loads and activates it correctly end to end. Add at least one test that boots a real (minimal) Cordis composition through the actual plugin package entry point, the way `dsh-forge-wire`'s `--dump-config`/boot smoke does manually — automate that as a test where practical.

## Command checklist

Before considering the plugin tested:

```sh
pnpm run typecheck
pnpm test
pnpm run build
```

Import the built output (`lib/`, after `pnpm run build`) under plain Node at least once and confirm the exports still match what `package.json`'s `exports` field promises — a passing test suite against source does not guarantee the *published* artifact exports the same shape.

## Handoff

Report which behaviors have test coverage, which don't and why (an explicit gap is fine; a silent one is not), and the exact commands run with their results. Hand off to `dsh-forge-ship` once coverage matches what `dsh-forge-design` originally scoped as needing evidence.
