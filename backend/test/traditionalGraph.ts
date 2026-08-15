import { buildTraditionalGraph } from "../agents/graphs/traditional.graph.js";

const graph = buildTraditionalGraph();

const input = {
  messages: [
    {
      role: "user",
      content: "请创建一个简洁的待办事项应用，支持新增、完成和删除任务。",
    },
  ],
  mockConfig: {
    analysisNode: true,
    intentNode: true,
    capabilityNode: true,
    uiNode: true,
    componentNode: true,
    structureNode: true,
    dependencyNode: true,
    typeNode: true,
    utilsNode: true,
    mockDataNode: true,
    serviceNode: true,
    hooksNode: true,
    componentSubgraph: true,
    pageSubgraph: true,
    layoutNode: true,
    styleGenNode: true,
    appGenNode: true,
    assembleNode: true,
  },
};

try {
  const result: unknown = await graph.invoke(input);

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
  const errorMessage = error instanceof Error ? error.message : String(error);

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
