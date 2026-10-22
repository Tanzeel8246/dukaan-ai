import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE_URL = "https://dukaan-ai.codehubb.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/sales",
    "/billing",
    "/inventory",
    "/forecast",
    "/suppliers",
    "/customers",
    "/credit",
    "/expenses",
    "/finance",
    "/day-close",
    "/assistant",
    "/settings",
  ];
  const now = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
