import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Django обслуживает /api по путям со слешем и с APPEND_SLASH. Без этого
  // флага Next редиректит /api/foo/ на /api/foo, Django редиректит обратно,
  // и запрос зацикливается.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    const apiProxyTarget = (
      process.env.API_PROXY_TARGET ?? "http://localhost:8000"
    ).replace(/\/$/, "");

    return [
      {
        source: "/api/:path*/",
        destination: `${apiProxyTarget}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
