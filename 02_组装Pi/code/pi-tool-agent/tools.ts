import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";

// 教学用虚构条款，不代表任何学校的正式制度。
const documents = [
  { id: "demo-travel-01", title: "演示差旅制度", text: "差旅报销需提交审批单、交通票据和住宿票据。", tag: "差旅" },
  { id: "demo-travel-02", title: "演示差旅制度", text: "参加会议的差旅报销，还需提交会议通知。", tag: "差旅" },
];
export const retrieveSchema = Type.Object({
  query: Type.String({ minLength: 1, maxLength: 200 }),
  top_k: Type.Optional(Type.Integer({ minimum: 1, maximum: 3 })),
}, { additionalProperties: false });

export function buildRetrieveTool(evidence: Map<string, string>, empty = false): AgentTool<typeof retrieveSchema> {
  return {
    name: "retrieve_documents",
    label: "检索演示制度",
    description: "查询演示差旅制度，返回条款 ID、标题和原文；查不到时返回空列表。",
    parameters: retrieveSchema,
    execute: async (_id, { query, top_k = 2 }, signal) => {
      signal?.throwIfAborted();
      const hits = empty ? [] : documents.filter(d => query.includes(d.tag)).slice(0, top_k);
      for (const d of hits) evidence.set(d.id, d.text);
      return {
        content: [{ type: "text", text: JSON.stringify({ documents: hits.map(({ tag, ...d }) => d) }) }],
        details: { count: hits.length },
      };
    },
  };
}
