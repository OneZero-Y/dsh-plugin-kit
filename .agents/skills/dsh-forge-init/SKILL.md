---
name: dsh-forge-init
description: Use after dsh-forge-design, when creating the repository skeleton for a new standalone DSH plugin from this kit's template. Set up the package.json bundle manifest, cordis.patch.yml, and source layout, and replace every template placeholder with the plugin's real identity.
---

# Initialize a Standalone DSH Plugin Repository

This skill turns a `dsh-forge-design` decision record into a real, buildable repository skeleton copied from `template/` in this kit. It is guidance for adapting that template, not a script to run blindly — read what you're copying before you copy it.

## Before copying anything

Confirm: target directory (new, empty, or an existing checkout you were asked to extend), npm package name, and the Cordis plugin `id` you'll use in `cordis.patch.yml` rows. These are two different names serving two different purposes and do not need to match. If the target directory already has unrelated content, stop and ask rather than overwriting it.

## Understand what you're creating: two manifests, one repository

Per "Packaging: bundle manifest vs. profile manifest" in `docs/plugin-contract-reference.md`: you are authoring a **bundle** — a package whose `package.json` declares `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`. You are not creating a profile; profiles are generated and owned by `dsh plugin` on the *consumer's* machine. Do not hand-write a profile directory structure into this repository.

## Copy the template

Copy `template/` from this kit, excluding anything that is clearly build output or VCS metadata (`node_modules/`, `lib/`, `.git/`, lockfiles) — those regenerate from `package.json` and should not be carried over stale.

Preserve the file split as given: `src/index.ts` is the Loader-facing entry (name/inject/Config/apply wiring only), `src/config.ts` holds the schema and defaults, `src/runtime.ts` holds the actual behavior. This split exists so `dsh-forge-verify`'s Loader-shape test can target `src/index.ts` in isolation without pulling in implementation details. Do not collapse these into one file "for simplicity" — the separation is what makes the postmortem-driven Loader test in `dsh-forge-verify` easy to write correctly.

## Replace every placeholder

The template uses these placeholders; replace all of them consistently:

- `@your-scope/dsh-plugin-template` → the real package name, everywhere it appears (`package.json` `name`, `README.md`, `cordis.patch.yml`'s `name:` row value, any JSDoc `@module` tags).
- `dsh-plugin-template` (the bare id, no scope) → the real Cordis plugin `id`, in `src/index.ts`'s `name` export and in `cordis.patch.yml`'s row `id:`.
- Author/license placeholder text in `LICENSE` and `package.json`.

After editing, search for anything still containing `your-scope` or `plugin-template` across the repository (excluding `.agents/skills/` and `node_modules/`) and resolve every match — a leftover placeholder in a comment or README is a real defect, not cosmetic.

## Fill in from the design record

Apply the `dsh-forge-design` decisions now:

- Plugin form (function/object/service) → shape `src/index.ts` and `src/runtime.ts` accordingly; delete the unused form's boilerplate rather than leaving dead alternatives commented out.
- Required services → `inject` array in `src/index.ts`.
- Config fields → `src/config.ts`'s `Config` interface and Schemastery schema, with the decided defaults and failure semantics.
- If the design called for a three-role split, this template represents *one* role — repeat this skill for each additional package rather than cramming multiple roles into one repository.

## Establish a working repository state

Run `pnpm install` to generate the lockfile only after the identity and dependency edits above are done — an early lockfile under the placeholder name is immediately stale. Confirm `node_modules/`, `lib/`, and any `*.tsbuildinfo` stay ignored per `.gitignore`.

Do not initialize git, create a remote, or make a commit unless the user asked for that step or separately approves it.

## Exit condition

Scaffolding is done when: no placeholder text remains, `package.json`'s `name`/`exports`/`files` describe the real package, `cordis.patch.yml` references the real package name and plugin id, and the unmodified skeleton — before any feature code is added — passes `pnpm install`, `pnpm run typecheck`, and `pnpm test`. Hand off to `dsh-forge-build` only once this baseline is green; do not add feature code before proving the skeleton itself works.
