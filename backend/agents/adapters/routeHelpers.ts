/**
 * 路由层适配器共享工具函数
 */

import {
  AIMessage,
  BaseMessage,
  HumanMessage,
} from "@langchain/core/messages";
import type { ChatMessage } from "./routeTypes.js";

export function getLastMessage(
  messages: readonly ChatMessage[],
): ChatMessage | undefined {
  if (messages.length === 0) return undefined;
  return messages[messages.length - 1];
}

export function getLastText(messages: readonly ChatMessage[]): string {
  const lastMsg = getLastMessage(messages);
  return typeof lastMsg?.content === "string" ? lastMsg.content : "";
}

export function isModificationRequest(messages: readonly ChatMessage[]): boolean {
  const content = getLastText(messages).toLowerCase();
  if (!content) return false;
  const keywords = [
    "modify",
    "update",
    "refactor",
    "change",
    "修改",
    "改一下",
    "优化",
    "重构",
    "在现有",
    "基于当前",
  ];
  return keywords.some((k) => content.includes(k));
}

/**
 * 避免“只发了链接”被误判为普通文本 prompt；只有去掉链接后仍有文字内容，才算 prompt 请求。
 * @param messages
 * @returns
 */
// 判断最后一条消息是否包含文本提示（去除URL链接后）
export function hasTextPrompt(messages: readonly ChatMessage[]): boolean {
  // 取最后一条消息文本
  const content = getLastText(messages);
  // 去除URL链接后的文本长度
  const textWithoutUrls = content.replace(/https?:\/\/\S+/g, "").trim();
  // 如果去除URL后的文本长度大于0，说明有文本提示
  return textWithoutUrls.length > 0;
}

export function hasImageAttachment(messages: readonly ChatMessage[]): boolean {
  const lastMsg = getLastMessage(messages);
  return (
    lastMsg?.attachments?.some(
      (attachment) =>
        attachment.type === "image" &&
        typeof attachment.url === "string" &&
        attachment.url.length > 0,
    ) ?? false
  );
}

/**
 * 将入口消息转换为 LangChain 消息，并保留现有附件占位行为。
 * 附件内容不会直接传给文本模型；没有文本的消息使用统一占位文本。
 */
export function convertToLangChainMessages(
  messages: readonly ChatMessage[],
): BaseMessage[] {
  return messages.map((message, index) => {
    const textContent =
      typeof message.content === "string" && message.content.trim().length > 0
        ? message.content
        : message.role === "assistant"
          ? "助手未返回文本内容"
          : "用户上传了附件";

    if (message.role === "user") {
      return new HumanMessage(textContent);
    }

    if (message.role === "assistant") {
      return new AIMessage(textContent);
    }

    throw new Error(`Unsupported chat message role at index ${index}`);
  });
}
