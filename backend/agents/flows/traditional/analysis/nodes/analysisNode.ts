import { AnalysisSchema } from "../schemas/analysisSchema.js";
import { ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysisPrompts.js";
import { getStructuredModel } from "../../../../utils/model.js";
import { tryExecuteMock } from "../../../../utils/mock.js";
import { withRetry } from "../../../../utils/retry.js";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";

// 辅助函数：将前端消息格式转换为 LangChain 消息对象
// 注意：只转换文字内容，不处理图片/设计稿（那是适配器的工作）
async function convertToLangChainMessages(
  rawMessages: any[],
): Promise<BaseMessage[]> {
  return rawMessages.map((msg) => {
    // 只提取文字内容，忽略附件
    const textContent =
      typeof msg.content === "string" && msg.content.trim()
        ? msg.content
        : "用户上传了附件";

    if (msg.role === "user") {
      return new HumanMessage(textContent);
    } else {
      return new AIMessage(textContent);
    }
  });
}

export const analysisNode = async (state: any) => {
  // MOCK MODE Handling
  const mockResult = await tryExecuteMock(
    state,
    "analysisNode",
    "analysisResult.json",
    "analysis",
  );
  if (mockResult) {
    return {
      ...mockResult,
      skipGeneration:
        mockResult.analysis?.type === "QA" ||
        mockResult.analysis?.type === "CHIT_CHAT",
    };
  }

  const structuredModel = getStructuredModel(AnalysisSchema);

  let messages: BaseMessage[] = [];

  // 检查并处理消息（仅文本，输入来源分流由路由层处理）
  if (state.messages && Array.isArray(state.messages)) {
    const lastMsg = state.messages[state.messages.length - 1];
    // 转换消息（只包含文字，不包含附件）
    messages = await convertToLangChainMessages([lastMsg]);
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
  console.log("📊 [AnalysisNode] 用户意图:", result.type);

  return {
    analysis: result,
    skipGeneration: result.type === "QA" || result.type === "CHIT_CHAT",
  };
};
