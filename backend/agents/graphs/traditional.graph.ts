import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { ChatMessage } from "../adapters/routeTypes.js";
import { analysisNode } from "../flows/traditional/analysis/nodes/analysisNode.js";
import type { AnalysisResult } from "../flows/traditional/analysis/schemas/analysisSchema.js";
import { intentNode } from "../flows/traditional/analysis/nodes/intentNode.js";
import type { Intent } from "../flows/traditional/analysis/schemas/intentSchema.js";
import { capabilityNode } from "../flows/traditional/analysis/nodes/capabilityNode.js";
import type { Capability } from "../flows/traditional/analysis/schemas/capabilitySchema.js";
import { uiNode } from "../flows/traditional/analysis/nodes/uiNode.js";
import type { UI } from "../flows/traditional/analysis/schemas/uiSchema.js";
import { componentNode } from "../flows/traditional/analysis/nodes/componentNode.js";
import type { ComponentSpec } from "../flows/traditional/analysis/schemas/componentSchema.js";
import { structureNode } from "../flows/traditional/analysis/nodes/structureNode.js";
import type { ProjectStructure } from "../flows/traditional/analysis/schemas/structureSchema.js";
import { dependencyNode } from "../flows/traditional/analysis/nodes/dependencyNode.js";
import { typeNode } from "../flows/traditional/architecture/nodes/typeNode.js";
import type { TypeGeneration } from "../flows/traditional/architecture/schemas/typeSchema.js";
import { utilsNode } from "../flows/traditional/architecture/nodes/utilsNode.js";
import type { UtilsGeneration } from "../flows/traditional/architecture/schemas/utilsSchema.js";
import { mockDataNode } from "../flows/traditional/architecture/nodes/mockDataNode.js";
import type { T_MockData } from "../flows/traditional/architecture/schemas/mockDataSchema.js";
import { serviceNode } from "../flows/traditional/assembly/nodes/serviceNode.js";
import type { T_Service } from "../flows/traditional/assembly/schemas/serviceSchema.js";
import { hooksNode } from "../flows/traditional/assembly/nodes/hooksNode.js";
import type { T_Hooks } from "../flows/traditional/assembly/schemas/hooksSchema.js";
import { layoutNode } from "../flows/traditional/view/nodes/layoutNode.js";
import type { T_LayoutNodeOutput } from "../flows/traditional/view/schemas/layoutSchema.js";
import { styleGenNode } from "../flows/traditional/view/nodes/styleGenNode.js";
import type { T_StyleGen } from "../flows/traditional/view/schemas/styleGenSchema.js";
import { appGenNode } from "../flows/traditional/application/nodes/appGenNode.js";
import type { T_AppGen } from "../flows/traditional/application/schemas/appGenSchema.js";
import { assembleNode } from "../flows/traditional/application/nodes/assembleNode.js";
import type { T_Assemble } from "../flows/traditional/application/schemas/assembleSchema.js";
import type { T_ComponentGen } from "../flows/traditional/view/schemas/compGenSchema.js";
import type { T_PageGen } from "../flows/traditional/view/schemas/pageGenSchema.js";
import { tryExecuteMock } from "../utils/mock.js";
import { withNodeError } from "../utils/nodeError.js";
import { componentGraph } from "./component.graph.js";
import { pageGraph } from "./page.graph.js";

interface ComponentResult {
  components: ComponentSpec[];
}

interface DependencyResult {
  packageJson: Record<string, unknown>;
  dependencies: Record<string, string>;
  reason: string;
}

interface TraditionalGraphStateValue {
  messages: ChatMessage[];
  mockConfig: Record<string, boolean>;
  analysis?: AnalysisResult;
  intent?: Intent | null;
  capabilities?: Capability | null;
  ui?: UI | null;
  components?: ComponentResult | null;
  structure?: ProjectStructure | null;
  dependency?: DependencyResult | null;
  types?: TypeGeneration | null;
  utils?: UtilsGeneration | null;
  mockData?: T_MockData | null;
  service?: T_Service | null;
  hooks?: T_Hooks | null;
  componentsCode?: T_ComponentGen[] | null;
  pagesCode?: T_PageGen[] | null;
  layouts?: T_LayoutNodeOutput | null;
  styles?: T_StyleGen | null;
  app?: T_AppGen | null;
  files?: T_Assemble | null;
}

const TraditionalGraphState = Annotation.Root({
  messages: Annotation<TraditionalGraphStateValue["messages"]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  mockConfig: Annotation<TraditionalGraphStateValue["mockConfig"]>(),
  analysis: Annotation<TraditionalGraphStateValue["analysis"]>(),
  intent: Annotation<TraditionalGraphStateValue["intent"]>(),
  capabilities: Annotation<TraditionalGraphStateValue["capabilities"]>(),
  ui: Annotation<TraditionalGraphStateValue["ui"]>(),
  components: Annotation<TraditionalGraphStateValue["components"]>(),
  structure: Annotation<TraditionalGraphStateValue["structure"]>(),
  dependency: Annotation<TraditionalGraphStateValue["dependency"]>(),
  types: Annotation<TraditionalGraphStateValue["types"]>(),
  utils: Annotation<TraditionalGraphStateValue["utils"]>(),
  mockData: Annotation<TraditionalGraphStateValue["mockData"]>(),
  service: Annotation<TraditionalGraphStateValue["service"]>(),
  hooks: Annotation<TraditionalGraphStateValue["hooks"]>(),
  componentsCode: Annotation<TraditionalGraphStateValue["componentsCode"]>(),
  pagesCode: Annotation<TraditionalGraphStateValue["pagesCode"]>(),
  layouts: Annotation<TraditionalGraphStateValue["layouts"]>(),
  styles: Annotation<TraditionalGraphStateValue["styles"]>(),
  app: Annotation<TraditionalGraphStateValue["app"]>(),
  files: Annotation<TraditionalGraphStateValue["files"]>(),
});

