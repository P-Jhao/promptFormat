import { T_Graph } from "../../../../shared/schemas/graphSchema.js";
import { StructureSchema } from "../schemas/structureSchema.js";
import { STRUCTURE_SYSTEM_PROMPT } from "../prompts/structurePrompts.js";
import { getStructuredModel } from "../../../../utils/model.js";
import { tryExecuteMock } from "../../../../utils/mock.js";
import { withRetry } from "../../../../utils/retry.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// 结构规划节点 (Step 5)
export const structureNode = async (state: T_Graph) => {
  const model = getStructuredModel(StructureSchema);

  // 提取上下文
  const componentSpecs = state.components?.components || [];
  const dataModels = state.capabilities?.dataModels || [];
  const pages = state.ui?.pages || [];

  // 构建输入描述
  const componentsList = componentSpecs
    .map(
      (c) =>
        `- ComponentId: ${c.originalId || c.componentId} (Props: ${c.props.length}, Events: ${c.events.length})`,
    )
    .join("\n");

  const modelsList = dataModels
    .map((m) => `- ModelId: ${m.modelId} (Desc: ${m.description})`)
    .join("\n");

  const pagesList = pages
    .map((p) => `- PageId: ${p.pageId} (Route: ${p.route})`)
    .join("\n");

  const userPrompt = `
任务目标：将架构规划转化为具体的文件系统路径列表。

请基于以下上下文生成完整的文件清单：

1. 【UI 页面规划 (Step 3)】
   - 必须为每个 Page 生成 /pages/{PageName}.tsx 文件。
   ${pagesList}

2. 【业务组件规格 (Step 4)】
   - 必须为每个 Component 生成 /components/{ComponentName}.tsx 文件。
   ${componentsList}

3. 【数据模型定义 (Step 2)】
   - 必须为每个 Model 生成 /types/{ModelName}.ts (类型) 和 /data/{ModelName}.ts (Mock数据) 文件。
   ${modelsList}

4. 【现有模板上下文】
   - 包含 /App.tsx, /index.tsx 等基础文件，请根据需要在输出中包含 update/overwrite 指令。
   - 不要重复生成 package.json 或 tsconfig.json 除非必须修改。
`;

  const messages = [
    new SystemMessage(STRUCTURE_SYSTEM_PROMPT),
    new HumanMessage(userPrompt),
  ];

  // MOCK MODE Handling
  const mockResult = await tryExecuteMock(
    state,
    "structureNode",
    "structureResult.json",
    "structure",
  );
  if (mockResult) return mockResult;

  console.log("--- Project Structure Planning Head Start ---");

  // 使用重试机制调用模型
  const response = await withRetry(model, messages, {
    maxRetries: 3,
    onRetry: (attempt, error) => {
      console.warn(
        `[StructureNode] Retry attempt ${attempt} due to:`,
        error.message,
      );
    },
  });

  console.log("Structure Result:", JSON.stringify(response, null, 2));
  console.log("--- Project Structure Planning End ---");

  return {
    structure: response,
  };
};
