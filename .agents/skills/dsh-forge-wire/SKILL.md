---
name: dsh-forge-wire
description: Use when composing a standalone DSH plugin into a real profile — writing cordis.patch.yml, installing with dsh plugin add, and proving the row actually activates via --dump-config. Covers the four-layer loading order and the whole-config-replacement semantics of a patch override.
---

# Wire a Standalone DSH Plugin into a Profile

This skill proves the plugin's bundle manifest and patch actually compose into a real profile — not just that `dsh plugin add` exits without an error. "Installed without error" and "activated correctly" are different claims; this skill is about the second one.

## Confirm the bundle manifest is correct

`package.json` must declare:

```json
{
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

and the referenced file must exist and be listed in `files` (so it survives packaging). If this declaration is missing, `dsh plugin add` still installs the package as an ordinary dependency but prints a warning and activates nothing — a silent no-op that looks like success in the terminal. Confirm the declaration is present before debugging anything else.

## Write the patch row correctly

`cordis.patch.yml` references the plugin by its **installed package name**, not a relative source path — Node module resolution needs to find the installed code once this leaves your development checkout:

```yaml
- insert:
    - id: my-plugin
      name: my-plugin-package-name
      config:
        # only if the plugin needs non-default configuration at this layer
```

Pick a stable, deployment-local `id`. It does not need to match the npm package name or the Cordis plugin `name` export — those are three different identifiers with three different jobs (npm registry identity, Cordis loader identity, patch-row addressing).

## Understand the four-layer loading order before debugging a "why didn't my config apply" issue

Per "Installing and the loading order" in `docs/plugin-contract-reference.md`, the effective configuration composes in this order: profile's bundle list (in list order) → profile's own `cordis.patch.yml` → home-level `cordis.patch.yml` → any `--patch` overlay. **A later layer replaces a targeted row's entire `config` value — it does not merge individual keys.** If you see a config field silently revert to its schema default, the most likely cause is a later layer overriding the same row `id` and restating only *some* keys — check every layer in order before assuming your plugin's default is wrong.

## Install into an isolated profile for this work

Use a scratch or dedicated development profile for composition testing — do not overwrite a profile the user relies on. A packed local artifact or an explicitly approved local checkout path is the right install source for this stage:

```sh
dsh plugin --profile <scratch-profile> add <local-path-or-approved-spec>
```

If installing from a git source and the package ships a `prepare` script, expect the first `add` in a fresh profile to fail with a pnpm `allowBuilds` message — that is normal per `dsh-forge-ship`'s distribution guidance, not a wiring defect; add the printed key to that profile's `pnpm-workspace.yaml` and re-run the unchanged command.

## Prove activation, not just installation

Before booting anything long-lived, inspect the composed result:

```sh
dsh --profile <scratch-profile> --dump-config
```

Confirm: the plugin's row appears with a layer-source comment identifying your bundle, the row's `config` matches what you expect after all four layers apply, and there is no "target row not found" warning for an override you intended. A row targeting an absent `id` prints a warning and silently fails to override anything — treat that warning as failed composition, not a benign notice, unless the absence is genuinely intentional.

Only after the dump looks correct, boot the actual profile and observe a real effect specific to this plugin's activation — not merely that the process started, and not only a log line belonging to a different row. Dispose of any long-lived process cleanly once the smoke test is done.

## What this skill does not cover

`cordis.patch.yml` composes plugin rows and their configuration — it cannot edit DSH's own source files, compiler settings, or launcher code. If a plugin's behavior seems to require changing DSH itself, that need belongs upstream in `deepseek-ai/deepseek-harness` as a contribution to that repository (following its own `AGENTS.md`), not as a patch mechanism carried in your plugin's repository. Stop and flag this rather than inventing a workaround.

## Handoff

Report the profile used, the install spec, the confirmed effective row (including its layer source), any warnings observed, and the activation evidence. Hand off to `dsh-forge-verify` for the behavioral test suite and to `dsh-forge-ship` once composition is proven and the package is ready to be distributed to someone else's profile.
