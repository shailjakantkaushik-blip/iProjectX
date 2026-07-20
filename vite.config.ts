// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro, VITE_* env injection, @ path alias, etc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Pin Nitro to Vercel when deploying from this repo (outside Lovable sandbox).
  // Cloudflare remains available as R2 storage via env vars (see src/lib/cloudflare-r2.ts).
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
