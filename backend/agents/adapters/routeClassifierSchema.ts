import { z } from "zod";

export const RouteDecisionSchema = z.object({
  flow: z
    .enum(["traditional", "chat"])
    .describe("应用构建修改流程或普通聊天回答流程"),
});

export type RouteDecision = z.infer<typeof RouteDecisionSchema>;
