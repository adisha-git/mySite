import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Tests must never see real credentials, even if a developer's shell has them.
    env: {
      RESEND_API_KEY: "",
      CONTACT_TO_EMAIL: "",
      KV_REST_API_URL: "",
      KV_REST_API_TOKEN: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      ANTHROPIC_API_KEY: "",
      VOYAGE_API_KEY: "",
      DATABASE_URL: "",
      IP_HASH_SALT: "",
      TURNSTILE_SECRET_KEY: "",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      LEAD_NOTIFY_EMAIL: "",
    },
  },
});
