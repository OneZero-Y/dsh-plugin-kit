# dsh-plugin-kit

[简体中文](README.zh.md) | English

Agent skills and a template for building a standalone [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin — one that lives in its own repository and installs into a profile with `dsh plugin add`.

## Quick start

**Scaffold a new plugin:**

```sh
git clone https://github.com/OneZero-Y/dsh-plugin-kit.git
cp -r dsh-plugin-kit/template my-plugin
cp -r dsh-plugin-kit/.agents my-plugin/.agents
cp -r dsh-plugin-kit/docs my-plugin/docs
cd my-plugin
```

Then, in an agent session pointed at `my-plugin/`, say:

```
Load dsh-forge-guide and scaffold a plugin that <describe what it should do>.
```

The agent will replace the template's placeholders, implement the behavior, wire it into a test profile, write tests, and prepare it for distribution — asking you when a decision needs your input.

**Add the skills to an existing plugin repository**, instead of scaffolding fresh:

```sh
cp -r dsh-plugin-kit/.agents your-existing-repo/.agents
cp -r dsh-plugin-kit/docs/plugin-contract-reference.md your-existing-repo/docs/
```

Then load `dsh-forge-guide` (or a specific stage skill — see the table below) in that repository.

## What's included

```text
.agents/skills/dsh-forge-*/          seven skills, one per stage of building a plugin
docs/plugin-contract-reference.md   the DSH rules those skills apply
template/                             a working plugin skeleton to scaffold from
```

## Skills

Load `dsh-forge-guide` to run the full workflow, or load a single stage skill directly if you're picking up partway through:

| Skill | Use it for |
|---|---|
| `dsh-forge-design` | Deciding plugin form, dependencies, and config before writing code. |
| `dsh-forge-init` | Scaffolding a repository from `template/`. |
| `dsh-forge-build` | Implementing tools, events, and behavior. |
| `dsh-forge-wire` | Installing the plugin into a real profile and confirming it activated. |
| `dsh-forge-verify` | Writing tests that catch DSH's actual failure modes. |
| `dsh-forge-ship` | Preparing the package for distribution (npm, tarball, or git). |
| `dsh-forge-guide` | Orchestrating the six stages above. |

## `template/`

A working, tested plugin skeleton — `npm install && npm run build && npm test` passes as shipped. `dsh-forge-init` handles copying and renaming it for you; to do it by hand, replace every occurrence of `@your-scope/dsh-plugin-template` and `dsh-plugin-template` with your package's real name and id.

```text
template/
├── src/{index,config,runtime}.ts   Loader entry / config schema / behavior
├── tests/{index,runtime}.spec.ts
├── cordis.patch.yml, package.json
├── README(.zh).md, LICENSE
└── optional-client-half.md         guidance for adding a Web GUI half, if needed
```

Verified against a real DSH profile: installs with `dsh plugin add`, loads and unloads cleanly, and its config defaults apply correctly. See `docs/plugin-contract-reference.md` for what else this kit checked and where each rule comes from.

## Compatibility

`template/package.json` pins `@deepseek-ai/cordis` and `@deepseek-ai/schemastery` against currently published versions. DSH is a developer preview with compatibility-breaking changes expected — if a pinned range no longer matches your target host, check the host's own `docs/` for the current contract rather than just bumping the version.

## License

[MIT](LICENSE) — copy freely into your own plugin repositories.
