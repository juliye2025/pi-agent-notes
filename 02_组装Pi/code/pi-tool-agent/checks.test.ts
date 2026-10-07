import assert from "node:assert/strict";
import { test } from "node:test";
import { Agent } from "@earendil-works/pi-agent-core";
import { createModels, fauxProvider, fauxAssistantMessage } from "@earendil-works/pi-ai";
import { buildRetrieveTool } from "./tools.ts";
import { keepRecentRequests } from "./context.ts";
import { parseAnswer } from "./contract.ts";

async function runCase(args: Record<string, unknown>, empty = false) {
  const models = createModels();
  const faux = fauxProvider({ tokensPerSecond: 100_000 });
  models.setProvider(faux.provider);
  faux.setResponses([
    fauxAssistantMessage([{ type: "toolCall", id: "call-1", name: "retrieve_documents", arguments: args }], { stopReason: "toolUse" }),
    fauxAssistantMessage("本地模拟最终回答"),
  ]);
  const evidence = new Map<string, string>();
  const agent = new Agent({
    initialState: { systemPrompt: "本地验证", model: faux.getModel(), tools: [buildRetrieveTool(evidence, empty)] },
    streamFn: models.streamSimple.bind(models),
    transformContext: keepRecentRequests,
  });
  const events: string[] = [];
  agent.subscribe(e => { events.push(e.type); });
  await agent.prompt("差旅");
  return { agent, evidence, events, faux };
}
test("实际 Loop：工具结果进入历史，再发起下一轮模型回复", async () => {
  const { agent, evidence, events } = await runCase({ query: "差旅" });
  assert.equal(evidence.size, 2);
  assert.equal(agent.state.messages.filter(m => m.role === "assistant").length, 2);
  const result = agent.state.messages.find(m => m.role === "toolResult");
  assert.equal(result?.isError, false);
  assert.ok(JSON.stringify(result?.content).includes("demo-travel-01"));
  assert.equal(events.filter(e => e === "turn_start").length, 2);
  assert.equal(events.at(-1), "agent_end");
});
test("空结果是成功查询，非法参数被 schema 拦截", async () => {
  const empty = await runCase({ query: "差旅" }, true);
  assert.equal(empty.evidence.size, 0);
  assert.equal(empty.agent.state.messages.find(m => m.role === "toolResult")?.isError, false);
  const invalid = await runCase({ query: "差旅", top_k: 99 });
  assert.equal(invalid.evidence.size, 0);
  assert.equal(invalid.agent.state.messages.find(m => m.role === "toolResult")?.isError, true);
});
test("已取消时不执行查询、不登记证据", async () => {
  const controller = new AbortController();
  controller.abort(new Error("模拟截止时间"));
  const evidence = new Map<string, string>();
  await assert.rejects(buildRetrieveTool(evidence).execute("test", { query: "差旅" }, controller.signal), /模拟截止时间/);
  assert.equal(evidence.size, 0);
});
test("Context 保留 system 和最后三个完整请求组", async () => {
  const { agent, faux } = await runCase({ query: "差旅" });
  for (let i = 2; i <= 4; i++) {
    faux.appendResponses([
      fauxAssistantMessage([{ type: "toolCall", id: `call-${i}`, name: "retrieve_documents", arguments: { query: "差旅" } }], { stopReason: "toolUse" }),
      fauxAssistantMessage(`回答${i}`),
    ]);
    await agent.prompt(`问题${i}`);
  }
  const original = agent.state.messages;
  const kept = await keepRecentRequests(original);
  assert.deepEqual(kept.filter(m => m.role === "system"), original.filter(m => m.role === "system"));
  assert.deepEqual(kept.filter(m => m.role === "user").map(m =>
    typeof m.content === "string" ? m.content : m.content.filter(c => c.type === "text").map(c => c.text).join("")
  ), ["问题2", "问题3", "问题4"]);
  const calls = kept.flatMap(m => m.role === "assistant" ? m.content.filter(c => c.type === "toolCall").map(c => c.id) : []);
  const results = kept.filter(m => m.role === "toolResult").map(m => m.toolCallId);
  assert.deepEqual(calls, ["call-2", "call-3", "call-4"]);
  assert.deepEqual(results, calls);
  assert.equal(agent.state.messages.filter(m => m.role === "user").length, 4);
});
test("拒绝缺字段、假引用、伪造引文和缺少依据的回答", () => {
  const evidence = new Map([["demo-travel-01", "差旅报销需提交审批单、交通票据和住宿票据。"]]);
  const valid = { status: "answered", answer: "请准备审批单。", citations: [{ id: "demo-travel-01", quote: "审批单" }] };
  assert.equal(parseAnswer(JSON.stringify(valid), evidence).status, "answered");
  assert.throws(() => parseAnswer('{"answer":"文字"}', evidence));
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, citations: [{ id: "fake", quote: "审批单" }] }), evidence));
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, citations: [{ id: "demo-travel-01", quote: "发票复印件" }] }), evidence));
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, citations: [] }), evidence));
  assert.throws(() => parseAnswer("说明：" + JSON.stringify(valid), evidence));
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, answer: " " }), evidence));
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, citations: [{ id: "demo-travel-01", quote: " " }] }), evidence));
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, extra: true }), evidence));
  assert.equal(parseAnswer("```json\n" + JSON.stringify(valid) + "\n```", evidence).status, "answered");
  assert.equal(parseAnswer(JSON.stringify({ status: "insufficient_evidence", answer: "未找到匹配条款", citations: [] }), new Map()).status, "insufficient_evidence");
  assert.throws(() => parseAnswer(JSON.stringify({ ...valid, status: "insufficient_evidence" }), evidence));
});
test("同一 Turn 的两个调用执行后，下一轮才向模型返回结果", async () => {
  const models = createModels();
  const faux = fauxProvider({ tokensPerSecond: 100_000 });
  models.setProvider(faux.provider);
  const evidence = new Map<string, string>();
  const answer = { status: "answered", answer: "还需会议通知。", citations: [{ id: "demo-travel-02", quote: "还需提交会议通知" }] };
  faux.setResponses([
    fauxAssistantMessage([
      { type: "text", text: "我查一下" },
      ...[1, 2].map(i => ({ type: "toolCall" as const, id: `call-${i}`, name: "retrieve_documents", arguments: { query: "差旅" } })),
    ], { stopReason: "toolUse" }),
    context => {
      assert.equal(context.messages.filter(m => m.role === "toolResult").length, 2);
      return fauxAssistantMessage(JSON.stringify(answer));
    },
  ]);
  const agent = new Agent({
    initialState: { systemPrompt: "本地检查", model: faux.getModel(), tools: [buildRetrieveTool(evidence)] },
    streamFn: models.streamSimple.bind(models), toolExecution: "sequential",
  });
  const events: string[] = [];
  agent.subscribe(e => { events.push(e.type); });
  await agent.prompt("差旅");
  assert.equal(faux.state.callCount, 2);
  assert.equal(events.filter(e => e === "turn_start").length, 2);
  const firstEnd = events.indexOf("turn_end");
  assert.equal(events.slice(0, firstEnd).filter(e => e === "tool_execution_start").length, 2);
  const last = agent.state.messages.filter(m => m.role === "assistant").at(-1)!;
  const text = last.content.filter(c => c.type === "text").map(c => c.text).join("");
  assert.equal(parseAnswer(text, evidence).answer, answer.answer);
});
