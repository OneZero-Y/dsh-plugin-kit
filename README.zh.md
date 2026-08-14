# dsh-plugin-kit

简体中文 | [English](README.md)

7 个 agent skill + 一个真能跑的模板，用来构建独立的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件——也就是活在自己仓库里、在 DSH monorepo 之外、靠 `dsh plugin add` 装进别人 profile 的那种插件。

这个 kit 里每一条规则都能追溯到 DSH 官方文档的具体段落（`docs/user/develop/*`、一次真实的生产事故复盘、`packages/AGENTS.md`）。官方文档没覆盖到的地方——具体来说是第三方 Web GUI 客户端插件——这个 kit 会明确说清楚，而不是编一个听起来很权威的答案。引用出处见 `docs/plugin-contract-reference.md`。

## 目录内容

```text
docs/plugin-contract-reference.md   下面每个 skill 都引用的共享参考文档
.agents/skills/dsh-forge-*/          7 个阶段性 skill（design → ship）
template/                             一个真实、经过测试的插件骨架
```

### 7 个 `dsh-forge-*` skill

| Skill | 阶段 |
|---|---|
| `dsh-forge-design` | 在写任何文件之前，先决定插件形态（function/object/service）、依赖、配置、能力拆分方式。 |
| `dsh-forge-init` | 从 `template/` 建仓，替换每一处占位符。 |
| `dsh-forge-build` | 实现工具、事件、生命周期安全的具体行为。 |
| `dsh-forge-wire` | 把插件组合进真实 profile，用 `--dump-config` 证明它真的激活了。 |
| `dsh-forge-verify` | 选出真正能抓住 DSH 实际失败模式的测试——从那个能抓住 DSH 官方 ACP 服务器真实翻过车的 Loader 导出形态测试开始。 |
| `dsh-forge-ship` | 选分发通道，并记录清楚 Git 安装时 pnpm `allowBuilds` 那个坑。 |
| `dsh-forge-guide` | 统筹以上 6 个阶段，在它们之间传递交接状态。 |

每份 `SKILL.md` 都是 agent 阅读并应用的指导，不是盲目执行的脚本——每一份都明确写了什么时候该停下来问，而不是靠猜。

### `template/`

一个真实、可构建、经过测试的包——不是对包的文字描述。当前状态下它能跑通 `npm install`、`npm run typecheck`、`npm test`（4/4 通过）、`npm run build`、`npm pack --dry-run`（打包文件清单干净：没有测试文件、没有锁文件、没有泄露的密钥）。复制它，改掉占位符（`dsh-forge-init` 逐条说明该改哪些），从一个已验证可用的基线起步，而不是从空文件开始。

```text
template/
├── src/{index,config,runtime}.ts   Loader 入口 / 配置 schema / 具体行为 —— 故意分开
├── tests/{index,runtime}.spec.ts     导出形态测试 + 激活/回收测试
├── cordis.patch.yml、package.json    bundle manifest
├── README(.zh).md、LICENSE
└── optional-client-half.md           关于低置信度的浏览器半的指导（不是骨架代码）
```

`src/` 三份拆开（`index.ts` 只放 Loader 面向的导出、`config.ts` 放 schema、`runtime.ts` 放实际行为）是有意为之——这样 `dsh-forge-verify` 里的导出形态测试才能只对着 `index.ts` 断言，不会被实现细节干扰。这个拆分正是让那个测试"写对"而不是"测错东西"的关键。

## 两套规矩，这个 kit 用的是哪一套

`deepseek-ai/deepseek-harness` 自己有一套给 monorepo **内部**贡献 package 的人用的规矩（`AGENTS.md`、`packages/AGENTS.md`）——强制导出 `./invariant`、每个文件 100% 覆盖率、双聚合 TypeScript 布局。**这些都不适用于独立插件**，这个 kit 故意没有照搬。这个 kit 遵循的是 DSH 官方给第三方插件作者写的教程系列（`docs/user/develop/`）——是一套明显更小、内容也不同的规矩。`docs/plugin-contract-reference.md` 开头就把这个区分讲清楚了。

## 在自己的插件仓库里使用

把 `.agents/skills/` 和 `docs/plugin-contract-reference.md` 复制进你的插件仓库（或者直接让 agent 指向这个 kit，让它从 `template/` 开始 scaffold），然后加载 `dsh-forge-guide`，让它去编排剩下的步骤。

## 这个 kit 围绕的那一个 bug

一个模块如果同时有 default export 和具名的 `name`/`inject`/`apply` 导出，DSH 真实的 Loader 会悄悄丢掉那些具名导出——插件会以空 `inject` 加载，之后任何服务访问都会在加载时直接抛错，而不是类型报错。这个坑真实发生在 DSH 自己的 ACP 服务器上，当时有 178 个单测、100% 行覆盖率全部通过，结果每一个真实编辑器连接都会崩——因为那套测试里每一个都是手动拼出 `ctx.plugin()` 调用，没有一个是真正 import 这个模块、让真实 Loader 去 unwrap 它。`template/tests/index.spec.ts` 就是专门为了抓住这个问题写的，`dsh-forge-verify` 解释了为什么手动拼装的测试抓不住它。

## 兼容性

`template/package.json` 钉住的 `@deepseek-ai/cordis` 和 `@deepseek-ai/schemastery` 版本，是对齐当前已发布版本的。DSH 明确处于开发者预览阶段、会有破坏兼容的变更——如果某个钉住的版本范围不再匹配你的目标宿主，去宿主自己的 `docs/` 里核对当前契约，不要直接升版本号然后assume它能用。

## 许可

[MIT](LICENSE) —— 欢迎自由复制进你自己的插件仓库。
