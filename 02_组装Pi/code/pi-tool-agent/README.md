# Pi Tool Agent：02 配套工程

沿用 01 的模型装配，固定 Pi 1.0.0、TypeBox 1.3.27。Node.js >=22.19.0。

## 运行

```bash
node --version
npm install --ignore-scripts
```

在同一个终端设置凭据（不要提交到仓库）：

```powershell
$env:DEEPSEEK_API_KEY = "替换为你的 API Key"
npm start
```

macOS / Linux：

```bash
export DEEPSEEK_API_KEY="替换为你的 API Key"
npm start
```

`providers.ts` 沿用 01 的默认模型及配置；可用 `DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL` 覆盖。请确认账户实际支持所选模型。窗口、输出上限和费用占位值沿用教学配置，费用零值不表示免费。

## 演示模式

PowerShell：

```powershell
$env:OUTPUT_MODE = "json"
$env:DEMO_MODE = "normal"
npm start
```

- `OUTPUT_MODE=json`：提取最终 assistant 文本，校验 JSON、字段、来源和引文，再打印。
- `DEMO_MODE=normal`：本地关键词匹配，两条虚构差旅条款。
- `DEMO_MODE=empty`：返回空结果，观察证据不足回答。

仅保留正常查询与空结果两种演示，`OUTPUT_MODE` 支持 `text` 或 `json`。例如设置 `DEMO_MODE=empty` 后再次运行，可观察证据不足回答。每次运行最多等待 60 秒，按 Ctrl+C 可取消。

恢复默认：

```powershell
Remove-Item Env:OUTPUT_MODE -ErrorAction SilentlyContinue
Remove-Item Env:DEMO_MODE -ErrorAction SilentlyContinue
```

## 本地检查

```bash
npm test
```

测试使用 Pi 模拟 provider，通过真实 Loop 验证工具结果、空查询与非法参数；连续提交四个问题，验证裁剪后调用与结果仍成对；同时检查已取消请求、输出拒绝分支，以及同一 Turn 的两次调用和最终 JSON 提取。不读取 API Key，不访问远程模型。

本次在 Node 24.19.0 上通过六项测试。正文保留了作者提供的真实模型运行截图；本轮代码检查使用模拟 provider，不重新请求 DeepSeek，也不保证真实模型一次就能生成符合合约的输出。

## 文件

- `providers.ts`：复制 01 的模型装配。
- `tools.ts`：只读工具；教学数据不代表任何学校制度。
- `context.ts`：保留全部 system 消息和最后三个完整请求组，适用于本例无插队输入的场景；默认脚本仅请求一次，裁剪过程由四次连续请求的测试验证，不构成 Token 预算保证。
- `contract.ts`：JSON/schema/来源/原文匹配；不证明结论与引文语义一致。
- `index.ts`：文本与 JSON 路径、事件、截止时间和取消。
- `checks.test.ts`：本地验收。

此示例没有数据库、权限系统、自动摘要、会话持久化和修复重试。迁移到业务后端时，需要按实际交付要求补上。
