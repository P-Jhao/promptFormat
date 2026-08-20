// Input Processing 阶段的 Schemas
import { IntentSchema } from "../../flows/traditional/analysis/schemas/intentSchema.js";

// Analysis 阶段的 Schemas
import { AnalysisSchema } from "../../flows/traditional/analysis/schemas/analysisSchema.js";
import { CapabilitySchema } from "../../flows/traditional/analysis/schemas/capabilitySchema.js";
import { UISchema } from "../../flows/traditional/analysis/schemas/uiSchema.js";
import { ComponentSchema } from "../../flows/traditional/analysis/schemas/componentSchema.js";
import { StructureSchema } from "../../flows/traditional/analysis/schemas/structureSchema.js";

// Architecture 阶段的 Schemas
import { TypeGenerationSchema } from "../../flows/traditional/architecture/schemas/typeSchema.js";
import { UtilsGenerationSchema } from "../../flows/traditional/architecture/schemas/utilsSchema.js";
import { MockDataSchema } from "../../flows/traditional/architecture/schemas/mockDataSchema.js";
import { ServiceSchema } from "../../flows/traditional/assembly/schemas/serviceSchema.js";
import { HooksSchema } from "../../flows/traditional/assembly/schemas/hooksSchema.js";
import { CompGenSchema } from "../../flows/traditional/view/schemas/compGenSchema.js";
import { PageGenSchema } from "../../flows/traditional/view/schemas/pageGenSchema.js";
import { LayoutNodeOutputSchema } from "../../flows/traditional/view/schemas/layoutSchema.js";
import { StyleGenSchema } from "../../flows/traditional/view/schemas/styleGenSchema.js";

import { DependencySchema } from "../../flows/traditional/analysis/schemas/dependencySchema.js";

// Assembly 阶段的 Schemas
import { AppGenSchema } from "../../flows/traditional/application/schemas/appGenSchema.js";
import { AssembleSchema } from "../../flows/traditional/application/schemas/assembleSchema.js";

import { z } from "zod";

export const GraphSchema = z.object({
  // 初始输入：聊天记录 (原始 JSON 或 BaseMessage[])
  messages: z.array(z.any()).describe("聊天历史记录"),

  // 初始输入：Mock 配置
  mockConfig: z
    .record(z.string(), z.boolean())
    .optional()
    .describe("各节点的 Mock 开关配置"),

  // 初始输入
  textPrompt: z.string().optional().describe("文本提示 (Legacy)"),

  // step0: 行为分析
  analysis: AnalysisSchema.optional(),

  // step1: 意图详情
  intent: IntentSchema.optional(),

  // step2: 能力分析
  capabilities: CapabilitySchema.optional(),

  // step3: UI架构分析
  ui: UISchema.optional(),

  // step4: 组件契约
  components: ComponentSchema.optional(),

  // step5: 项目结构
  structure: StructureSchema.optional(),

  // step6: 依赖管理 (Package.json + 增量依赖)
  dependency: DependencySchema.extend({
    packageJson: z.any().describe("完整的 package.json 对象"),
  }).optional(),

  // step7: 业务数据类型定义
  types: TypeGenerationSchema.optional(),

  // step8: 工具函数文件 (返回 { files: [...] } 格式)
  utils: UtilsGenerationSchema.optional(),

  // step9: Mock 数据 (单对象，包含 files 数组)
  mockData: MockDataSchema.optional(),

  // step10: 业务逻辑/服务层文件
  service: ServiceSchema.optional(),

  // step11: hooks 层文件
  hooks: HooksSchema.optional(),

  // step12: UI组件代码
  componentsCode: z
    .array(CompGenSchema)
    .optional()
    .describe("生成的 React 组件代码文件列表"),

  // step13: 生成的页面代码
  pagesCode: z
    .array(PageGenSchema)
    .optional()
    .describe("生成的 React 页面代码文件列表"),

  // step14: Layout 节点输出（包含 layoutsCode 和 routeStructure）
  layouts: LayoutNodeOutputSchema.optional(),

  // step15: 全局样式
  styles: StyleGenSchema.optional(),

  // step15: App.tsx 入口文件
  app: AppGenSchema.optional(),

  // step16: 组装后的文件 (Sandpack 格式)
  files: AssembleSchema.optional(),
});

export type T_Graph = z.infer<typeof GraphSchema>;
