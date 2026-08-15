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
  handler: (state: TState) => TResult | Promise<TResult>,
): (state: TState) => Promise<TResult> {
  return async (state: TState) => {
    try {
      return await handler(state);
    } catch (error) {
      if (error instanceof NodeExecutionError) {
        throw error;
      }

      throw new NodeExecutionError(node, error);
    }
  };
}
