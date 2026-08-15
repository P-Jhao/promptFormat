import express, {
  type Request,
  type Response,
  type Router,
} from "express";
import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

type SandpackFile = { code: string };
type SandpackFiles = Record<string, SandpackFile>;

const router: Router = express.Router();
const templateDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "templates",
  "react-ts",
);

/** GET React TypeScript template files. */
router.get(
  "/react-ts",
  async (_request: Request, response: Response): Promise<void> => {
    try {
      const files = await fg("**/*", {
        cwd: templateDirectory,
        dot: true,
        onlyFiles: true,
        ignore: ["node_modules/**", "dist/**", ".DS_Store"],
      });

      if (files.length === 0) {
        response
          .status(404)
          .json({ error: "No files found in template directory" });
        return;
      }

      const result: SandpackFiles = {};

      await Promise.all(
        files.map(async (file): Promise<void> => {
          const content = await fs.readFile(
            path.join(templateDirectory, file),
            "utf-8",
          );
          const routePath = `/${file.replace(/\\/g, "/")}`;

          result[routePath] = { code: content };
        }),
      );

      response.status(200).json(result);
    } catch (error: unknown) {
      console.error("Template read error:", error);
      response.status(500).json({ error: "Failed to load template files" });
    }
  },
);

export default router;
