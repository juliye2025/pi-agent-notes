import assert from "node:assert/strict";
import { Agent } from "@earendil-works/pi-agent-core";
import { fauxProvider, fauxAssistantMessage } from "@earendil-works/pi-ai";
import { buildModels } from "./providers.ts";

// 只核对安装与对象装配，不请求远程模型、不读取凭据。
const { models, model } = buildModels();
assert.ok(model, "示例模型必须注册成功");
const agent = new Agent({
  initialState: { systemPrompt: "本地检查", model, tools: [] },
  streamFn: models.streamSimple.bind(models),
});
assert.equal(agent.state.model.id, process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash");
assert.equal(agent.state.model.provider, "deepseek");
assert.equal(agent.state.model.api, "openai-completions");
assert.equal(agent.state.model.baseUrl, process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com");
assert.equal(agent.state.tools.length, 0);
assert.equal(agent.state.isStreaming, false);
const unsubscribe = agent.subscribe(() => {});
unsubscribe();
const faux = fauxProvider({ tokensPerSecond: 100_000 });
models.setProvider(faux.provider);
faux.setResponses([fauxAssistantMessage("本地流式检查通过。")]);
const simulated = new Agent({
  initialState: { systemPrompt: "本地检查", model: faux.getModel(), tools: [] },
  streamFn: models.streamSimple.bind(models),
});
const events = [];
let streamed = "";
const stopListening = simulated.subscribe((event) => {
  events.push(event.type);
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    streamed += event.assistantMessageEvent.delta;
  }
});
await simulated.prompt("检查事件流");
assert.equal(streamed, "本地流式检查通过。");
assert.equal(events[0], "agent_start");
assert.equal(events.at(-1), "agent_end");
assert.ok(events.includes("turn_end"));
assert.equal(simulated.state.isStreaming, false);
assert.equal(simulated.state.messages.at(-1).stopReason, "stop");
stopListening();
console.log("PASS：1.0.0 导入、模型查询、Agent 装配及模拟流式 Loop；未调用远程模型。");