const runComponentGraph = async (state: typeof TraditionalGraphState.State) => {
  const mockResult = await tryExecuteMock(
    state,
    "componentSubgraph",
    "compGenResult.json",
    (data: { componentsCode: T_ComponentGen[] }) => ({
      componentsCode: data.componentsCode,
    }),
  );
  if (mockResult) return mockResult;

  const componentsToGenerate = (state.structure?.files ?? []).filter(
    (file) =>
      file.path.includes("/components/") &&
      (file.path.endsWith(".tsx") || file.path.endsWith(".jsx")),
  );

  console.log(
    `[TraditionalGraph] Invoking Component Subgraph for ${componentsToGenerate.length} items...`,
  );

  const result = await componentGraph.invoke({
    componentsToGenerate,
    context: {
      hooks: state.hooks,
      types: state.types,
      service: state.service,
      components: state.components,
    },
  });

  return {
    componentsCode: result.componentsCode,
  };
};

const runPageGraph = async (state: typeof TraditionalGraphState.State) => {
  // Mock 模式检查
  const mockResult = await tryExecuteMock(
    state,
    "pageSubgraph",
    "pageGenResult.json",
    (data) => ({
      pagesCode: Array.isArray(data) ? data : data.pagesCode || data,
    }),
  );
  if (mockResult) return mockResult;

  const allFiles = state.structure?.files || [];
  const pagesToGenerate = allFiles.filter(
    (f: any) =>
      f.path.includes("/pages/") &&
      (f.path.endsWith(".tsx") || f.path.endsWith(".jsx")),
  );

  console.log(
    `[MainGraph] Invoking Page Subgraph for ${pagesToGenerate.length} items...`,
  );

  const subgraphInput = {
    pagesToGenerate,
    context: {
      hooks: state.hooks,
      componentResult: state.componentsCode || [], // 此时已经是最新的组件代码，确保不为 undefined
      types: state.types, // 类型定义（供 AST 后处理使用）
    },
  };

  const result = await pageGraph.invoke(subgraphInput);

  return {
    pagesCode: result.pagesCode,
  };
};

export function buildTraditionalAgent() {
  return new StateGraph(TraditionalGraphState)
    .addNode("analysisNode", withNodeError("analysisNode", analysisNode))
    .addNode("intentNode", withNodeError("intentNode", intentNode))
    .addNode(
      "capabilityNode",
      withNodeError("capabilityNode", capabilityNode),
    )
    .addNode("uiNode", withNodeError("uiNode", uiNode))
    .addNode("componentNode", withNodeError("componentNode", componentNode))
    .addNode("structureNode", withNodeError("structureNode", structureNode))
    .addNode(
      "dependencyNode",
      withNodeError("dependencyNode", dependencyNode),
    )
    .addNode("typeNode", withNodeError("typeNode", typeNode))
    .addNode("utilsNode", withNodeError("utilsNode", utilsNode))
    .addNode("mockDataNode", withNodeError("mockDataNode", mockDataNode))
    .addNode("serviceNode", withNodeError("serviceNode", serviceNode))
    .addNode("hooksNode", withNodeError("hooksNode", hooksNode))
    .addNode(
      "componentSubgraph",
      withNodeError("componentSubgraph", runComponentGraph),
    )
    .addNode("pageSubgraph", withNodeError("pageSubgraph", runPageGraph))
    .addNode("layoutNode", withNodeError("layoutNode", layoutNode))
    .addNode("styleGenNode", withNodeError("styleGenNode", styleGenNode))
    .addNode("appGenNode", withNodeError("appGenNode", appGenNode))
    .addNode("assembleNode", withNodeError("assembleNode", assembleNode))
    .addEdge(START, "analysisNode")
    .addEdge("analysisNode", "intentNode")
    .addEdge("intentNode", "capabilityNode")
    .addEdge("capabilityNode", "uiNode")
    .addEdge("uiNode", "componentNode")
    .addEdge("componentNode", "structureNode")
    .addEdge("structureNode", "dependencyNode")
    .addEdge("dependencyNode", "typeNode")
    .addEdge("typeNode", "utilsNode")
    .addEdge("utilsNode", "mockDataNode")
    .addEdge("mockDataNode", "serviceNode")
    .addEdge("serviceNode", "hooksNode")
    .addEdge("hooksNode", "componentSubgraph")
    .addEdge("componentSubgraph", "pageSubgraph")
    .addEdge("pageSubgraph", "layoutNode")
    .addEdge("layoutNode", "styleGenNode")
    .addEdge("styleGenNode", "appGenNode")
    .addEdge("appGenNode", "assembleNode")
    .addEdge("assembleNode", END)
    .compile();
}

export const buildTraditionalGraph = buildTraditionalAgent;
