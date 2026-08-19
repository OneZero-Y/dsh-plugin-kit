# @your-scope/dsh-plugin-template

[简体中文](README.zh.md) | English

One-paragraph description of what this plugin does for DeepSeek Harness (DSH) and who it is for.

## Install

Pick the channel this package actually supports (see `dsh-forge-ship` in `dsh-plugin-kit` for how to decide) and delete the others.

**From npm or a tarball (no build runs on the consumer's machine):**

```sh
dsh plugin --profile web add "@your-scope/dsh-plugin-template@0.1.0"
dsh web
```

**From Git, pinned to a commit:**

```sh
dsh plugin --profile web add "github:your-scope/dsh-plugin-template#<commit-sha>"
dsh web
```

This package ships a `prepare` script, so pnpm builds it on the consumer's machine after cloning. **pnpm 10+ refuses to run that script for a Git dependency until it is explicitly allowed** — the first `add` from a fresh profile will fail, and the error names the exact key to add. This is expected pnpm behavior, not a broken package. Copy the printed key **exactly as shown in your own error output** — it is not just the package name, but the package name plus the resolved commit's tarball URL, and it changes on every new commit:

```yaml
allowBuilds:
  '@your-scope/dsh-plugin-template@https://codeload.github.com/your-scope/dsh-plugin-template/tar.gz/<commit-sha-from-your-error>': true
```

Then re-run the identical `dsh plugin add` command. Authorizing a build is explicit permission for this repository's code to run on the consumer's machine outside any agent sandbox — pin a commit, not a branch, so a later push can't silently change what already-installed users run next. Because this key is pinned to a specific commit, **a later update to this package needs a fresh `allowBuilds` entry too** — expect this same prompt again after any future commit a consumer re-installs against, not just on the first install.

## Usage

Describe how a user notices and uses this plugin once installed.

## Configuration

| Field | Type | Default | Effect |
|---|---|---|---|
| `greeting` | `string` | `'Hello'` | Replace with this plugin's real fields. |

Set these in the plugin's row in a profile's `cordis.patch.yml` — see `cordis.patch.yml` in this repository for the exact row shape.

## How it works

```text
src/index.ts     Loader-facing entry: name, inject, Config, apply — no default export
src/config.ts    Configuration schema and defaults
src/runtime.ts   Actual behavior
cordis.patch.yml Profile composition row
```

## Development

```sh
git clone https://github.com/your-scope/dsh-plugin-template.git
cd dsh-plugin-template
npm install

npm run typecheck
npm test
npm run build
```

Test a local checkout in DSH Web:

```sh
dsh plugin --profile web add "link:$(pwd)"
dsh web
```

## License

[MIT](LICENSE)
