# 01 配套工程：pi-minimal

使用 TypeScript，固定使用 Pi 1.0.0，需要 Node.js >=22.19.0 与 npm。Node 原生运行本例可擦除类型的 `.ts` 文件，无需额外编译步骤。

模型装配与行政 Agent 的 services/pi-agent/src/providers.ts 一致：createProvider + envApiKeyAuth + openAICompletionsApi，使用 DeepSeek。行政项目当前依赖 Pi 0.84.2，本例依赖 1.0.0；本次没有升级行政项目。

在本目录执行：

```bash
npm install --ignore-scripts
npm run check
```

`check` 只检查语法、导入、DeepSeek provider 与模型注册、Agent 装配和模拟流式事件，不请求远程模型，也不读取凭据。真实回复按下面的步骤运行。

Windows PowerShell：

```powershell
$env:DEEPSEEK_API_KEY = "替换为你的API Key"
npm start
```

macOS / Linux Bash 或 zsh：

```bash
export DEEPSEEK_API_KEY="替换为你的API Key"
npm start
```

请在同一个终端设置变量与启动。沿用行政项目源码默认配置：`DEEPSEEK_MODEL=deepseek-v4-flash`，`DEEPSEEK_BASE_URL=https://api.deepseek.com`。可以通过这两个变量覆盖模型 ID 和端点。源码默认值不代表已验证账号可用性，真实请求需自行验证。此脚本不自动读取 Pi CLI 登录、models.json 或 .env。

providers.ts 中的 contextWindow、maxTokens 与兼容选项沿用行政项目；cost 的零值为占位，不代表免费，不用于真实费用统计。

可以传入自己的任务：

```bash
npm start -- "查询学校的差旅报销制度，需要先提供哪些资料？"
```

脚本没有业务工具与制度库。模型只能依据输入回答，不能查询真实校内制度；本例用于验证模型连接、Loop 与流式事件。60 秒后会请求中断，也可以按 Ctrl+C；最终状态为 error 或 aborted 时程序报错并退出。响应内容不要求逐字一致。

分享工程时保留 package-lock.json，排除 node_modules、.env 与真实凭据。

接口依据：[Pi 1.0.0 Agent Core README](https://github.com/earendil-works/pi/blob/7fbbd5f4a1d982bb02d63472dde0774fa639f99b/packages/agent/README.md)。
