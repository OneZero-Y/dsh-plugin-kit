# dsh-plugin-kit

[简体中文](README.zh.md) | English

Seven agent skills and a working template for building a standalone [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin — a plugin that lives in its own repository, outside the DSH monorepo, and gets installed into someone else's profile with `dsh plugin add`.

Every rule in this kit traces to a specific section of DSH's own documentation (`docs/user/develop/*`, a real production postmortem, `packages/AGENTS.md`). Where the official docs don't cover something — third-party Web GUI client plugins, specifically — this kit says so explicitly instead of inventing a confident-sounding answer. See `docs/plugin-contract-reference.md` for the citations.

## What's here

```text
docs/plugin-contract-reference.md   the shared reference every skill below cites
.agents/skills/dsh-forge-*/          seven stage skills (design → ship)
template/                             a working, tested plugin skeleton
```

### The seven `dsh-forge-*` skills

| Skill | Stage |
|---|---|
| `dsh-forge-design` | Decide plugin form (function/object/service), dependencies, config, and capability shape — before any file exists. |
| `dsh-forge-init` | Scaffold a repository from `template/`, replacing every placeholder. |
| `dsh-forge-build` | Implement tools, events, and lifecycle-safe behavior. |
| `dsh-forge-wire` | Compose the plugin into a real profile and prove it actually activates via `--dump-config`. |
| `dsh-forge-verify` | Select tests that catch DSH's real failure modes — starting with the Loader export-shape test that would have caught a bug that shipped in DSH's own ACP server. |
| `dsh-forge-ship` | Pick a distribution channel and document the pnpm `allowBuilds` trap for git installs. |
| `dsh-forge-guide` | Orchestrate the six stages above and track handoff state between them. |

Each `SKILL.md` is guidance an agent reads and applies — not a script it executes blindly. Every one says explicitly when to stop and ask rather than guess.

### `template/`

A real, buildable, tested package — not a description of one. As shipped, it passes `npm install`, `npm run typecheck`, `npm test` (4/4), `npm run build`, and `npm pack --dry-run` with a clean file list (no test files, no lockfile, no secrets in the tarball). Copy it, rename the placeholders (`dsh-forge-init` walks through exactly which ones), and start from a proven-working baseline instead of a blank file.

```text
template/
├── src/{index,config,runtime}.ts   Loader entry / config schema / behavior — kept separate on purpose
├── tests/{index,runtime}.spec.ts     export-shape test + activation/disposal test
├── cordis.patch.yml, package.json    bundle manifest
├── README(.zh).md, LICENSE
└── optional-client-half.md           guidance (not a skeleton) for the lower-confidence browser half
```

The three-way `src/` split (`index.ts` for the Loader-facing exports only, `config.ts` for schema, `runtime.ts` for actual behavior) exists specifically so the export-shape test in `dsh-forge-verify` can target `index.ts` without pulling in implementation details — it's what makes that test easy to write correctly instead of accidentally testing the wrong thing.

## Two rulebooks, and which one this kit follows

`deepseek-ai/deepseek-harness` has its own internal contributor rules (`AGENTS.md`, `packages/AGENTS.md`) for people adding packages *inside* that monorepo — a mandatory `./invariant` export, 100%-per-file coverage, a two-aggregate TypeScript layout. **None of that applies to a standalone plugin**, and this kit deliberately does not carry it over. What this kit follows instead is DSH's own tutorial series for third-party plugin authors (`docs/user/develop/`) — a materially smaller and different rulebook. `docs/plugin-contract-reference.md` explains the distinction up front.

## Using this in your own plugin repository

Copy `.agents/skills/` and `docs/plugin-contract-reference.md` into your plugin repository (or point an agent at this kit and ask it to scaffold from `template/`), then load `dsh-forge-guide` and let it sequence the rest.

## The one bug this kit is built around

A default export on a module that also has named `name`/`inject`/`apply` exports makes DSH's real Loader silently discard the named exports — the plugin loads with an empty `inject`, and any service access throws at load time, not as a type error. This exact mistake shipped in DSH's own ACP server, passed 178 unit tests with full line coverage, and crashed every real editor connection, because every test in that suite hand-built the plugin's `ctx.plugin()` call instead of importing the module and letting the real Loader unwrap it. `template/tests/index.spec.ts` is built specifically to catch this, and `dsh-forge-verify` explains why a hand-mounted test cannot.

## Compatibility

`template/package.json` pins `@deepseek-ai/cordis` and `@deepseek-ai/schemastery` against currently published versions. DSH is an explicit developer preview with compatibility-breaking changes expected — if a pinned range stops matching your target host, re-check the current contract in the host's own `docs/`, don't just bump the version and hope.

## License

[MIT](LICENSE) — copy freely into your own plugin repositories.
