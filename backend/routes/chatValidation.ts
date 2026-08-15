import type {
  ChatAttachment,
  ChatMessage,
} from "../agents/adapters/routeTypes.js";

export const CHAT_LIMITS = {
  maxMessages: 24,
  maxMessageCharacters: 12_000,
  maxTotalCharacters: 60_000,
  maxProjectIdCharacters: 128,
  maxAttachmentsPerMessage: 4,
  maxAttachmentUrlCharacters: 2_048,
} as const;

export interface ChatRequestData {
  messages: ChatMessage[];
  projectId?: string;
  mockConfig: unknown;
}

export class ChatValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ChatValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProjectId(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ChatValidationError("projectId must be a string");
  }

  const projectId = value.trim();
  if (projectId.length === 0) {
    throw new ChatValidationError("projectId must not be empty");
  }

  if (projectId.length > CHAT_LIMITS.maxProjectIdCharacters) {
    throw new ChatValidationError("projectId is too long");
  }

  if (!/^[A-Za-z0-9._:-]+$/.test(projectId)) {
    throw new ChatValidationError("projectId contains unsupported characters");
  }

  return projectId;
}

function readAttachments(value: unknown): ChatAttachment[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ChatValidationError("attachments must be an array");
  }

  if (value.length > CHAT_LIMITS.maxAttachmentsPerMessage) {
    throw new ChatValidationError("Too many attachments in one message");
  }

  return value.map((attachment, index): ChatAttachment => {
    if (!isRecord(attachment)) {
      throw new ChatValidationError(`attachments[${index}] must be an object`);
    }

    if (attachment.type !== "image") {
      throw new ChatValidationError(
        `attachments[${index}].type must be image`,
      );
    }

    if (typeof attachment.url !== "string") {
      throw new ChatValidationError(`attachments[${index}].url must be a string`);
    }

    const url = attachment.url.trim();
    if (
      url.length === 0 ||
      url.length > CHAT_LIMITS.maxAttachmentUrlCharacters
    ) {
      throw new ChatValidationError(`attachments[${index}].url is invalid`);
    }

    return { type: "image", url };
  });
}

function readMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    throw new ChatValidationError("messages must be an array");
  }

  if (value.length === 0 || value.length > CHAT_LIMITS.maxMessages) {
    throw new ChatValidationError(
      `messages must contain between 1 and ${CHAT_LIMITS.maxMessages} items`,
    );
  }

  let totalCharacters = 0;
  const messages = value.map((message, index): ChatMessage => {
    if (!isRecord(message)) {
      throw new ChatValidationError(`messages[${index}] must be an object`);
    }

    if (message.role !== "user" && message.role !== "assistant") {
      throw new ChatValidationError(
        `messages[${index}].role must be user or assistant`,
      );
    }

    if (typeof message.content !== "string") {
      throw new ChatValidationError(
        `messages[${index}].content must be a string`,
      );
    }

    if (message.content.length > CHAT_LIMITS.maxMessageCharacters) {
      throw new ChatValidationError(`messages[${index}].content is too long`);
    }

    totalCharacters += message.content.length;
    if (totalCharacters > CHAT_LIMITS.maxTotalCharacters) {
      throw new ChatValidationError("The total message content is too long");
    }

    const attachments = readAttachments(message.attachments);
    return attachments === undefined
      ? { role: message.role, content: message.content }
      : { role: message.role, content: message.content, attachments };
  });

  const hasUserPrompt = messages.some(
    (message) =>
      message.role === "user" &&
      typeof message.content === "string" &&
      message.content.trim().length > 0,
  );
  if (!hasUserPrompt) {
    throw new ChatValidationError("At least one non-empty user message is required");
  }

  return messages;
}

export function parseChatRequest(body: unknown): ChatRequestData {
  if (!isRecord(body)) {
    throw new ChatValidationError("Request body must be a JSON object");
  }

  return {
    messages: readMessages(body.messages),
    projectId: readProjectId(body.projectId),
    mockConfig: body.mockConfig,
  };
}
