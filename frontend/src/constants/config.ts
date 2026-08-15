// 应用配置常量

export const PORTS = {
  FRONTEND: 3000,
  SERVER: 7001,
};

function resolveApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl === undefined || configuredBaseUrl.length === 0) {
    return "/api";
  }

  return configuredBaseUrl.replace(/\/+$/, "");
}

/**
 * 浏览器端 API 默认使用同源路径，由 Nginx（生产）或 Next rewrite（本地）代理。
 * 如需跨域开发，可通过 NEXT_PUBLIC_API_BASE_URL 显式覆盖，例如：
 * NEXT_PUBLIC_API_BASE_URL=http://localhost:7001/api
 */
export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// 上传功能暂未启用，但保留同源地址供未来恢复时使用。
export const IMG_UPLOAD_URL = apiUrl("/upload/image");

// OSS 通常直接返回绝对路径，因此不需要前缀
export const IMG_ACCESS_URL_PREFIX = "";
