import type { AgentMessage } from "@earendil-works/pi-agent-core";

// 本例没有运行中追加输入；按 user 分组，保留模型回复及对应工具结果。
// system 消息承载 Pi 1.0 的指令/工具声明，全部保留。
export async function keepRecentRequests(messages: AgentMessage[]): Promise<AgentMessage[]> {
  const starts = messages.flatMap((m, i) => m.role === "user" ? [i] : []);
  if (starts.length <= 3) return messages;
  const cut = starts.at(-3)!;
  return messages.filter((m, i) => m.role === "system" || i >= cut);
}
