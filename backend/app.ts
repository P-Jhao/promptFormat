import "dotenv/config";
import createError from "http-errors";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { fileURLToPath } from "url";
import cors, { type CorsOptions } from "cors";

import indexRouter from "./routes/index.js";
import templateRouter from "./routes/template.js";
import chatRouter from "./routes/chat.js";
import uploadRouter from "./routes/upload.js";
import { chatProtection } from "./middleware/chatProtection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readTrustProxyHops(): number {
  const rawValue = process.env.TRUST_PROXY_HOPS;
  if (rawValue === undefined) {
    return 1;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error("TRUST_PROXY_HOPS must be a non-negative integer");
  }

  return parsedValue;
}

function readCorsOrigins(): Set<string> {
  const origins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  const configuredOrigins = process.env.CORS_ORIGINS;

  if (configuredOrigins === undefined) {
    return origins;
  }

  for (const origin of configuredOrigins.split(",")) {
    const normalizedOrigin = origin.trim();
    if (normalizedOrigin.length > 0) {
      origins.add(normalizedOrigin);
    }
  }

  return origins;
}

const allowedCorsOrigins = readCorsOrigins();
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Requests without Origin include same-origin requests, health checks and
    // command-line clients, so they do not need CORS response headers.
    if (origin === undefined || allowedCorsOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("Origin is not allowed by CORS") as Error & {
      statusCode: number;
    };
    error.statusCode = 403;
    callback(error);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"],
  maxAge: 600,
};

const app = express();

app.set("trust proxy", readTrustProxyHops());
app.disable("x-powered-by");
app.use(logger("dev"));
app.use(cors(corsOptions));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/", indexRouter);
app.use("/api/template", templateRouter);
app.use("/api/chat", chatProtection, chatRouter);
app.use("/api/upload", uploadRouter);

// Catch 404 and forward to the error handler.
app.use(function (req: Request, _res: Response, next: NextFunction) {
  next(createError(404));
});

interface ErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null;
}

function getErrorStatus(error: unknown): number {
  if (!isErrorLike(error)) {
    return 500;
  }

  const status = error.status ?? error.statusCode;
  return typeof status === "number" && status >= 400 && status < 600
    ? status
    : 500;
}

// Keep API errors JSON-shaped and avoid exposing stack traces or model details
// through the generic Express error boundary.
app.use(function (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = getErrorStatus(err);
  const errorType = isErrorLike(err) ? err.type : undefined;
  const message =
    errorType === "entity.too.large"
      ? "Request body is too large"
      : status >= 500
        ? "Internal server error"
        : isErrorLike(err) && typeof err.message === "string"
          ? err.message
          : "Request failed";

  res.status(status).json({ error: message });
});

export default app;
