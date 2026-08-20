// step0: 基础分析
import { z } from "zod";

export const AnalysisSchema = z.object({
  summary: z.string().describe("针对用户需求的简要总结"),
  tags: z.array(z.string()).describe("相关的技术标签或关键词"),
  complexity: z
    .enum(["SIMPLE", "MEDIUM", "COMPLEX"])
    .describe("评估任务的复杂度"),
  designAnalysis: z
    .string()
    .nullable()
    .describe(
      "如果用户提到了设计相关的需求（如'漂亮的界面'、'现代风格'等），请简要描述设计意图；否则为 null。注意：不要尝试分析图片内容，只分析用户的文字描述。",
    ),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;
