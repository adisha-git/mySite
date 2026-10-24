# Adisha Madhushanka — Portfolio

Personal portfolio site: a single page with About, AI & agentic development, Work, Experience, Skills and Contact sections, a downloadable CV, and a contact form that emails you via [Resend](https://resend.com).

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Tailwind CSS 4 · Framer Motion · React Hook Form + Zod · Resend · deployed on Vercel.

---

## Local setup

Requires Node.js 20.9+ (developed on Node 24).

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

| Script                | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Development server                             |
| `npm run build`       | Production build (type-checks too)             |
| `npm start`           | Serve the production build                     |
| `npm run lint`        | ESLint                                         |
| `npm run typecheck`   | TypeScript only                                |
| `npm run format`      | Prettier (with Tailwind class sorting)         |
| `npm run screenshots` | Re-capture project screenshots with Playwright |

The contact form works without env vars in development; it just returns a friendly "not configured yet" error.

---

## Editing content

**Everything personal lives in [`src/data/profile.ts`](src/data/profile.ts).** You don't need to touch any components to change:

- name, title, one-liner, location, relocation cities, work-rights and availability badges
- email, LinkedIn URL, phone (hidden unless `showPhone: true`)
- the AI section (`ai`): capabilities, RAG steps and principles, plus the hero's "Now building…" line (`heroNow`)
- About paragraphs and the four "quick facts" (numbers count up; text values like "Millions" are shown as-is)
- projects, experience, education, skills, and which skills are highlighted as "core"
- contact heading/intro and the enquiry types in the form's dropdown

The file is fully typed, so the build will tell you if you miss a field.

### LinkedIn

Set `linkedin` to your profile URL. Until it starts with `http`, the LinkedIn links are hidden (the Contact section shows "Available on request") and it's left out of the JSON-LD `sameAs`.

### Adding a project

1. Add an entry to `profile.projects`:

   ```ts
   {
     slug: "my-project",                 // unique, also used for the screenshot filename
     name: "My Project",
     description: "One line on what it is and who it's for.",
     url: "https://example.com",         // omit for private work → shows "Request a demo"
     status: "Live",                     // "Live" | "In progress" | "Demo on request"
     stack: ["Next.js", "TypeScript"],
     categories: ["Next.js"],            // which filter buttons show it: Next.js | AWS | WordPress | Full-stack
     image: "/projects/my-project.webp", // omit for a generated initials placeholder
     imageAlt: "Describe what the screenshot shows.",
   }
   ```

2. Add a screenshot. Either drop a 1440×900 WebP into `public/projects/`, or add `{ slug, url }` to the `targets` list in [`scripts/capture-screenshots.mjs`](scripts/capture-screenshots.mjs) and run:

   ```bash
   npx playwright install chromium   # first time only
   npm run screenshots
   ```

### Replacing the CV

Overwrite `public/Adisha-Madhushanka-CV.pdf` with the new file, keeping the same name. Every "Download CV" button and the short link **`/cv`** point at it. If you rename it, update `profile.cv` too.

---

## Environment variables

| Variable               | Required   | Description                                                                                                                                          |
| ---------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Production | Full public URL, e.g. `https://adisha.dev`. Used for the canonical URL, sitemap, robots and Open Graph tags.                                         |
| `RESEND_API_KEY`       | Yes        | API key from [resend.com/api-keys](https://resend.com/api-keys).                                                                                     |
| `CONTACT_TO_EMAIL`     | Yes        | Inbox that receives enquiries.                                                                                                                       |
| `CONTACT_FROM_EMAIL`   | Yes        | Sender, e.g. `Portfolio <hello@your-domain.com>`. Must be on a domain verified in Resend. Use `onboarding@resend.dev` to test before you verify one. |

The sender's address is set as `reply_to`, so you can reply straight from your inbox.

**Spam protection:** a hidden honeypot field, plus an in-memory rate limit of 5 messages per IP per 10 minutes. The limit is per server instance, so it stops bursts rather than enforcing a global quota. That's plenty for a portfolio; swap in Upstash/Vercel KV if you ever need more.

---

## Deploying to Vercel

1. Push this folder to a GitHub/GitLab/Bitbucket repository.
2. In Vercel, choose **Add New → Project**, import the repo, and keep the detected Next.js defaults.
3. Under **Settings → Environment Variables**, add the four variables above for Production (and Preview if you like).
4. Deploy.

### Custom domain

1. In the project, open **Settings → Domains → Add** and enter your domain (e.g. `adisha.dev`, and `www.adisha.dev` if you want it).
2. Add the DNS records Vercel shows at your registrar: an `A` record for the apex domain and a `CNAME` for `www`. Or point the domain's nameservers at Vercel.
3. Once it's verified (HTTPS is issued automatically), set `NEXT_PUBLIC_SITE_URL` to `https://your-domain` and redeploy so canonical/OG/sitemap URLs use it.
4. In Resend, verify the same domain (**Domains → Add**, then add its DNS records) and set `CONTACT_FROM_EMAIL` to an address on it.

---

## Project structure

```
src/
  app/
    layout.tsx            fonts, metadata, theme script, nav/footer
    page.tsx              sections + JSON-LD Person schema
    api/contact/route.ts  Resend email handler (validation, honeypot, rate limit)
    cv/route.ts           /cv → CV PDF redirect
    opengraph-image.tsx   generated OG/Twitter image
    sitemap.ts, robots.ts, icon.svg
    globals.css           colour tokens (light/dark), Tailwind theme, hero CSS animation
  components/             one file per section + small client pieces
  data/profile.ts         ← all content
  lib/                    shared Zod schema, rate limiter, site constants
public/
  Adisha-Madhushanka-CV.pdf
  projects/*.webp
scripts/capture-screenshots.mjs
```

### Notes

- **Theme:** dark unless the visitor picks light with the toggle; the choice is saved in `localStorage`. An inline script applies it before first paint, so there's no flash.
- **Motion:** respects `prefers-reduced-motion`. The hero reveal uses CSS instead of Framer Motion so the headline paints before JavaScript loads, which keeps LCP fast. Framer Motion's features are lazy-loaded for the same reason.
- **Look & feel:** dark by default (visitors can switch to light; the choice is remembered). Accents come from the stack: React cyan (`--accent`) and TypeScript blue (`--accent-2`). The hero has a code-grid backdrop, slowly turning React orbit rings and floating stack logos (`TechBackdrop.tsx`), plus an `engineer.ts` code card built from `profile.ts` (`CodeCard.tsx`). All colour tokens, including syntax-highlight colours, are CSS variables at the top of `src/app/globals.css`, and every text/background pair meets WCAG AA in both themes. A few fixed colours also live in `src/app/icon.svg`, `src/app/opengraph-image.tsx` and the chatbot mock in `ProjectVisual.tsx`.
