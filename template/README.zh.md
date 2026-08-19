# @your-scope/dsh-plugin-template

简体中文 | [English](README.md)

一句话描述这个插件为 DeepSeek Harness (DSH) 做了什么，适合谁用。

## 安装

按这个包实际支持的通道选一种（怎么取舍见 `dsh-plugin-kit` 里的 `dsh-forge-ship`），其余删掉。

**从 npm 或 tarball 安装（用户机器上不会跑构建）：**

```sh
dsh plugin --profile web add "@your-scope/dsh-plugin-template@0.1.0"
dsh web
```

**从 Git 安装，钉死某个 commit：**

```sh
dsh plugin --profile web add "github:your-scope/dsh-plugin-template#<commit-sha>"
dsh web
```

本包带 `prepare` 脚本，pnpm 会在用户 clone 下来后在其机器上构建它。**pnpm 10+ 在拿到明确授权前会拒绝为 Git 依赖运行该脚本**——从全新 profile 第一次 `add` 会失败，报错会直接给出需要加的 key。这是 pnpm 的预期行为，不是包坏了。**照抄你自己报错里打印出的那个 key**——它不只是包名，而是包名加上解析出的那个 commit 的 tarball 下载地址，每次新 commit 都会变：

```yaml
allowBuilds:
  '@your-scope/dsh-plugin-template@https://codeload.github.com/your-scope/dsh-plugin-template/tar.gz/<你自己报错里的那串commit哈希>': true
```

然后重新执行同一条 `dsh plugin add` 命令。授权构建意味着这个仓库的代码会在用户机器上、脱离 agent 沙箱运行——所以钉 commit 而不是钉分支，避免之后的 push 悄悄改变已安装用户下次运行到的代码。因为这个 key 钉死在具体 commit 上，**这个包以后每次更新，都需要一份新的 `allowBuilds` 记录**——不是装一次就永久有效，用户下次装到新 commit 时会再看到一次同样的提示。

## 使用

描述用户安装后如何发现并使用这个插件。

## 配置

| 字段 | 类型 | 默认值 | 作用 |
|---|---|---|---|
| `greeting` | `string` | `'Hello'` | 替换成这个插件真正的字段。 |

在 profile 的 `cordis.patch.yml` 里给这个插件的行设置——具体行的写法见本仓库的 `cordis.patch.yml`。

## 工作原理

```text
src/index.ts     Loader 入口：name、inject、Config、apply —— 不能有 default export
src/config.ts    配置 schema 与默认值
src/runtime.ts   实际行为
cordis.patch.yml Profile 组合行
```

## 开发

```sh
git clone https://github.com/your-scope/dsh-plugin-template.git
cd dsh-plugin-template
npm install

npm run typecheck
npm test
npm run build
```

在 DSH Web 中测试本地代码：

```sh
dsh plugin --profile web add "link:$(pwd)"
dsh web
```

## 许可

[MIT](LICENSE)
