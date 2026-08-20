import { SystemMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { ChatMessage } from "../../../adapters/routeTypes.js";
import { CHAT_SYSTEM_PROMPT } from "../prompts/chatPrompts.js";
import {
  ChatResultSchema,
  type ChatResult,
} from "../schemas/chatSchema.js";
import { convertToLangChainMessages } from "../../../adapters/routeHelpers.js";
import { getMainModel } from "../../../utils/model.js";
import { tryExecuteMock } from "../../../utils/mock.js";

interface ChatNodeState {
  messages: ChatMessage[];
  mockConfig: Record<string, boolean>;
}

interface UnknownRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part: unknown): string => {
      if (typeof part === "string") {
        return part;
      }

      if (!isRecord(part)) {
        return "";
      }

      return typeof part.text === "string" ? part.text : "";
    })
    .join("");
}

export async function chatNode(
  state: ChatNodeState,
  config?: RunnableConfig,
): Promise<ChatResult> {
  const mockResult: ChatResult | null = await tryExecuteMock(
    state,
    "chatNode",
    "chatResult.json",
    (data: unknown) => ChatResultSchema.parse(data),
  );
  if (mockResult !== null) {
    return mockResult;
  }

  const prompt = [
    new SystemMessage(CHAT_SYSTEM_PROMPT),
    ...convertToLangChainMessages(state.messages),
  ];
  const stream = await getMainModel().stream(prompt, config);
  let reply = "";

  for await (const chunk of stream) {
    reply += extractTextContent(chunk.content);
  }

  if (reply.trim().length === 0) {
    throw new Error("Chat model returned an empty response");
  }

  return { reply };
}
