type UnknownRecord = Record<string, unknown>;
export type SseWriter = (payload: unknown) => boolean;

export interface ChatStreamState {
  mockReplySent: boolean;
  textStreamed: boolean;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractTextContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value)) {
    return "";
  }

  return value
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

function extractMessageDelta(value: unknown): string {
  if (!isRecord(value)) {
    return "";
  }

  return extractTextContent(value.content);
}

function extractMockReply(value: unknown): string {
  if (!isRecord(value)) {
    return "";
  }

  const nodeOutput = value.chatNode;
  if (!isRecord(nodeOutput) || typeof nodeOutput.reply !== "string") {
    return "";
  }

  return nodeOutput.reply;
}

export function processChatStreamChunk(
  chunk: unknown,
  state: ChatStreamState,
  writeSse: SseWriter,
): boolean {
  if (!Array.isArray(chunk) || chunk.length !== 2) {
    console.log("Unexpected chat stream chunk:", chunk);
    return true;
  }

  const streamMode = chunk[0];
  const payload = chunk[1];

  if (
    streamMode === "messages" &&
    Array.isArray(payload) &&
    !state.mockReplySent
  ) {
    const delta = extractMessageDelta(payload[0]);
    if (delta.length === 0) {
      return true;
    }

    state.textStreamed = true;
    return writeSse({ type: "chat", data: { delta } });
  }

  if (
    streamMode === "updates" &&
    !state.mockReplySent &&
    !state.textStreamed
  ) {
    const reply = extractMockReply(payload);
    if (reply.length > 0) {
      state.mockReplySent = true;
      return writeSse({
        type: "chat",
        data: { delta: reply },
      });
    }
  }

  return true;
}
