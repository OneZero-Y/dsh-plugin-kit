# dsh-plugin-kit

简体中文 | [English](README.md)

一套 agent skill 和一个模板，用来构建独立的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件——也就是活在自己仓库里、靠 `dsh plugin add` 装进 profile 的那种插件。

## 快速开始

**从零建一个新插件：**

```sh
git clone https://github.com/OneZero-Y/dsh-plugin-kit.git
cp -r dsh-plugin-kit/template my-plugin
cp -r dsh-plugin-kit/.agents my-plugin/.agents
cp -r dsh-plugin-kit/docs my-plugin/docs
cd my-plugin
```

然后在指向 `my-plugin/` 的 agent 会话里说：

```
加载 dsh-forge-guide，帮我搭一个能 <描述这个插件要做什么> 的插件。
```

agent 会替换模板里的占位符、实现具体行为、装进测试用的 profile 验证、写测试、准备发布——遇到需要你决定的地方会问你。

**给已有的插件仓库加上这套 skill**（不新建仓库）：

```sh
cp -r dsh-plugin-kit/.agents your-existing-repo/.agents
cp -r dsh-plugin-kit/docs/plugin-contract-reference.md your-existing-repo/docs/
```

然后在那个仓库里加载 `dsh-forge-guide`（或者下表里某个具体阶段的 skill）。

## 目录内容

```text
.agents/skills/dsh-forge-*/          7 个 skill，对应写插件的每个阶段
docs/plugin-contract-reference.md   这些 skill 依据的 DSH 规则
template/                             拿来 scaffold 的插件骨架
```

## Skill

加载 `dsh-forge-guide` 跑完整流程，或者如果是接手做到一半的插件，直接加载某个具体阶段的 skill：

| Skill | 用在哪 |
|---|---|
| `dsh-forge-design` | 写代码之前，先决定插件形态、依赖、配置。 |
| `dsh-forge-init` | 从 `template/` 建仓。 |
| `dsh-forge-build` | 实现工具、事件、具体行为。 |
| `dsh-forge-wire` | 把插件装进真实 profile，确认它真的激活了。 |
| `dsh-forge-verify` | 写能抓住 DSH 真实失败模式的测试。 |
| `dsh-forge-ship` | 准备发布（npm、tarball 或 git）。 |
| `dsh-forge-guide` | 统筹以上六个阶段。 |

## `template/`

一个真实、经过测试的插件骨架——按现状 `npm install && npm run build && npm test` 就能跑通。`dsh-forge-init` 会帮你处理复制和改名；手动做的话，把所有 `@your-scope/dsh-plugin-template` 和 `dsh-plugin-template` 换成你真实的包名和插件 id 即可。

```text
template/
├── src/{index,config,runtime}.ts   Loader 入口 / 配置 schema / 具体行为
├── tests/{index,runtime}.spec.ts
├── cordis.patch.yml、package.json
├── README(.zh).md、LICENSE
└── optional-client-half.md         需要 Web GUI 半时的指导
```

已经在真实 DSH profile 里验证过：能用 `dsh plugin add` 装上，能正常加载和卸载，配置默认值生效。每条规则的出处和更多验证细节见 `docs/plugin-contract-reference.md`。

## 兼容性

`template/package.json` 钉住的 `@deepseek-ai/cordis` 和 `@deepseek-ai/schemastery` 版本，对齐的是当前已发布版本。DSH 明确处于开发者预览阶段、会有破坏兼容的变更——如果某个钉住的版本不再匹配你的目标宿主，去宿主自己的 `docs/` 核对当前契约，不要直接升版本号了事。

## 许可

[MIT](LICENSE) —— 欢迎自由复制进你自己的插件仓库。
