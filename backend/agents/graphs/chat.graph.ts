import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { ChatMessage } from "../adapters/routeTypes.js";
import { chatNode } from "../flows/chat/nodes/chatNode.js";
import type { ChatResult } from "../flows/chat/schemas/chatSchema.js";
import { withNodeError } from "../utils/nodeError.js";

interface ChatGraphStateValue {
  messages: ChatMessage[];
  mockConfig: Record<string, boolean>;
  reply?: string;
}

const ChatGraphState = Annotation.Root({
  messages: Annotation<ChatGraphStateValue["messages"]>(),
  mockConfig: Annotation<ChatGraphStateValue["mockConfig"]>(),
  reply: Annotation<ChatGraphStateValue["reply"]>(),
});

export function buildChatAgent() {
  return new StateGraph(ChatGraphState)
    .addNode("chatNode", withNodeError("chatNode", chatNode))
    .addEdge(START, "chatNode")
    .addEdge("chatNode", END)
    .compile();
}

export const buildChatGraph = buildChatAgent;

export type ChatGraphResult = ChatResult;
