import type { RouteFlow } from "../adapters/routeTypes.js";
import { buildTraditionalGraph } from "./traditional.graph.js";

/**
 * 根据路由 flow 构建对应的 Agent 图。
 * 当前仅支持 Traditional，后续新增 flow 时在这里扩展分发分支。
 */
export function buildAgent(flow: RouteFlow = "traditional") {
  switch (flow) {
    case "traditional":
      return buildTraditionalGraph();
    default:
      throw new Error(`Unsupported agent flow: ${String(flow)}`);
  }
}
