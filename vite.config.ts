// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, nitro, VITE_* env injection, @ path alias, etc.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Nested under `vite` so Lovable forwards to Vite UserConfig.
  // Expose Vercel NEXT_PUBLIC_* keys to the client bundle (in addition to VITE_*).
  vite: {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
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
