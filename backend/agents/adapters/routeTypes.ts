/**
 * 路由层适配器的共享类型定义
 */

export interface ChatAttachment {
  type?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  role?: string;
  content?: unknown;
  attachments?: ChatAttachment[];
  [key: string]: unknown;
}

export type RouteFlow = "traditional";

export interface TraditionalFlowInput {
  messages: ChatMessage[];
  mockConfig: Record<string, boolean>;
}

export interface RouteAdapterContext extends TraditionalFlowInput {}

export interface RouteAdapterResult {
  flow: RouteFlow;
  input: TraditionalFlowInput;
  meta?: Record<string, unknown>;
}

export interface RouteInputAdapter {
  name: string;
  priority: number;
  canHandle(context: RouteAdapterContext): boolean;
  adapt(context: RouteAdapterContext): Promise<RouteAdapterResult>;
}
