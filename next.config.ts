import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    const opaqueIframeAssetHeaders = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
      { key: "Timing-Allow-Origin", value: "*" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ];
    return [
      {
        source: "/vendor/three/:path*",
        headers: opaqueIframeAssetHeaders,
      },
      {
        source: "/games/:game/:model/assets/:path*",
        headers: opaqueIframeAssetHeaders,
      },
    ];
  },
};

export default nextConfig;
