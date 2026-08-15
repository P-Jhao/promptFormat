import {
  HumanMessage,
  type BaseMessageLike,
} from "@langchain/core/messages";

export interface RetryOptions {
  /** 最大模型调用次数，包含第一次调用。 */
  maxRetries?: number;
  onRetry?: (attempt: number, error: Error) => void | Promise<void>;
  /** 生成追加到下一次模型调用中的错误反馈消息。 */
  formatErrorFeedback?: (error: Error) => string;
}

interface InvokableModel<TOutput> {
  invoke(messages: BaseMessageLike[]): Promise<TOutput>;
}

const DEFAULT_MAX_RETRIES = 3;

const defaultErrorFeedback = (error: Error): string =>
  `上一次生成失败，错误信息：\n${error.message}\n\n请根据错误信息修正输出后重试。`;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * 调用模型并在失败后携带错误反馈重试。
 *
 * maxRetries 表示最大调用次数。每次非最终失败都会先执行 onRetry，
 * 再将错误反馈追加到当前消息数组中，然后发起下一次调用。
 */
export async function withRetry<TOutput>(
  model: InvokableModel<TOutput>,
  messages: BaseMessageLike[],
  options: RetryOptions = {},
): Promise<TOutput> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    onRetry,
    formatErrorFeedback = defaultErrorFeedback,
  } = options;

  if (!Number.isInteger(maxRetries) || maxRetries < 1) {
    throw new Error("maxRetries must be an integer greater than or equal to 1");
  }

  let currentMessages = [...messages];
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await model.invoke(currentMessages);
    } catch (error) {
      lastError = toError(error);

      if (attempt < maxRetries) {
        await onRetry?.(attempt, lastError);
        currentMessages = [
          ...currentMessages,
          new HumanMessage(formatErrorFeedback(lastError)),
        ];
      }
    }
  }

  throw lastError ?? new Error("Model invocation failed without an error");
}
