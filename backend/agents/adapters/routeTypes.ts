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

export type RouteFlow = "traditional" | "chat";

export interface RouteFlowInput {
  messages: ChatMessage[];
  mockConfig: Record<string, boolean>;
}

export type TraditionalFlowInput = RouteFlowInput;

export type ChatFlowInput = RouteFlowInput;

export interface RouteAdapterContext extends RouteFlowInput {}

export interface RouteAdapterResult {
  flow: RouteFlow;
  input: RouteFlowInput;
  meta?: Record<string, unknown>;
}

export interface RouteInputAdapter {
  name: string;
  priority: number;
  canHandle(context: RouteAdapterContext): boolean;
  adapt(context: RouteAdapterContext): Promise<RouteAdapterResult>;
}
