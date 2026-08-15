import express, { type Request, type Response } from "express";
import { buildAgent } from "../agents/graphs/main.graph.js";
import { resolveRouteAdapter } from "../agents/adapters/routeRegistry.js";
import type { RouteFlow } from "../agents/adapters/routeTypes.js";
import {
  DEFAULT_MOCK_PRESET,
  resolveMockConfig,
  type MockConfig,
} from "../config/mock.js";
import { NodeExecutionError } from "../agents/utils/nodeError.js";
import { NODE_HANDLERS } from "../config/chat.js";
import {
  ChatValidationError,
  parseChatRequest,
} from "./chatValidation.js";
import type { ChatRequestData } from "./chatValidation.js";

const router = express.Router();

type UnknownRecord = Record<string, unknown>;
type FlushableResponse = Response & { flush?: () => void };

const CHAT_REQUEST_TIMEOUT_MS = readPositiveInteger(
  "CHAT_REQUEST_TIMEOUT_MS",
  15 * 60 * 1000,
);
const SSE_HEARTBEAT_INTERVAL_MS = 15 * 1000;

const agents: Record<RouteFlow, ReturnType<typeof buildAgent>> = {
  traditional: buildAgent("traditional"),
};

function readPositiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function isMockConfig(value: unknown): value is MockConfig {
  if (!isRecord(value)) return false;

  const hasGlobal = value.global !== undefined;
  const hasPhases = value.phases !== undefined;
  const hasNodes = value.nodes !== undefined;

  if (hasGlobal && typeof value.global !== "boolean") return false;
  if (hasPhases && !isBooleanRecord(value.phases)) return false;
  if (hasNodes && !isBooleanRecord(value.nodes)) return false;

  return (
    typeof value.global === "boolean" ||
    (hasPhases && Object.keys(value.phases as UnknownRecord).length > 0) ||
    (hasNodes && Object.keys(value.nodes as UnknownRecord).length > 0)
  );
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  let requestData: ChatRequestData | undefined;

  try {
    requestData = parseChatRequest(req.body as unknown);
  } catch (error: unknown) {
    if (error instanceof ChatValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Internal server error" });
    return;
  }

  if (requestData === undefined) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  let stopRequested = false;
  let requestTimedOut = false;
  let streamCompleted = false;
  let sseStarted = false;
  const abortController = new AbortController();

  const handleDisconnect = (): void => {
    stopRequested = true;
    abortController.abort();
  };

  const writeSse = (payload: unknown): boolean => {
    if (stopRequested || res.writableEnded || res.destroyed) {
      return false;
    }

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    (res as FlushableResponse).flush?.();
    return true;
  };

  const sendTimeout = (): void => {
    requestTimedOut = true;
    stopRequested = true;
    abortController.abort();

    if (!res.writableEnded && !res.destroyed) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          data: { message: "Chat generation timed out" },
          message: "Chat generation timed out",
        })}\n\n`,
      );
      res.end();
    }
  };

  req.once("aborted", handleDisconnect);
  res.once("close", handleDisconnect);

  const heartbeat = setInterval(() => {
    if (!stopRequested && !res.writableEnded && !res.destroyed) {
      res.write(": keep-alive\n\n");
      (res as FlushableResponse).flush?.();
    }
  }, SSE_HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  const timeout = setTimeout(sendTimeout, CHAT_REQUEST_TIMEOUT_MS);
  timeout.unref();

  try {
    // Set SSE headers before any stream output so Nginx does not buffer this
    // response as a normal JSON request.
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    sseStarted = true;

    const {
      messages,
      mockConfig: userMockConfig,
      projectId,
    } = requestData;
    console.log("Received messages count:", messages.length);

    // MOCK_MODE=true 时后端强制全局 Mock；否则使用客户端传入的有效配置。
    const clientMockConfig = isMockConfig(userMockConfig)
      ? userMockConfig
      : undefined;
    const mockConfigInput: MockConfig =
      process.env.MOCK_MODE === "true"
        ? { global: true }
        : clientMockConfig ?? DEFAULT_MOCK_PRESET;
    const mockConfig = resolveMockConfig(mockConfigInput);

    const routeResult = await resolveRouteAdapter({ messages, mockConfig });
    console.log(`📝 [Route] 使用 ${routeResult.flow} 流程`);
    console.log("Using mockConfig:", JSON.stringify(mockConfig));

    if (stopRequested || res.writableEnded || res.destroyed) {
      return;
    }
    res.write(": keep-alive\n\n");
    (res as FlushableResponse).flush?.();

    const threadId =
      projectId ??
      `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.log("Using thread_id (projectId):", threadId);

    const config = {
      configurable: { thread_id: threadId },
      streamMode: "updates" as const,
      signal: abortController.signal,
    };

    const agent = agents[routeResult.flow];
    const stream = await agent.stream(routeResult.input, config);

    for await (const chunk of stream) {
      if (stopRequested) {
        break;
      }

      if (!isRecord(chunk)) {
        console.log("Unexpected stream chunk:", chunk);
        continue;
      }

      const chunkRecord: UnknownRecord = chunk as UnknownRecord;
      const nodeName = Object.keys(chunkRecord)[0];
      if (nodeName === undefined) {
        console.log("Empty stream chunk");
        continue;
      }

      const output = chunkRecord[nodeName];
      if (!isRecord(output)) {
        console.log("Empty output for node:", nodeName);
        continue;
      }

      const handler = NODE_HANDLERS[nodeName];
      if (handler === undefined) {
        console.log(`Unknown node update: ${nodeName}`);
        continue;
      }

      const payload = output[handler.key];
      if (
        !writeSse({
          type: handler.type,
          data: payload,
        })
      ) {
        break;
      }
    }

    streamCompleted = !stopRequested && !requestTimedOut;
  } catch (error: unknown) {
    if (stopRequested || requestTimedOut) {
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
      return;
    }

    console.error("Error processing chat:", error);
    const node = error instanceof NodeExecutionError ? error.node : "unknown";
    const message =
      error instanceof Error ? error.message : "Internal server error";

    if (!sseStarted) {
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    writeSse({
      type: "error",
      data: { node, message },
      message,
    });
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
    return;
  } finally {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    req.removeListener("aborted", handleDisconnect);
    res.removeListener("close", handleDisconnect);
  }

  if (streamCompleted && !res.writableEnded && !res.destroyed) {
    writeSse({ type: "done" });
    res.end();
  }
});

export default router;
