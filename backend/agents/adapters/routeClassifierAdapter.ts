import { SystemMessage } from "@langchain/core/messages";
import { getStructuredModel } from "../utils/model.js";
import { withRetry } from "../utils/retry.js";
import {
  convertToLangChainMessages,
} from "./routeHelpers.js";
import type {
  RouteAdapterContext,
  RouteAdapterResult,
  RouteInputAdapter,
} from "./routeTypes.js";
import { ROUTE_CLASSIFIER_SYSTEM_PROMPT } from "./routeClassifierPrompts.js";
import {
  RouteDecisionSchema,
  type RouteDecision,
} from "./routeClassifierSchema.js";

const ROUTE_CLASSIFIER_NODE = "routeClassifier";

async function classifyWithModel(
  context: RouteAdapterContext,
): Promise<RouteDecision> {
  const model = getStructuredModel(RouteDecisionSchema);
  const prompt = [
    new SystemMessage(ROUTE_CLASSIFIER_SYSTEM_PROMPT),
    ...convertToLangChainMessages(context.messages),
  ];

  const result = await withRetry(model, prompt, {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.warn(
        `[RouteClassifier] Retry attempt ${attempt} due to:`,
        error.message,
      );
    },
  });

  return RouteDecisionSchema.parse(result);
}

function shouldUseMockRoute(
  mockConfig: RouteAdapterContext["mockConfig"],
): boolean {
  if (typeof mockConfig[ROUTE_CLASSIFIER_NODE] === "boolean") {
    return mockConfig[ROUTE_CLASSIFIER_NODE];
  }

  return process.env.MOCK_MODE === "true";
}

export const routeClassifierAdapter: RouteInputAdapter = {
  name: "route-classifier",
  priority: 100,
  canHandle: () => true,
  adapt: async (context): Promise<RouteAdapterResult> => {
    const useMockRoute = shouldUseMockRoute(context.mockConfig);
    const flow = useMockRoute
      ? "traditional"
      : (await classifyWithModel(context)).flow;

    console.log(
      `[RouteClassifier] Selected ${flow} (${useMockRoute ? "mock" : "llm"})`,
    );

    return {
      flow,
      input: {
        messages: context.messages,
        mockConfig: context.mockConfig,
      },
      meta: {
        routeType: "intent-classifier",
        classifier: useMockRoute ? "mock" : "llm",
      },
    };
  },
};
