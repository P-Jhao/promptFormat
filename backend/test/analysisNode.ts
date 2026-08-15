import { analysisNode } from "../agents/flows/traditional/analysis/nodes/analysisNode.js";

interface AnalysisNodeState {
  messages: Array<{
    role: "user";
    content: string;
  }>;
  mockConfig: Record<string, boolean>;
}

const state: AnalysisNodeState = {
  messages: [
    {
      role: "user",
      content: "请创建一个简洁的待办事项应用，支持新增、完成和删除任务。",
    },
  ],
  mockConfig: {
    analysisNode: false,
  },
};

try {
  const result: unknown = await analysisNode(state);

  console.log(
    JSON.stringify(
      {
        success: true,
        result,
      },
      null,
      2,
    ),
  );
} catch (error: unknown) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  console.error(
    JSON.stringify(
      {
        success: false,
        error: errorName,
        message: errorMessage,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
