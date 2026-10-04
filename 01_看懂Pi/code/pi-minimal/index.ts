import { Agent } from "@earendil-works/pi-agent-core";
import { buildModels } from "./providers.ts";

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error("请在当前终端设置 DEEPSEEK_API_KEY，再运行 npm start。");
}
const { models, model } = buildModels();
const agent = new Agent({
  initialState: {
    systemPrompt: "你是一个行政助手，用中文简短回答；没有制度资料时说明需要补充依据。",
    model,
    tools: [],
  },
  streamFn: models.streamSimple.bind(models),
});
const unsubscribe = agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});
const stop = () => agent.abort();
process.once("SIGINT", stop);
const timeout = setTimeout(stop, 60_000);
try {
  await agent.prompt(process.argv[2] ?? "查询学校的差旅报销制度，需要先提供哪些资料？");
  const last = agent.state.messages.filter((m) => m.role === "assistant").at(-1);
  if (!last || ["error", "aborted"].includes(last.stopReason)) {
    throw new Error(last?.errorMessage ?? "本次请求未正常完成，请检查连接或中断状态。");
  }
  console.log();
} finally {
  clearTimeout(timeout);
  process.removeListener("SIGINT", stop);
  unsubscribe();
}
