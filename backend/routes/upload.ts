import express, { Request, Response } from "express";
import multer from "multer";
import { getOSSClient } from "../utils/oss.js";
import { ossConfig } from "../config/oss.js";
import path from "path";

const router = express.Router();

// 配置 Multer 内存存储（文件不落地，直接转发到 OSS）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制 10MB（仅支持图片）
  },
  fileFilter: (req, file, cb) => {
    console.log("\n🔵 [Multer] 开始处理文件:");
    console.log(`   - 原始文件名: ${file.originalname}`);
    console.log(`   - MIME 类型: ${file.mimetype}`);
    console.log(`   - 字段名: ${file.fieldname}`);

    const ext = path.extname(file.originalname).toLowerCase();
    const isImageFile = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
    ].includes(ext);

    // 只支持图片文件，最大 10MB
    if (!isImageFile) {
      console.log(`❌ [Multer] 不支持的文件类型: ${ext}`);
      console.log(`   支持的格式: .jpg, .jpeg, .png, .gif, .webp, .svg`);
      return cb(
        new Error(
          `Unsupported file type: ${ext}. Only image files are allowed.`,
        ),
      );
    }

    // 接受符合条件的图片文件
    cb(null, true);
  },
});

router.post(
  "/image",
  (req, res, next) => {
    console.log("\n🔵 [Upload API] 收到 POST 请求");
    next();
  },
  upload.single("file"),
  async (req: Request, res: Response) => {
    console.log("🔵 [Upload] 进入路由处理函数");

    try {
      if (!req.file) {
        console.log("❌ [Upload] 错误: 没有接收到文件");
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      console.log("✓ [Upload] 文件接收成功");

      // 获取 OSS 客户端（懒加载单例）
      let client;
      try {
        client = getOSSClient();
      } catch (err) {
        console.log("❌ [Upload] 错误: OSS 客户端初始化失败");
        console.log("   - OSS 配置:", {
          hasAccessKeyId: !!ossConfig.accessKeyId,
          hasAccessKeySecret: !!ossConfig.accessKeySecret,
          bucket: ossConfig.bucket || "undefined",
          endpoint: ossConfig.endpoint || "undefined",
        });
        res.status(500).json({ error: "OSS not configured" });
        return;
      }

      console.log("✓ [Upload] OSS 客户端已就绪");

      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase();

      // 生成随机文件名: images/YYYYMMDD-UUID.jpg
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const uuid = crypto.randomUUID();
      const filename = `images/${date}-${uuid}${ext}`;

      // 上传到 OSS
      const result = await client.put(filename, file.buffer);

      // 返回完整的 HTTPS 链接
      // result.url 有时候是 http, 如果配置了 secure:true 或者是自定义域名，可能需要手动处理
      // 简单起见，如果 result.url 存在直接返回，否则自己拼接
      let fileUrl = result.url;
      if (!fileUrl) {
        // Fallback url construction
        const protocol = ossConfig.secure ? "https" : "http";
        fileUrl = `${protocol}://${ossConfig.bucket}.${ossConfig.endpoint}/${filename}`;
      }

      // 强制升级为 HTTPS (OSS 返回的 url 有时可能是 http)
      if (fileUrl.startsWith("http://")) {
        fileUrl = fileUrl.replace("http://", "https://");
      }

      console.log(`✅ [Upload] 上传成功: ${fileUrl}\n`);

      res.status(200).json({
        url: fileUrl,
        name: file.originalname,
      });
    } catch (error) {
      console.error("❌ [Upload] 上传失败:");
      console.error(
        "   - 错误信息:",
        error instanceof Error ? error.message : error,
      );

      if (req.file) {
        console.error("   - 文件信息:", {
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: `${(req.file.size / 1024).toFixed(2)} KB`,
        });
      }

      if (error instanceof Error && error.stack) {
        console.error("   - 堆栈追踪:", error.stack);
      }

      res.status(500).json({
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

// Multer 错误处理中间件
router.use((err: any, req: Request, res: Response, next: any) => {
  console.error("\n❌ [Multer] 中间件错误:");
  console.error("   - 错误代码:", err.code);
  console.error("   - 错误信息:", err.message);

  if (err instanceof multer.MulterError) {
    console.error("   - Multer 错误类型:", err.code);

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large",
        details: "图片大小超过 10MB 限制",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected field",
        details: "文件字段名错误，应为 'file'",
      });
    }

    return res.status(400).json({
      error: "Upload error",
      details: err.message,
    });
  }

  // 其他错误
  res.status(500).json({
    error: "Server error",
    details: err.message || "Unknown error",
  });
});

export default router;
