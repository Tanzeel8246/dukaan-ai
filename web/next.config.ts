import type { NextConfig } from "next";

/**
 * Two build targets:
 *
 *  - DEFAULT (`npm run build`): a Node server build for Vercel. This is
 *    the PRODUCTION target — it enables the /api/chat route handler
 *    (Gemini, key from server env) alongside Firebase Auth + Firestore.
 *
 *  - STATIC (`npm run build:static`, sets NEXT_STATIC_EXPORT=1): the
 *    original pure static export uploaded AS-IS to the
 *    dukaan-ai.codehubb.com subdomain docroot — the public demo. The API
 *    route is set aside for this build (see tools/build-static.mjs) and
 *    the assistant runs on the on-device intent engine.
 *
 * NO basePath either way: the app deploys at a (sub)domain ROOT.
 * trailingSlash emits /inventory/index.html style files for plain hosts.
 */
const staticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
