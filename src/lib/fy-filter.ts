/** Re-export shim — implementation lives in portfolio-engine.ts for Lovable/Vercel sync reliability. */
export {
  FY_KEY,
  FY_OPTIONS,
  readFyFilter,
  writeFyFilter,
  useFyFilter,
  projectFySpan,
  matchesFyFilter,
} from "@/lib/portfolio-engine";
export type { FyOption } from "@/lib/portfolio-engine";
