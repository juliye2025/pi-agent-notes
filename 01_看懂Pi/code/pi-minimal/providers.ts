import { createModels, createProvider, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

// 与行政 Agent 的 providers.ts 使用同一装配路径；省去中转 provider。
export function buildModels() {
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const modelId = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  const model: Model<"openai-completions"> = {
    id: modelId,
    name: "DeepSeek 对话",
    api: "openai-completions",
    provider: "deepseek",
    baseUrl,
    reasoning: false,
    input: ["text"],
    // 沿用项目配置；零价格为占位值，不能用来计算真实费用。
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 32000,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
      supportsStore: false,
    },
  };
  const models = createModels();
  models.setProvider(createProvider({
    id: "deepseek",
    name: "DeepSeek",
    baseUrl,
    auth: { apiKey: envApiKeyAuth("DeepSeek API key", ["DEEPSEEK_API_KEY"]) },
    models: [model],
    api: openAICompletionsApi(),
  }));
  return { models, model: models.getModel("deepseek", modelId)! };
}
