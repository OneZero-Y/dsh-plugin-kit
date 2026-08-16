---
name: dsh-forge-design
description: Use before writing any file for a new standalone DeepSeek Harness (DSH) plugin, or when deciding whether an existing plugin's shape still fits its behavior. Decide plugin form (function/object/service), required vs optional dependencies, configuration fields, and whether the capability needs a three-role split, before scaffolding or code exists.
---

# Design a Standalone DSH Plugin

This skill turns a requested capability into explicit decisions before any file is created. It produces a short decision record other `dsh-forge-*` skills consume; it does not create files or write code itself.

Read `docs/plugin-contract-reference.md` in this kit first if you have not already loaded it this session — every decision below cites a specific section there.

## Get the request straight

Require, from the user or the task: an observable objective ("what should exist or happen after this plugin is installed"), the target repository location (new or existing), and — if known — the intended consumer profile (`web`, `headless`, custom). Do not invent a package name, npm scope, or public-vs-private distribution intent; ask once if these are genuinely undecided, rather than defaulting silently.

## Choose the plugin form

Pick exactly one, per "Plugin forms" in the contract reference:

- **Function form** (`name`, `inject?`, `Config?`, `apply(ctx, config)` as named exports) — the default choice for an ordinary plugin.
- **Object form** (default-exported `{ name, inject?, apply }`) — equivalent to function form; pick one convention and stay consistent across the repository.
- **Service (class) form** (default-exported `Service` subclass) — choose this specifically when *other plugins will consume this plugin as a service* via their own `inject`. If nothing else will depend on it as `ctx.<serviceName>`, function form is simpler and correct.

**Never combine a default export with named `name`/`inject`/`apply` exports on one module.** This is not a style preference — the contract reference documents a real production incident (DSH's own ACP server) where this exact mistake silently dropped `inject` and crashed every real connection despite passing unit tests. State explicitly in the decision record which form was chosen and why.

## Map dependencies

For every DSH service the plugin's behavior will touch (`ctx.tools`, `ctx.llm`, `ctx.agents`, or another plugin's declared service), decide:

- **Required or optional?** Required goes in `inject` (the plugin waits for it, never runs without it). Optional is read via `ctx.get('name')` at the point of use — never via bare `ctx.name` property access, which is topology-sensitive and can fail even when the service exists (contract reference, "Declaring dependencies with `inject`").
- **What happens if it disappears at runtime** (a provider unloads)? For a required dependency, DSH handles this automatically (the plugin unloads and reloads). For an optional one your code decides — record that decision now, not while debugging a null-reference later.

## Design configuration

List every field that two different deployments of this plugin might reasonably want to set differently. For each: type, default, and whether an invalid value should fail plugin load (self-contained misconfiguration — always) or only fail at first use (an environment-dependent condition the plugin cannot judge until it tries). See "Configuration" in the contract reference for the concrete hardcode-vs-config test: *could `cordis.yml` change this without a code edit?*

Do not design a config field for a value with no current consumer justifying variability. Do not hide a deployment-varying choice behind a `DEFAULT_*` constant "for now" — that is exactly the pattern the contract reference's hardcoding rule forbids.

## Decide the capability shape

Ask whether this is a swappable capability that plausibly needs multiple interchangeable backends (the contract reference's Bash example: local execution vs. a sandboxed backend, behind one shared interface). If yes, and only if the roles will genuinely evolve independently, plan a Service Definition / Service Provider / Consumer split into separate packages per "Three-role capability design." If this is an ordinary single-purpose plugin — the common case — keep it one package with one role. Do not split preemptively; a plausible *future* backend is not evidence for splitting *now*.

## Decide host-only vs. host-plus-client

State explicitly whether this plugin needs a browser (DSH Web GUI) half. Default to host-only unless the capability requires drawing something in the DSH Web page itself. If a client half is genuinely needed, flag it as the mixed-confidence area the contract reference describes — the bundling setup and the `ctx.theme`/`ctx.settingsScope` service pattern are confirmed against a real `dsh web` instance, but the general `ctx.slots`/prop contract is still inferred from documentation written for a different audience — and plan to validate the mechanism against a real running `dsh web` instance rather than assuming the inferred parts of the contract are exact. If the plugin will need a client-owned preference to persist, note now that this needs a host-side optional `settings` registration (see "`Config` is not the same thing as a client-owned user preference" in the contract reference), not a `Config` field — deciding this here avoids `dsh-forge-build` designing the wrong mechanism.

## Output: the decision record

Produce a short record covering: plugin form and why, required services, optional services and their `ctx.get` read sites, configuration fields with types/defaults/failure points, capability-split decision, and host-only-vs-client decision. Hand this to `dsh-forge-init` for scaffolding and `dsh-forge-build` for implementation. Do not proceed to scaffolding with an unresolved decision still open — surface it back to the user instead of guessing.
