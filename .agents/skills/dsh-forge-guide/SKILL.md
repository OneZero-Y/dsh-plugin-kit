---
name: dsh-forge-guide
description: Use when starting work on a new standalone DeepSeek Harness (DSH) plugin, or when picking up an existing one and unsure which stage it's at. Orchestrates the six dsh-forge-* stage skills (design, init, build, wire, verify, ship) in order and tracks handoff state between them.
---

# Build a Standalone DSH Plugin, End to End

This skill sequences the other six `dsh-forge-*` skills. It does not duplicate their content — it loads each at the right point and carries the handoff record between them. Load `docs/plugin-contract-reference.md` once at the start of this workflow; every stage skill assumes you've read it.

## The six stages, in order

1. **`dsh-forge-design`** — decide plugin form, dependencies, configuration, and capability shape before any file exists. Never skip this, even for a small plugin — the default-export mistake it guards against is easy to make in five minutes and expensive to debug later.
2. **`dsh-forge-init`** — scaffold the repository from this kit's `template/`, replace every placeholder, prove the empty skeleton installs and typechecks before adding behavior.
3. **`dsh-forge-build`** — implement the actual behavior: tools, events, effects, configuration-driven logic.
4. **`dsh-forge-wire`** — compose the plugin into a real profile via `cordis.patch.yml`, install it, and prove activation with `--dump-config` — not just that installation didn't error.
5. **`dsh-forge-verify`** — write and run the tests that would actually catch the failure modes DSH plugins have shipped broken with before (the real-Loader-shape test above all).
6. **`dsh-forge-ship`** — pick a distribution channel, document the git/`allowBuilds` trap if relevant, and prove the packed artifact is actually installable.

## Carry a handoff record between stages

Keep one short running record — in the task state, or a scratch note if the session is long-running — with these fields, updated as each stage completes:

```text
objective:
packageName:
pluginId:
pluginForm:        function | object | service
requiredServices:
optionalServices:
configFields:
capabilityShape:    single package | three-role split
clientHalf:         none | needed (flag as lower-confidence, per contract reference)
activationProven:   yes/no + evidence
testCoverage:        summary
distributionChannel: git | tarball | npm
```

Do not silently drop a field once decided; if a later stage's work changes an earlier decision (implementation reveals the wrong plugin form was chosen, say), update the record and note why, rather than working around the mismatch in place.

## When stages can be skipped or reordered

- An **existing** plugin being extended doesn't need `dsh-forge-init` again, but still benefits from `dsh-forge-design` for the new capability being added, and `dsh-forge-verify` for the new behavior specifically.
- A plugin that deliberately has no distribution plan yet (still local-only, still in `dsh-forge-build`) doesn't need `dsh-forge-ship` — but still needs `dsh-forge-wire` if it's meant to be tested inside a real profile locally.
- `dsh-forge-verify` is never optional for anything consumer-visible, but the *depth* of coverage should match what `dsh-forge-design` actually scoped — don't manufacture test requirements the design stage didn't call for.

## Hard stops that apply across every stage

- Never let a default export coexist with named `name`/`inject`/`apply` exports on the same module. This single mistake is responsible for a real production incident in DSH itself.
- Never let `dsh-forge-wire`'s `cordis.patch.yml` attempt to modify DSH host source, compiler configuration, or launcher code — that need belongs upstream in the DSH repository itself, not in a patch mechanism inside your plugin.
- Never treat "the install command didn't print an error" as proof of activation — always confirm via `--dump-config` or equivalent before trusting a wiring change.
- Never run a publish, push, or tag command without the user's direct, current-turn authorization — a completed `dsh-forge-ship` review is not that authorization.

## Completion report

When the full sequence completes, report: final package identity, plugin form, injected services, configuration surface, whether activation was proven in a real profile, test coverage summary, and distribution status — separating "verified" from "not yet attempted" for each. A plugin that compiles and typechecks but was never actually installed into a profile has not been proven to work; say so plainly rather than implying otherwise.
