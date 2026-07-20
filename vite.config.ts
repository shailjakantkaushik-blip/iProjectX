// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro, VITE_* env injection, @ path alias, etc.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Nested under `vite` so Lovable forwards to Vite UserConfig.
  // Expose Vercel NEXT_PUBLIC_* keys to the client bundle (in addition to VITE_*).
  vite: {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    resolve: {
      alias: {
        // Map legacy module paths onto files that already existed in the repo so
        // Lovable/Vercel snapshots that drop newly-added lib files still build.
        "@/lib/domain": path.resolve(rootDir, "src/lib/portfolio-engine.ts"),
        "@/lib/fy-filter": path.resolve(rootDir, "src/lib/portfolio-engine.ts"),
        "@/lib/ppt-export": path.resolve(rootDir, "src/lib/excel.ts"),
      },
    },
  },
  // Pin Nitro to Vercel when deploying from this repo (outside Lovable sandbox).
  // Cloudflare remains available as R2 storage via env vars (see src/lib/cloudflare-r2.ts).
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
