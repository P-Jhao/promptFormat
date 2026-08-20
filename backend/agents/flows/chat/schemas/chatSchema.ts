import { z } from "zod";

export const ChatResultSchema = z.object({
  reply: z.string().min(1).describe("给用户的聊天回复"),
});

export type ChatResult = z.infer<typeof ChatResultSchema>;
