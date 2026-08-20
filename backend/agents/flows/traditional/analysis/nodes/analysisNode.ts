import { AnalysisSchema } from "../schemas/analysisSchema.js";
import { ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysisPrompts.js";
import { getStructuredModel } from "../../../../utils/model.js";
import { tryExecuteMock } from "../../../../utils/mock.js";
import { withRetry } from "../../../../utils/retry.js";
import type { AnalysisResult } from "../schemas/analysisSchema.js";
import {
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import type { ChatMessage } from "../../../../adapters/routeTypes.js";
import { convertToLangChainMessages } from "../../../../adapters/routeHelpers.js";

interface AnalysisNodeState {
  messages: ChatMessage[];
  mockConfig: Record<string, boolean>;
}

interface AnalysisNodeResult {
  analysis: AnalysisResult;
}

export const analysisNode = async (
  state: AnalysisNodeState,
): Promise<AnalysisNodeResult> => {
  // MOCK MODE Handling
  const mockResult = await tryExecuteMock(
    state,
    "analysisNode",
    "analysisResult.json",
    (data: unknown) => ({ analysis: AnalysisSchema.parse(data) }),
  );
  if (mockResult !== null) {
    return mockResult as AnalysisNodeResult;
  }

  const structuredModel = getStructuredModel(AnalysisSchema);

  let messages: BaseMessage[] = [];

  // 检查并处理消息（仅文本，输入来源分流由路由层处理）
  if (state.messages && Array.isArray(state.messages)) {
    const lastMsg = state.messages[state.messages.length - 1];
    // 转换消息（只包含文字，不包含附件）
    messages = convertToLangChainMessages([lastMsg]);
  }

  const prompt = [new SystemMessage(ANALYSIS_SYSTEM_PROMPT), ...messages];

  console.log("\n📋 [AnalysisNode] 开始意图分析（输入来源已由路由层处理）");

  console.log("--- User Message Analysis Start ---");

  // 使用重试机制调用模型
  const result = await withRetry(structuredModel, prompt, {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.warn(
        `[AnalysisNode] Retry attempt ${attempt} due to:`,
        error.message,
      );
    },
  });

  console.log("--- User Message Analysis End ---");
  console.log("📊 [AnalysisNode] 用户需求分析完成");

  return {
    analysis: AnalysisSchema.parse(result),
  };
};
