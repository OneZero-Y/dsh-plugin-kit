---
name: dsh-forge-ship
description: Use when preparing a standalone DSH plugin for distribution — choosing between git, tarball, and npm channels, documenting the pnpm allowBuilds trap for git installs, and checking the packed file list before anyone tries to install it. Does not cover actual publishing/tagging/pushing, which require separate explicit authorization.
---

# Prepare a Standalone DSH Plugin for Distribution

This skill checks that the package can actually be installed through its intended channel before a real user tries it. It is not authorization to publish, push, or tag anything — those remain separate, explicit user requests.

## Pick the channel deliberately

Per "Distribution: the three channels and the build-script trap" in `docs/plugin-contract-reference.md`, there are three paths, and they have meaningfully different friction:

- **Git source spec** (`github:you/repo` or a pinned `#<sha>`) — lowest setup effort for you, highest friction for the consumer if the package needs a build step.
- **Tarball** (`pnpm pack` output, installed via local path) — no build-on-install, good for private/local distribution.
- **npm registry** — no build-on-install, the path most consumers expect.

If you choose git and the package has a `prepare` script (needed because it ships TypeScript source that must compile to `lib/`), **explicitly document in the README that the first `dsh plugin add` from a clean profile will fail** with a pnpm message naming an `allowBuilds` key to add — this is expected pnpm 10+ behavior, not a bug, but a user who hits it with no warning will reasonably assume the package is broken. State the exact remediation: add the named key to that profile's `pnpm-workspace.yaml`, then re-run the identical `add` command.

If you choose git, pin a commit in every install instruction you write (`#<sha>`), not a branch name — a `prepare` script running on install is executing your code on the consumer's machine outside any agent sandbox; a floating branch reference means a later push silently changes what already-installed users run next time they reinstall.

## If choosing npm or tarball: prove the build-then-pack story

```sh
pnpm run build
pnpm pack --dry-run
```

Inspect the resulting file list. Every path `package.json`'s `exports` and `main`/`types` fields promise must actually be present — check this by eye against the dry-run output, not by assumption. A common defect: `exports` promises a subpath that the build never emits, which works fine in local development (source resolution masks it) and fails only for a real consumer installing the packed artifact.

## If choosing git: prove the prepare script actually works standalone

The `prepare` script must build the published entry points from source **without assuming any context beyond what a fresh git clone plus `pnpm install` provides** — no sibling monorepo checkout, no dev-only tool available only in your local environment. Test this literally: clone the repository into a scratch directory outside your normal working tree, run `pnpm install` there, and confirm the resulting `lib/` (or equivalent) is complete and importable. If you can't do a real clone test, at minimum re-read the `prepare` script and check every path it reads for a hidden dependency on files outside the git-tracked repository.

## Check what you're revealing about your own setup

Read the packaged file list (from `pnpm pack --dry-run` above) for anything that shouldn't ship: `.env` files, local absolute paths baked into build output, test fixtures with real credentials, `node_modules` accidentally included via a misconfigured `files` field. This is a distribution-security check, not a build-correctness one — do it even if the build itself is fine.

## Documentation the README needs before shipping

At minimum: the install command for the chosen channel (with the `allowBuilds` remediation spelled out if git), a minimal usage example, the plugin's configuration fields with defaults, and — if this kit's `dsh-forge-design` flagged the plugin as needing a client half — an explicit note that the client-side mechanism was validated against a specific DSH version and may need re-checking against a newer one.

## What this skill explicitly does not do

It does not run `npm publish`, `git push`, `git tag`, or create a GitHub release. Those are irreversible or hard-to-reverse actions on infrastructure you may not fully control (a registry, a shared remote) and require the user's direct, explicit request at the time — not an inference from "the package looks ready."

## Handoff

Report the chosen channel, the exact commands run to verify it (pack dry-run output, clean-clone prepare test, or neither if npm/tarball made both unnecessary), any packaging defects found and fixed, and documentation status. State plainly whether the package is verified-installable through the chosen channel or whether that verification is still outstanding — do not report "ready to ship" as a synonym for "the code compiles."
