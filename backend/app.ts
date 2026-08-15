import createError, { HttpError } from "http-errors";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import indexRouter from "./routes/index.js";
import templateRouter from "./routes/template.js";
import chatRouter from "./routes/chat.js";
import uploadRouter from "./routes/upload.js"; // Import

const app = express();

app.use(logger("dev"));
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public")));

app.use("/", indexRouter);
app.use("/api/template", templateRouter);
app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter); // Mount

// catch 404 and forward to error handler
app.use(function (req: Request, res: Response, next: NextFunction) {
  next(createError(404));
});

// error handler
app.use(function (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  // res.render('error');
  // Since we don't have a view engine setup (usually no views folder mentioned in my list_dir),
  // and this is an API server, maybe we should return JSON?
  // But the original code had res.render('error').
  // I'll check if views exist. If not, I'll switch to JSON.
  // Original list_dir showed: .DS_Store, app.js, bin/, node_modules/, package-lock.json, package.json, pnpm-lock.yaml, routes/, templates/
  // No views folder.
  // So res.render will likely fail if called.
  // I'll change it to json response.
  res.json({ error: err.message });
});

export default app;
