import type { NextFunction, Request, Response } from "express";

interface RateLimitState {
  requestTimestamps: number[];
  activeRequests: number;
}

function readPositiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

const RATE_LIMIT_WINDOW_MS = readPositiveInteger(
  "CHAT_RATE_LIMIT_WINDOW_MS",
  10 * 60 * 1000,
);
const RATE_LIMIT_MAX_REQUESTS = readPositiveInteger(
  "CHAT_RATE_LIMIT_MAX_REQUESTS",
  5,
);
const MAX_CONCURRENT_REQUESTS_PER_IP = readPositiveInteger(
  "CHAT_MAX_CONCURRENT_REQUESTS_PER_IP",
  1,
);

const states = new Map<string, RateLimitState>();

function getClientIp(request: Request): string {
  const forwardedIp = request.ip?.trim();
  if (forwardedIp !== undefined && forwardedIp.length > 0) {
    return forwardedIp;
  }

  const socketIp = request.socket.remoteAddress?.trim();
  if (socketIp !== undefined && socketIp.length > 0) {
    return socketIp;
  }

  return "unknown";
}

function getState(ip: string, now: number): RateLimitState {
  const existingState = states.get(ip);
  if (existingState === undefined) {
    const newState: RateLimitState = {
      requestTimestamps: [],
      activeRequests: 0,
    };
    states.set(ip, newState);
    return newState;
  }

  existingState.requestTimestamps = existingState.requestTimestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  return existingState;
}

function getRetryAfterSeconds(
  state: RateLimitState,
  now: number,
  fallbackSeconds: number,
): number {
  const oldestRequest = state.requestTimestamps[0];
  if (oldestRequest === undefined) {
    return fallbackSeconds;
  }

  return Math.max(
    1,
    Math.ceil((oldestRequest + RATE_LIMIT_WINDOW_MS - now) / 1000),
  );
}

function setRateLimitHeaders(
  response: Response,
  state: RateLimitState,
): void {
  response.setHeader("RateLimit-Limit", String(RATE_LIMIT_MAX_REQUESTS));
  response.setHeader(
    "RateLimit-Remaining",
    String(Math.max(0, RATE_LIMIT_MAX_REQUESTS - state.requestTimestamps.length)),
  );
}

/**
 * 保护公开的聊天生成接口：限制每个 IP 的请求次数，并限制并发生成数。
 * 状态仅保存在当前进程内，适合单机部署，不需要数据库。
 */
export function chatProtection(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const state = getState(clientIp, now);
  setRateLimitHeaders(response, state);

  if (state.activeRequests >= MAX_CONCURRENT_REQUESTS_PER_IP) {
    response.setHeader("Retry-After", "10");
    response.status(429).json({
      error: "A chat generation is already running for this IP",
    });
    return;
  }

  if (state.requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = getRetryAfterSeconds(state, now, 60);
    response.setHeader("Retry-After", String(retryAfter));
    response.status(429).json({
      error: "Too many chat requests",
      retryAfter,
    });
    return;
  }

  state.requestTimestamps.push(now);
  state.activeRequests += 1;
  setRateLimitHeaders(response, state);

  let released = false;
  const release = (): void => {
    if (released) {
      return;
    }

    released = true;
    state.activeRequests = Math.max(0, state.activeRequests - 1);

    if (state.activeRequests === 0 && state.requestTimestamps.length === 0) {
      states.delete(clientIp);
    }
  };

  response.once("finish", release);
  response.once("close", release);
  request.once("aborted", release);

  next();
}
