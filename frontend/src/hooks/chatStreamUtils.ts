import type { ErrorStreamEvent } from "@/types/api";
import type { StepType } from "@/types/flow";
import { useChatStore } from "@/store/chatStore";
import { NODE_TO_STEP_MAP, STEP_DEFINITIONS } from "@/constants/chat";

export interface ActiveRequest {
  id: number;
  controller: AbortController;
}

export interface TraditionalVersionContext {
  versionNumber: number;
  threadId: string;
  operation: "create" | "edit";
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function getStreamErrorDetails(event: ErrorStreamEvent): {
  node?: string;
  message: string;
} {
  const node = event.data?.node?.trim();
  const message = event.data?.message?.trim() ?? event.message?.trim();

  return {
    node: node ? node : undefined,
    message: message ? message : "未知错误",
  };
}

export function findPendingThoughtKey(
  messageId: string,
  nodeName: string,
): string | undefined {
  const thoughts = useChatStore.getState().messageThoughts[messageId] ?? [];
  const mappedStep = NODE_TO_STEP_MAP[nodeName];
  const strippedNodeName = nodeName.endsWith("Node")
    ? nodeName.slice(0, -"Node".length)
    : undefined;
  const candidateKeys = [nodeName, mappedStep, strippedNodeName].filter(
    (key): key is string => key !== undefined,
  );

  return thoughts.find(
    (thought) =>
      thought.type === "node" &&
      thought.status === "pending" &&
      candidateKeys.includes(thought.key),
  )?.key;
}

export function getFilesPayload(data: unknown): Record<string, string> | undefined {
  if (!isRecord(data) || !isRecord(data.files)) {
    return undefined;
  }

  const fileEntries = Object.entries(data.files);
  if (!fileEntries.every(([, code]) => typeof code === "string")) {
    return undefined;
  }

  return Object.fromEntries(fileEntries) as Record<string, string>;
}

export function getIntentProductName(data: unknown): string | undefined {
  if (!isRecord(data) || !isRecord(data.product)) {
    return undefined;
  }

  return typeof data.product.name === "string"
    ? data.product.name
    : undefined;
}

export function getThoughtDetails(
  type: StepType,
  status: "pending" | "success" | "error",
  data?: unknown,
): { title: string; description: string } {
  const config = STEP_DEFINITIONS[type];
  if (!config) {
    return {
      title: "处理中",
      description: "AI 正在思考...",
    };
  }

  if (status === "pending") {
    return {
      title: config.title,
      description: config.description.pending,
    };
  }

  const successDescription = config.description.success;
  return {
    title: config.title,
    description:
      typeof successDescription === "function"
        ? successDescription(data)
        : successDescription,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
