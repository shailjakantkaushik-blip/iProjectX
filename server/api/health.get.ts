import { defineEventHandler } from "h3";
import { getServiceStatus } from "../../src/lib/env";
import { isR2Configured } from "../../src/lib/cloudflare-r2";
import { isStripeConfigured } from "../../src/lib/stripe";

export default defineEventHandler(() => {
  const status = getServiceStatus();
  return {
    ok: true,
    services: {
      ...status,
      stripe: isStripeConfigured(),
      cloudflareR2: isR2Configured(),
    },
  };
});
