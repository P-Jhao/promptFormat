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

const router = express.Router();

type UnknownRecord = Record<string, unknown>;
type FlushableResponse = Response & { flush?: () => void };

const agents: Record<RouteFlow, ReturnType<typeof buildAgent>> = {
  traditional: buildAgent("traditional"),
};

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

router.post("/", async (req: Request, res: Response) => {
  // 设置 SSE 响应头
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform"); // no-transform 防止压缩
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // 禁用 Nginx 等代理缓冲

  // 立即发送头部
  res.flushHeaders();

  let streamCompleted = false;

  try {
    const { messages, mockConfig: userMockConfig, projectId } = req.body;
    console.log("Received messages count:", messages?.length);

    // MOCK_MODE=true 时后端强制全局 Mock；否则使用客户端传入的有效配置。
    const clientMockConfig = isMockConfig(userMockConfig)
      ? userMockConfig
      : undefined;
    const mockConfigInput: MockConfig =
      process.env.MOCK_MODE === "true"
        ? { global: true }
        : clientMockConfig ?? DEFAULT_MOCK_PRESET;
    const mockConfig = resolveMockConfig(mockConfigInput);

    // ========== 路由适配层：统一处理输入 ==========
    const routeResult = await resolveRouteAdapter({ messages, mockConfig });
    console.log(`📝 [Route] 使用 ${routeResult.flow} 流程`);
    console.log("Using mockConfig:", JSON.stringify(mockConfig));

    // 发送初始为了建立连接的注释包（某些浏览器/代理需要先收到数据才认为连接成功）
    res.write(": keep-alive\n\n");

    // 使用 projectId 作为 thread_id 实现项目隔离
    const threadId =
      projectId ||
      `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    console.log("Using thread_id (projectId):", threadId);

    const config = {
      configurable: { thread_id: threadId },
      streamMode: "updates" as const,
    };

    // ========== 选择 Agent 并构造输入 ==========
    const agent = agents[routeResult.flow];
    const input = routeResult.input;

    // 使用 stream 而不是 invoke
    // streamMode: "updates" 会返回并通过 yield 输出每个节点的更新
    const stream = await agent.stream(input, config);

    for await (const chunk of stream) {
      if (!isRecord(chunk)) {
        console.log("Unexpected stream chunk:", chunk);
        continue;
      }

      const chunkRecord = chunk as UnknownRecord;
      console.log("Chunk received keys:", Object.keys(chunkRecord));

      // LangGraph 的 stream 块通常是 { [nodeName]: nodeOutput }
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

      console.log("Processing node:", nodeName);
      console.log("\n");

      // 使用策略表处理节点输出
      const handler = NODE_HANDLERS[nodeName];

      if (!handler) {
        console.log(`Unknown node update: ${nodeName}`);
        continue;
      }

      const eventType = handler.type;
      const payload = output[handler.key];

      // 构造 SSE 消息
      // 格式: data: {JSON}\n\n
      const sseMessage = JSON.stringify({
        type: eventType,
        data: payload,
      });
      res.write(`data: ${sseMessage}\n\n`);

      // 立即刷新缓冲区 (如果环境支持 flush)
      (res as FlushableResponse).flush?.();
    }

    streamCompleted = true;
  } catch (error) {
    console.error("Error processing chat:", error);
    const node = error instanceof NodeExecutionError ? error.node : "unknown";
    const message =
      error instanceof Error ? error.message : "Internal server error";

    // 图执行失败时只发送 error，不发送 done。
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        data: { node, message },
        message,
      })}\n\n`,
    );
    res.end();
    return;
  }

  if (streamCompleted) {
    // 只有图完整消费完毕后才发送结束信号。
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

export default router;
