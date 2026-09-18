import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

const proxyTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

describe("next.config rewrites", () => {
  it("proxies /api to Django preserving the trailing slash", async () => {
    const rewrites = await nextConfig.rewrites!();
    const rules = Array.isArray(rewrites)
      ? rewrites
      : (rewrites.beforeFiles ?? []);

    const slashRule = rules.find((rule) => rule.source.endsWith("/"));

    expect(slashRule).toBeDefined();
    expect(slashRule!.source).toBe("/api/:path*/");
    expect(slashRule!.destination).toBe(`${proxyTarget}/api/:path*/`);
  });

  it("keeps Next from stripping the trailing slash before the rewrite", () => {
    expect(nextConfig.skipTrailingSlashRedirect).toBe(true);
  });
});
