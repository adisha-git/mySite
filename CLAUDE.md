@AGENTS.md

# Portfolio AI chat

## Goal

An "Ask about Adisha" chat on the portfolio. Answers ONLY from content/knowledge.
Must stay reusable for other sites later.

## Rules

- src/lib/chat/ is portable: never import from src/app/, src/components/ or other site code.
  Site-specific values come from src/lib/chat/config.ts.
- Facts in src/lib/chat/facts.ts are served verbatim, never paraphrased by the model.
- Every API route: rate limit + input length check before any LLM call.
- Never log API keys, raw IPs (hash them) or full JDs in plain logs.
- TypeScript strict. Zod for all external input and tool schemas.
- Don't change the existing contact form (src/app/api/contact, src/lib/contact-*).

## Stack

Next.js App Router, Vercel AI SDK (@ai-sdk/anthropic), Claude Haiku 5.5 for chat,
Claude Sonnet 5.5 for fit check, Voyage voyage-4-lite embeddings (1024 dims),
Neon Postgres + pgvector, Drizzle, Upstash Redis + @upstash/ratelimit,
Resend, Cloudflare Turnstile, Tailwind, Framer Motion.

## Commands

This repo uses npm, not pnpm.

- npm run dev / npm run build
- npm run db:generate # generate a migration from src/lib/chat/db/schema.ts
- npm run db:migrate # apply migrations to DATABASE_URL
- npm run ingest # re-embed content/knowledge
- npm run evals # run eval suite; must pass before merging prompt changes

## Style

Match the site: dark theme (#070B12), cyan accents, terminal touches.
Respect prefers-reduced-motion. Widget is lazy-loaded.
