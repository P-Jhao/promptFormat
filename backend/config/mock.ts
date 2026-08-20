import "dotenv/config";

/**
 * 全局 Mock 配置
 *
 * 此配置控制 LangGraph Agent 的默认模拟策略。
 * 它决定了特定节点是返回预定义的 Mock 数据（快速/稳定），
 * 还是执行真实的 LLM 逻辑（较慢/具有创造性）。
 *
 * 值含义:
 * - true  : 启用 Mock 模式。节点将返回 `server/mock/*.json` 中的数据。
 * - false : 禁用 Mock 模式。节点将调用 LLM。
 *
 * ============================================================================
 * 快速使用指南
 * ============================================================================
 *
 * 本配置支持三种粒度的控制，优先级从低到高：global < phases < nodes
 *
 * 【方式一：使用环境变量（最简单）】
 * 在 backend/.env 中配置 MOCK_MODE：
 *
 *   MOCK_MODE=true  // 全部 mock
 *   MOCK_MODE=false // 全部使用真实 LLM
 *
 * 【方式二：按阶段切换】
 * 5 个阶段可独立控制：
 *
 *   export const DEFAULT_MOCK_PRESET: MockConfig = {
 *     phases: {
 *       planning: true,     // I. 规划阶段 (Step 0-6) - mock
 *       foundation: true,   // II. 基础建设 (Step 7-9) - mock
 *       logic: false,       // III. 逻辑构建 (Step 10-11) - 真实 LLM
 *       view: false,        // IV. 视图构建 (Step 12-14) - 真实 LLM
 *       assembly: false,    // V. 应用组装 (Step 15) - 真实 LLM
 *     }
 *   };
 *
 * 【方式三：按节点微调（最细粒度）】
 * nodes 级别配置会覆盖 phases 和 global：
 *
 *   export const DEFAULT_MOCK_PRESET: MockConfig = {
 *     global: true,                    // 默认全部 mock
 *     phases: { view: false },         // 视图阶段用真实 LLM
 *     nodes: { styleGenNode: true }    // 但样式生成仍用 mock（覆盖 phases）
 *   };
 *
 * 【阶段与节点对照表】
 *
 *   I. 规划阶段 (planning):
 *      - analysisNode, intentNode, capabilityNode, uiNode,
 *        componentNode, structureNode, dependencyNode
 *
 *   II. 基础建设 (foundation):
 *      - typeNode, utilsNode, mockDataNode
 *
 *   III. 逻辑构建 (logic):
 *      - serviceNode, hooksNode
 *
 *   IV. 视图构建 (view):
 *      - componentSubgraph, pageSubgraph, layoutNode, styleGenNode
 *
 *   V. 应用组装 (assembly):
 *      - appGenNode, assembleNode
 *
 * ============================================================================
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 所有节点名称 */
export type NodeName =
  | "routeClassifier"
  | "chatNode"
  | "analysisNode"
  | "intentNode"
  | "capabilityNode"
  | "uiNode"
  | "componentNode"
  | "structureNode"
  | "dependencyNode"
  | "typeNode"
  | "utilsNode"
  | "mockDataNode"
  | "serviceNode"
  | "hooksNode"
  | "componentSubgraph"
  | "pageSubgraph"
  | "layoutNode"
  | "styleGenNode"
  | "appGenNode"
  | "assembleNode";

/** 阶段名称 */
export type PhaseName =
  | "planning" // I. 规划阶段 (Step 0-6)
  | "foundation" // II. 基础建设 (Step 7-9)
  | "logic" // III. 逻辑构建 (Step 10-11)
  | "view" // IV. 视图构建 (Step 12-14)
  | "assembly"; // V. 应用组装 (Step 15-16)

/** 阶段到节点的映射 */
export const PHASE_NODES: Record<PhaseName, NodeName[]> = {
  planning: [
    "analysisNode",
    "intentNode",
    "capabilityNode",
    "uiNode",
    "componentNode",
    "structureNode",
    "dependencyNode",
  ],
  foundation: ["typeNode", "utilsNode", "mockDataNode"],
  logic: ["serviceNode", "hooksNode"],
  view: ["componentSubgraph", "pageSubgraph", "layoutNode", "styleGenNode"],
  assembly: ["appGenNode", "assembleNode"],
};

/** 阶段元数据（用于前端展示） */
export const PHASE_METADATA: Record<
  PhaseName,
  { title: string; order: number }
