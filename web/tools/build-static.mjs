// Dukaan AI — static demo build.
//
// Produces the pure static export (out/) for plain subdomain hosting and
// refreshes ../web-deploy with it. The /api/chat route handler cannot be
// statically exported, so it is moved aside for the duration of the build
// and restored afterwards (the chat UI falls back to the on-device intent
// engine when the route is absent — by design).
//
// Usage: npm run build:static

import { execSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = join(webDir, "app", "api");
const apiBak = join(webDir, ".api-route-backup");
const moved = existsSync(apiDir);

try {
  if (moved) renameSync(apiDir, apiBak);
  execSync("npx next build", {
    cwd: webDir,
    stdio: "inherit",
    env: { ...process.env, NEXT_STATIC_EXPORT: "1" },
  });
} finally {
  if (moved) renameSync(apiBak, apiDir);
}

const deployDir = join(webDir, "..", "web-deploy");
const zipFile = join(webDir, "..", "web-deploy.zip");
rmSync(deployDir, { recursive: true, force: true });
cpSync(join(webDir, "out"), deployDir, { recursive: true });
console.log("Static demo bundle refreshed at ../web-deploy");

try {
  rmSync(zipFile, { force: true });
  execSync(`tar.exe -a -c -f "${zipFile}" *`, { cwd: deployDir });
  console.log("Standard POSIX web-deploy.zip generated at ../web-deploy.zip");
} catch (e) {
  console.warn("tar.exe zip archive creation skipped:", e.message);
}
