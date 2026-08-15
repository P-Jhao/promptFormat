import "dotenv/config";
import { ChatOpenAI, type ChatOpenAIFields } from "@langchain/openai";
import type { ZodType } from "zod";

let deepseekModel: ChatOpenAI | undefined;
let chatgptModel: ChatOpenAI | undefined;
type MainModel =
  | NonNullable<typeof deepseekModel>
  | NonNullable<typeof chatgptModel>;

type Reasoning = NonNullable<ChatOpenAIFields["reasoning"]>;
type ReasoningEffort = Exclude<NonNullable<Reasoning["effort"]>, null>;
type ReasoningConfig = {
  effort: ReasoningEffort;
};

const REASONING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const satisfies readonly ReasoningEffort[];

function isReasoningEffort(value: string): value is ReasoningEffort {
  return REASONING_EFFORTS.some((effort) => effort === value);
}

function getReasoningConfig(
  environmentVariable: string,
): ReasoningConfig | undefined {
  const effort = process.env[environmentVariable];

  if (effort === undefined) {
    return undefined;
  }

  if (!isReasoningEffort(effort)) {
    throw new Error(
      `Unsupported ${environmentVariable}: ${effort}. Expected one of: ${REASONING_EFFORTS.join(", ")}`,
    );
  }

  return { effort };
}

export function getDeepseekModel(): ChatOpenAI {
  if (deepseekModel === undefined) {
    const reasoning = getReasoningConfig("DEEPSEEK_REASONING_EFFORT");

    deepseekModel = new ChatOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL,
      configuration: {
        baseURL: process.env.DEEPSEEK_BASE_URL,
      },
      ...(reasoning === undefined ? {} : { reasoning }),
    });
  }

  return deepseekModel;
}

export function getChatgptModel(): ChatOpenAI {
  if (chatgptModel === undefined) {
    const reasoning = getReasoningConfig("OPENAI_REASONING_EFFORT");

    chatgptModel = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
      },
      ...(reasoning === undefined ? {} : { reasoning }),
    });
  }

  return chatgptModel;
}

export function getMainModel(): MainModel {
  const provider = process.env.MAIN_MODEL_PROVIDER?.toLowerCase() ?? "gpt";

  switch (provider) {
    case "deepseek":
      return getDeepseekModel();
    case "gpt":
      return getChatgptModel();
    default:
      throw new Error(
        `Unsupported MAIN_MODEL_PROVIDER: ${process.env.MAIN_MODEL_PROVIDER}`,
      );
  }
}

export function getStructuredModel<TSchema extends ZodType>(schema: TSchema) {
  return getMainModel().withStructuredOutput(schema, {
    method: "jsonMode",
    includeRaw: false,
  });
}
