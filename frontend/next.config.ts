import type { NextConfig } from "next";

function resolveBackendUrl(): string {
  const configuredBackendUrl = process.env.BACKEND_URL?.trim();

  if (configuredBackendUrl === undefined || configuredBackendUrl.length === 0) {
    return "http://localhost:7001";
  }

  return configuredBackendUrl.replace(/\/+$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${resolveBackendUrl()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