> = {
  planning: { title: "规划阶段", order: 1 },
  foundation: { title: "基础建设", order: 2 },
  logic: { title: "逻辑构建", order: 3 },
  view: { title: "视图构建", order: 4 },
  assembly: { title: "应用组装", order: 5 },
};

// ============================================================================
// 分层配置接口
// ============================================================================

/**
 * 分层 Mock 配置
 *
 * 支持三种粒度的控制，按优先级从低到高：
 * 1. global: 全局开关
 * 2. phases: 按阶段控制
 * 3. nodes: 按节点控制（最高优先级，可覆盖上层设置）
 */
export interface MockConfig {
  /** 全局开关 - 最低优先级 */
  global?: boolean;

  /** 阶段开关 - 中等优先级 */
  phases?: Partial<Record<PhaseName, boolean>>;

  /** 节点开关 - 最高优先级（覆盖上层） */
  nodes?: Partial<Record<NodeName, boolean>>;
}

// ============================================================================
// 配置解析函数
// ============================================================================

/** 所有节点名称列表 */
const ALL_NODES: NodeName[] = [
  "routeClassifier",
  "chatNode",
  ...Object.values(PHASE_NODES).flat(),
];

/**
 * 将分层 MockConfig 解析为扁平的 Record<NodeName, boolean>
 *
 * 优先级: nodes > phases > global > 默认值(true)
 *
 * @param config 分层配置对象
 * @returns 扁平的节点配置
 */
export function resolveMockConfig(
  config: MockConfig,
): Record<NodeName, boolean> {
  const result: Record<NodeName, boolean> = {} as Record<NodeName, boolean>;

  for (const nodeName of ALL_NODES) {
    // 1. 检查节点级别配置（最高优先级）
    if (config.nodes?.[nodeName] !== undefined) {
      result[nodeName] = config.nodes[nodeName]!;
      continue;
    }

    // 2. 检查阶段级别配置
    if (config.phases) {
      const phase = getPhaseByNode(nodeName);
      if (phase && config.phases[phase] !== undefined) {
        result[nodeName] = config.phases[phase]!;
        continue;
      }
    }

    // 3. 使用全局配置
    if (config.global !== undefined) {
      result[nodeName] = config.global;
      continue;
    }

    // 4. 默认值：true（使用 mock）
    result[nodeName] = true;
  }

  return result;
}

/**
 * 根据节点名称获取其所属阶段
 */
function getPhaseByNode(nodeName: NodeName): PhaseName | undefined {
  for (const [phase, nodes] of Object.entries(PHASE_NODES)) {
    if (nodes.includes(nodeName)) {
      return phase as PhaseName;
    }
  }
  return undefined;
}

// ============================================================================
// 预设配置
// ============================================================================

/**
 * 常用配置预设
 *
 * 使用方式: resolveMockConfig(MOCK_PRESETS.planningMock)
 */
export const MOCK_PRESETS = {
  /** 全部使用 Mock（最快，用于 UI 调试） */
  allMock: { global: true } as MockConfig,

  /** 全部使用真实 LLM（完整测试） */
  allReal: { global: false } as MockConfig,

  /** 仅规划阶段用 Mock，其他用真实 LLM（调试代码生成） */
  planningMock: {
    global: false,
    phases: { planning: true },
  } as MockConfig,

  /** 规划+基础阶段用 Mock，逻辑/视图/组装用真实 LLM */
  foundationMock: {
    global: false,
    phases: { planning: true, foundation: true },
  } as MockConfig,

  /** 仅视图阶段用真实 LLM（调试组件/页面生成） */
  viewReal: {
    global: true,
    phases: { view: false },
  } as MockConfig,

  /** 仅最后组装阶段用真实 LLM */
  assemblyReal: {
    global: true,
    phases: { assembly: false },
  } as MockConfig,
} as const;

/**
 * 从环境变量读取当前默认配置。
 * MOCK_MODE=true 使用全部 Mock；MOCK_MODE=false 或未配置时使用真实 LLM。
 */
function getDefaultMockPreset(): MockConfig {
  const mockMode = process.env.MOCK_MODE;

  if (mockMode === "true") {
    return MOCK_PRESETS.allMock;
  }

  return MOCK_PRESETS.allReal;
}

export const DEFAULT_MOCK_PRESET: MockConfig = getDefaultMockPreset();
