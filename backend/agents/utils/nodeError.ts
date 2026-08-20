import type { RunnableConfig } from "@langchain/core/runnables";

export class NodeExecutionError extends Error {
  readonly node: string;

  constructor(node: string, cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(message, { cause });
    this.name = "NodeExecutionError";
    this.node = node;
  }
}

export function withNodeError<TState, TResult>(
  node: string,
  handler: (
    state: TState,
    config?: RunnableConfig,
  ) => TResult | Promise<TResult>,
): (state: TState, config?: RunnableConfig) => Promise<TResult> {
  return async (state: TState, config?: RunnableConfig) => {
    try {
      return await handler(state, config);
    } catch (error) {
      if (error instanceof NodeExecutionError) {
        throw error;
      }

      throw new NodeExecutionError(node, error);
    }
  };
}
