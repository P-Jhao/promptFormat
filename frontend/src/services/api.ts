// API 请求封装
import { ChatMessage } from "@/types/message";
import type {
  StreamErrorData,
  StreamEvent,
} from "@/types/api";
import type { MockConfig } from "@/types/mock";
import type { BackendFlowType, StepType } from "@/types/flow";
import { apiUrl } from "@/constants/config";

const STREAM_STEP_TYPES: readonly StepType[] = [
  "analysis",
  "intent",
  "capabilities",
  "ui",
  "components",
  "structure",
  "dependency",
  "types",
  "utils",
  "mockData",
  "service",
  "hooks",
  "componentsCode",
  "pagesCode",
  "layouts",
  "styles",
  "app",
  "files",
  "figmaRawCode",
  "figmaImageProcessed",
  "figmaAstParsed",
  "figmaBlockExtract",
  "figmaGeometryGroup",
  "figmaSectionNaming",
  "figmaComponentGen",
  "figmaAssembly",
];

export async function getReactTS_Template(): Promise<
  Record<string, { code: string }>
> {
  const response = await fetch(apiUrl("/template/react-ts"));
  if (!response.ok) {
    throw new Error("Failed to fetch template");
  }
  return response.json();
}

/**
 * generateApp (Stream)
 *
 * 调用后端 /api/chat 接口 (SSE模式)
 * 职责：
 * - 发送对话上下文和项目 ID
 * - 处理 SSE 流式响应，回调 onChunk 更新状态
 */
export async function generateAppStream(
  params: {
    messages: ChatMessage[];
    projectId?: string;
    mockConfig: MockConfig;
  },
  onChunk: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  try {
    if (signal?.aborted) {
      return;
    }

    const response = await fetch(apiUrl("/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      signal,
      body: JSON.stringify({
        messages: params.messages,
        projectId: params.projectId, // 传递项目 ID
        mockConfig: params.mockConfig,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    const cancelReader = () => {
      void reader.cancel().catch(() => undefined);
    };

    signal?.addEventListener("abort", cancelReader, { once: true });
    if (signal?.aborted) {
      cancelReader();
    }

    try {
      while (true) {
        if (signal?.aborted) {
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        // 解码当前块
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 处理 buffer 中的完整事件。Nginx/Node 可能使用 LF 或 CRLF。
        const lines = buffer.split(/\r?\n\r?\n/);
        // 保留最后一个可能不完整的部分存回 buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (signal?.aborted) {
            return;
          }

          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event: unknown = JSON.parse(jsonStr);
              if (!isStreamEvent(event)) {
                console.warn("Invalid SSE message:", jsonStr);
                continue;
              }

              console.log("[Stream] Parsed event:", event.type);
              onChunk(event);
            } catch (error) {
              console.warn("Failed to parse SSE message:", jsonStr, error);
            }
          }
        }
      }
    } finally {
      signal?.removeEventListener("abort", cancelReader);
      reader.releaseLock();
    }
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return;
    }

    console.error("Stream error:", error);
    onChunk({
      type: "error",
      data: {
        message: error instanceof Error ? error.message : "Network error",
      },
    });
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isStreamEvent(value: unknown): value is StreamEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "flow") {
    return isRecord(value.data) && isBackendFlowType(value.data.flow);
  }

  if (value.type === "chat") {
    return isRecord(value.data) && typeof value.data.delta === "string";
  }

  if (value.type === "error") {
    return value.data === undefined || isStreamErrorData(value.data);
  }

  if (value.type === "done") {
    return true;
  }

  return isStepType(value.type);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBackendFlowType(value: unknown): value is BackendFlowType {
  return value === "traditional" || value === "chat";
}

function isStepType(value: unknown): value is StepType {
  return (
    typeof value === "string" &&
    STREAM_STEP_TYPES.includes(value as StepType)
  );
}

function isStreamErrorData(value: unknown): value is StreamErrorData {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.node === undefined || typeof value.node === "string") &&
    (value.message === undefined || typeof value.message === "string")
  );
}

/**
 * generateApp (Legacy) - 已废弃，提醒迁移
 */
export async function generateApp(): Promise<{ message: string }> {
  throw new Error("generateApp is deprecated. Use generateAppStream instead.");
}
