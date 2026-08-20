import type { RouteFlow } from "../adapters/routeTypes.js";
import { buildChatGraph } from "./chat.graph.js";
import { buildTraditionalGraph } from "./traditional.graph.js";

/**
 * 根据路由 flow 构建对应的 Agent 图。
 */
export function buildAgent(flow: RouteFlow = "traditional") {
  switch (flow) {
    case "traditional":
      return buildTraditionalGraph();
    case "chat":
      return buildChatGraph();
    default:
      throw new Error(`Unsupported agent flow: ${String(flow)}`);
  }
}
