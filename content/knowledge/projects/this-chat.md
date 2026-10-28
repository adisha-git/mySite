# This chat — Ask about Adisha

The assistant on adishamadhushanka.com.au

## How it works

This chat answers questions about Adisha using retrieval-augmented generation (RAG). Its knowledge is a set of Markdown files about Adisha's career and projects. On each deploy, an ingest script splits them into chunks by heading, embeds only the chunks that changed with Voyage AI (voyage-4-lite, 1024 dimensions), and stores them in Neon Postgres with pgvector.

For each question, it runs hybrid search: the 8 closest chunks by vector similarity and the 8 best by Postgres full-text search, merged with reciprocal rank fusion, keeping the best 6. Claude Haiku 5.5 then answers only from those chunks and a set of fixed facts, and says when it doesn't know. The source chips under each answer show which files the answer used.

## How it stays accurate and safe

Fixed facts such as his work rights and location are inserted word for word from configuration, so the model can't rephrase them. Questions about salary, references or private matters are handed off to Adisha. Each visitor is rate-limited, the first message of a chat passes a Cloudflare Turnstile bot check, and a chat is capped at 20 messages. Visitors' IP addresses are only stored as hashes.

If a visitor wants Adisha to get back to them, the chat drafts their details as a card. Nothing is saved or emailed until they check it and click Confirm; then the lead is stored and Adisha gets an email through Resend.

An evaluation suite of about 50 questions checks the answers for required facts, forbidden content and groundedness, using Claude Haiku as a judge.

## How it was built

Adisha built it with Next.js and the Vercel AI SDK, using AI-assisted development with Claude Code. The chat's core code is kept separate from the rest of the site, so it can be reused on other websites.
