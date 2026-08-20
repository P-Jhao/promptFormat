/**
 * 聊天入口路由适配器注册表
 *
 * 职责仅保留：
 * 1. 管理路由级适配器顺序（优先级）
 * 2. 执行 first-match 分发
 */

import type {
  RouteAdapterContext,
  RouteAdapterResult,
  RouteInputAdapter,
} from "./routeTypes.js";
import { routeClassifierAdapter } from "./routeClassifierAdapter.js";

const ROUTE_ADAPTERS: RouteInputAdapter[] = [
  routeClassifierAdapter,
].sort((a, b) => b.priority - a.priority);

export async function resolveRouteAdapter(
  context: RouteAdapterContext,
): Promise<RouteAdapterResult> {
  for (const adapter of ROUTE_ADAPTERS) {
    if (adapter.canHandle(context)) {
      console.log(
        `[RouteRegistry] Selected adapter: ${adapter.name} (priority=${adapter.priority})`,
      );
      return await adapter.adapt(context);
    }
  }

  throw new Error("No route adapter can handle the chat request");
}
