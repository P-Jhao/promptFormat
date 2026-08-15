import { CapabilitySchema } from "../schemas/capabilitySchema.js";
import { CAPABILITY_SYSTEM_PROMPT } from "../prompts/capabilityPrompts.js";
import { getStructuredModel } from "../../../../utils/model.js";
import { tryExecuteMock } from "../../../../utils/mock.js";
import { withRetry } from "../../../../utils/retry.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export async function capabilityNode(state: any) {
  // 1. 获取单例模型 (使用结构化输出)
  const structuredModel = getStructuredModel(CapabilitySchema);

  // 2. 准备上下文
  // 能力分析强依赖于 Intent 意图分析的结果
  const intentData = state.intent;

  if (!intentData) {
    console.warn("CapabilityNode: No intent data found, skipping.");
    return { capabilities: null };
  }

  // MOCK MODE Handling
  const mockResult = await tryExecuteMock(
    state,
    "capabilityNode",
    "capabilityResult.json",
    "capabilities",
  );
  if (mockResult) return mockResult;

  const intentContext = JSON.stringify(intentData, null, 2);

  // 3. 构建消息
  // 让模型扮演架构师，基于 input (Intent) 输出 output (Capabilities)
  const messages = [
    new SystemMessage(CAPABILITY_SYSTEM_PROMPT),
    new HumanMessage(`请基于以下产品意图进行能力分析：\n${intentContext}`),
  ];

  // 4. 调用模型

  console.log("--- Capability Analysis Head Start ---");

  // 使用重试机制调用模型
  const result = await withRetry(structuredModel, messages, {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.warn(
        `[CapabilityNode] Retry attempt ${attempt} due to:`,
        error.message,
      );
    },
  });

  // console.log("Capability Result:", JSON.stringify(result, null, 2));
  console.log("--- Capability Analysis End ---");

  // 5. 返回更新后的状态
  return {
    capabilities: result,
  };
}
