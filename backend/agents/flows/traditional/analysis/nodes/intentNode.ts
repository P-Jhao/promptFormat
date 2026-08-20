import { IntentSchema } from "../schemas/intentSchema.js";
import { IntentPrompts } from "../prompts/intentPrompts.js";
import { getStructuredModel } from "../../../../utils/model.js";
import { tryExecuteMock } from "../../../../utils/mock.js";
import { withRetry } from "../../../../utils/retry.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { ChatMessage } from "../../../../adapters/routeTypes.js";

interface IntentNodeState {
  analysis?: {
    summary?: string;
    tags?: string[];
    designAnalysis?: string | null;
  };
  messages?: ChatMessage[];
  mockConfig: Record<string, boolean>;
}

export async function intentNode(state: IntentNodeState) {

  // MOCK MODE Handling
  const mockResult = await tryExecuteMock(
    state,
    "intentNode",
    "intentResult.json",
    "intent",
  );
  if (mockResult) return mockResult;

  // 1. 获取单例模型 (使用结构化输出)
  const structuredModel = getStructuredModel(IntentSchema);

  // 2. 准备上下文
  // 我们结合用户的原始需求 (analysis.summary) 和可能的补充信息
  const analysisSummary = state.analysis?.summary || "用户未提供有效信息";
  const analysisTags = state.analysis?.tags?.join(", ") || "";

  // 如果有设计稿分析，也带上
  const designContext = state.analysis?.designAnalysis
    ? `\n\n[关联的设计稿分析]: ${state.analysis.designAnalysis}`
    : "";

  const contextMessage = `用户需求总结: ${analysisSummary}\n关键标签: ${analysisTags}${designContext}`;

  // 3. 构建 Prompt
  const prompt = [
    new SystemMessage(IntentPrompts),
    new HumanMessage(contextMessage),
  ];

  // 4. 调用模型

  console.log("--- User Intent Analysis Head Start ---");

  // 使用重试机制调用模型
  const result = await withRetry(structuredModel, prompt, {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.warn(
        `[IntentNode] Retry attempt ${attempt} due to:`,
        error.message,
      );
    },
  });

  // console.log("Intent Result:", JSON.stringify(result, null, 2));
  console.log("--- User Intent Analysis End ---");

  // 5. 返回结果
  return {
    intent: result,
  };
}
