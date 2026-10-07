import { Type } from "typebox";
import { Value } from "typebox/value";

const citation = Type.Object({
  id: Type.String({ minLength: 1 }), quote: Type.String({ minLength: 1 }),
}, { additionalProperties: false });
export const answerSchema = Type.Object({
  status: Type.Union([Type.Literal("answered"), Type.Literal("insufficient_evidence")]),
  answer: Type.String({ minLength: 1 }),
  citations: Type.Array(citation),
}, { additionalProperties: false });

export function parseAnswer(text: string, evidence: Map<string, string>) {
  // 只接受单个 JSON 值；兼容包住整个值的 Markdown 围栏。
  const cleaned = text.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/, "$1");
  const parsed: unknown = JSON.parse(cleaned);
  if (!Value.Check(answerSchema, parsed)) throw new Error("输出字段不符合合约");
  if (!parsed.answer.trim() || parsed.citations.some(c => !c.id.trim() || !c.quote.trim())) {
    throw new Error("回答和引用不得只包含空白字符");
  }
  if (parsed.status === "answered" && parsed.citations.length === 0) throw new Error("回答缺少依据");
  if (parsed.status === "insufficient_evidence" && parsed.citations.length !== 0) throw new Error("证据不足时不得返回引用");
  for (const c of parsed.citations) {
    const original = evidence.get(c.id);
    if (!original || !original.includes(c.quote)) throw new Error("引用 ID 或引文不在本次检索结果中");
  }
  return parsed;
}
