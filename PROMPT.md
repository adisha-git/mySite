# Build: Adisha Madhushanka — Personal Portfolio Website

You are building a production-ready personal portfolio website for **Adisha Madhushanka**, a Senior Software Engineer based in Brisbane. It is more than an online CV. Recruiters and hiring managers should be able to land on it, understand in 10 seconds who he is and what he builds, browse real projects with the tech stack behind each one, download his CV, and contact him directly.

Work through this in stages: scaffold → design system → sections → contact form → SEO/performance → QA. Before writing code, briefly propose the folder structure and component list, then proceed.

---

## 1. Tech stack

- **Next.js (latest stable, App Router)** with **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **Framer Motion** for animation
- **React Hook Form + Zod** for the contact form
- **Resend** for sending contact-form emails, via a Next.js Route Handler (`app/api/contact/route.ts`). Do **not** use static export, because the form needs a server route.
- **next/font** for fonts, **next/image** for images, **lucide-react** for icons
- Deploy target: **Vercel**
- ESLint + Prettier configured; no `any` types

Keep all personal content in a single typed data file (`src/data/profile.ts`) so it can be edited without touching components.

---

## 2. Design direction — "modern and classic"

Think: editorial, confident, calm. A well-typeset magazine profile, not a flashy template.

**Colour palette** (define as CSS variables / Tailwind theme tokens, support light and dark mode):

| Token     | Light                     | Dark      | Use                                    |
| --------- | ------------------------- | --------- | -------------------------------------- |
| `ink`     | `#0F1B2D` (deep navy)     | `#E9E4DA` | Primary text, headings                 |
| `paper`   | `#F7F4EE` (warm ivory)    | `#0B1320` | Page background                        |
| `surface` | `#FFFFFF`                 | `#122036` | Cards                                  |
| `accent`  | `#B08D57` (antique brass) | `#C9A46A` | Links, highlights, underlines, buttons |
| `muted`   | `#5B6575`                 | `#9AA4B2` | Secondary text                         |
| `line`    | `#E3DDD2`                 | `#1F2E45` | Borders, dividers                      |

- Default to the user's system theme; include a theme toggle in the nav. Check WCAG AA contrast for every text/background pair.

**Typography**

- Headings: a classic serif, e.g. **Fraunces** or **Playfair Display**
- Body and UI: a clean modern sans, e.g. **Inter** or **Geist**
- Tech stack tags / small labels: **JetBrains Mono**, small caps or uppercase with letter-spacing

**Layout**

- Generous whitespace, max content width ~1200px, strong grid
- Thin brass hairline dividers between sections
- Subtle paper-grain or very faint grid texture in the hero background (CSS only, low opacity)

**Animation** (Framer Motion — tasteful, never distracting)

- Hero: name and title reveal word-by-word with a soft fade-up; a thin brass line draws in underneath
- Sections fade/slide up on scroll (`whileInView`, once only)
- Project cards: lift slightly with shadow on hover; the screenshot zooms subtly inside its frame
- Experience timeline: the vertical line draws as the user scrolls
- Tech stack tags: stagger in
- Nav: becomes solid with a backdrop blur after scrolling; active section is highlighted
- **Respect `prefers-reduced-motion`** — disable non-essential motion when set

---

## 3. Site structure (single page with anchored sections + nav)

### Navigation

Sticky top bar: name/monogram "AM" on the left; links to About, Work, Experience, Skills, Contact; a **"Download CV"** button in the accent colour; theme toggle. Mobile: animated hamburger menu.

### 3.1 Hero

- Name: **Adisha Madhushanka**
- Title: **Senior Software Engineer**
- One-liner: "9+ years building secure, high-scale web applications for banking, aviation and telecommunications — React, Next.js, TypeScript, Node.js and AWS."
- Status badges (small pill chips):
  - 📍 Based in Brisbane, QLD
  - ✅ Unrestricted Australian working rights
  - 🟢 Open to opportunities
- **Relocation line, clearly visible:** "Open to relocating to **Sydney, Melbourne or Adelaide** for the right opportunity."
- Two CTAs: **"View my work"** (scrolls to Work) and **"Get in touch"** (scrolls to Contact). Secondary link: **Download CV**.
- Small social row: Email, LinkedIn.

### 3.2 About

Short, warm, first-person paragraph (3–4 sentences) based on the professional summary: 9+ years; enterprise banking (OCBC, DBS), aviation (Singapore Airlines), telecom (Dialog Axiata); led frontend architecture and mentored engineers; works with modern AI-assisted and agentic development (Claude Code, GitHub Copilot, AI coding agents, RAG).

Alongside it, a "quick facts" panel with animated count-up numbers:

- **9+** years experience
- **5** industries (banking, aviation, telecom, healthcare, enterprise)
- **Millions** of users served (Singapore Airlines Manage Booking, MyDialog app)
- **3** countries worked across (Sri Lanka, Singapore, Australia/NZ clients)

### 3.3 Selected Work (portfolio)

Responsive grid of project cards. Each card shows: screenshot (in a minimal browser-frame mockup), project name, one-line description, **tech stack tags**, status badge, and a "Visit site ↗" link (opens in new tab, `rel="noopener noreferrer"`). Include a filter bar above the grid: All · Next.js · AWS · WordPress · Full-stack.

Projects (write a concise, professional one-line description for each based on the site's purpose — visit the URL to understand it if you can):

1. **Sri Aero** — https://sri-aero.vercel.app/ — Status: _In progress_
   Stack: Next.js (App Router, static export) · React · TypeScript · Tailwind CSS · Framer Motion · SVG animation · JSON-LD SEO · Vercel
2. **Dhanesha Chemicals & Fertilisers** — https://www.dhaneshachemicalsandfertilisers.com/ — Status: _In progress_
   Stack: Next.js (App Router, static export) · React · TypeScript · Tailwind CSS · JSON-LD SEO · Vercel
3. **TGS (New Zealand)** — https://www.tgs.co.nz/ — Status: _Live_
   Stack: Next.js · React · AWS Lambda · Amazon CloudFront (CDN)
4. **MindLogics** — https://mindlogics.co.nz/ — Status: _Live_
   Stack: Next.js · React · AWS Lambda · Amazon CloudFront (CDN)
5. **HeyKitty** — https://heykitty.net/ — Status: _Live_
   Stack: WordPress · PHP · cPanel
6. **AI Lead-Capture Chatbot Plugin** — no public URL — Status: _Demo on request_
   Description: An embeddable chatbot widget that businesses add to their website to engage visitors and capture qualified leads.
   Stack: React · JavaScript · Node.js · Express.js · PostgreSQL
   Instead of "Visit site", show a **"Request a demo"** button that scrolls to the contact form and pre-fills the subject.

**Screenshots:** store in `public/projects/`. Use Playwright to capture a 1440×900 screenshot of each live URL and save as optimised WebP. If capture fails, generate a tasteful placeholder (project initials on a brass/navy gradient) and leave a `TODO` comment. For the chatbot, design a simple illustrated mock of a chat widget instead.

### 3.4 Experience

Animated vertical timeline, most recent first. Each entry: role, company, location, dates, 2–3 key achievements (condensed from the CV), and tech tags. Make entries expandable ("Show more") on mobile.

- **Senior Software Engineer** — MindLogics Limited — Jan 2026 – Aug 2026
  React/Next.js apps, reusable components and REST integration; AI-assisted development with Claude Code, GitHub Copilot and AI coding agents; LLM, agentic workflow and RAG solutions.
  Tags: React, React Native, Next.js, TypeScript, RAG, LLM integration, Redis, JWT, CI/CD
- **Senior Software Engineer (AVP)** — OCBC Bank, Singapore — Mar 2022 – Jan 2026
  Led frontend architecture across multiple product teams for retail and corporate banking; React apps integrated with Java Spring Boot microservices in a high-availability environment; mentored junior and mid-level engineers.
  Tags: React, JavaScript, Java, Spring Boot, Docker, OpenShift, Jenkins, PostgreSQL, Redis
- **Senior Software Engineer (React)** — Singapore Airlines (via ITCAN), Singapore — Mar 2020 – Mar 2022
  Built the Manage Booking platform serving millions of customer transactions annually; architected strongly typed reusable component libraries; Redux state management for complex multi-step booking flows.
  Tags: React, Redux, AWS, Node.js, Material UI
- **React JS Developer** — DBS Bank, Singapore — Oct 2019 – Mar 2020
  digibank platform: account management, fund transfers, bill payments; Redux store architecture for financial workflows; web and React Native apps.
  Tags: React, React Native, Redux, TypeScript
- **Software Engineer** — Innovative Software Engineering, Colombo — Aug 2018 – Oct 2019
  CareView (UK NHS integrated care record) with Keycloak auth and GDPR-compliant data handling; GPF ERP modules; component libraries with code splitting and lazy loading.
  Tags: React, Next.js, Redux, Node.js, Keycloak, AWS
- **Software Engineer** — Omobio, Colombo — Jun 2017 – Aug 2018
  React Native apps for Dialog Axiata serving millions of users, including MyDialog (350+ telecom services) and the O2A Retailer onboarding app; Appium test automation.
  Tags: React Native, React, Redux, Appium
- **Associate Software Engineer** — WAD International, Colombo — Jul 2015 – Jul 2016
  WordPress/Drupal sites for corporate and hospitality clients.
  Tags: WordPress, PHP, JavaScript, Bootstrap

**Education** (small card below the timeline): BEng (Hons) Software Engineering — University of Westminster, 2013–2017.

### 3.5 Skills / Tech Stack

Grouped tag clouds or cards with small icons (use simple-icons via `react-icons/si` where available). Highlight the core stack visually (larger or accent-outlined) — React, Next.js, TypeScript, Node.js, AWS.

- **Languages:** JavaScript, TypeScript, HTML, CSS, SASS, Python, SQL
- **Frontend:** React, Next.js, React Native, Redux, Context API, Tailwind CSS, Material UI, Bootstrap
- **Backend:** Node.js, Express.js, REST APIs, Microservices, JWT auth
- **AI & Agentic Development:** Claude Code, GitHub Copilot, AI coding agents, RAG, prompt engineering, LLM integration, AWS Bedrock, SageMaker
- **Cloud – AWS:** ECS, Lambda, API Gateway, Step Functions, RDS, VPC, SNS, Amplify, CloudFront, CodePipeline, CloudWatch
- **Cloud – Google:** Firebase, Cloud Functions
- **Databases:** PostgreSQL, MongoDB, MySQL, MSSQL, Redis
- **DevOps & Tooling:** Docker, Docker Compose, Jenkins, Bitbucket Pipelines, Git, Webpack, Vercel
- **Testing:** Jest, Mocha, Appium
- **CMS:** WordPress, Strapi, Drupal
- **Mobile Delivery:** App Store Connect, TestFlight, Google Play Console, App Center
- **Ways of working:** Agile (Scrum/Kanban), code reviews, mentoring, Jira, Confluence

### 3.6 Contact

Heading: "Let's work together." Short line: "Whether you're hiring or have a project in mind, I'd love to hear from you. I usually reply within one business day."

Left column — direct details:

- Email: adisha.madhushanka@gmail.com (mailto link + copy-to-clipboard button with toast)
- LinkedIn: `TODO_LINKEDIN_URL` (placeholder — I will fill this in)
- Location: Brisbane, QLD · Open to Sydney, Melbourne, Adelaide
- Phone: do **not** render it publicly by default; put it in `profile.ts` behind a `showPhone: false` flag

Right column — contact form:

- Fields: Name*, Email*, Company, Enquiry type (select: Job opportunity / Contract / Freelance project / Chatbot demo / Other), Message*
- Client + server validation with the same Zod schema
- Spam protection: hidden honeypot field + simple in-memory rate limit per IP in the route handler
- `POST /api/contact` sends an email via Resend to `CONTACT_TO_EMAIL`, with `reply_to` set to the sender
- Loading, success and error states with animation; button disabled while sending
- Env vars: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` — add a `.env.example`

### 3.7 Footer

Name, short tagline, nav links, Download CV, social icons, "Built with Next.js, TypeScript, Tailwind CSS & Framer Motion — deployed on Vercel", © year (computed dynamically).

---

## 4. CV download

- The CV PDF lives at `public/Adisha-Madhushanka-CV.pdf` (I will add the file; create a placeholder and a `TODO` if it is missing).
- Every "Download CV" button uses the `download` attribute with that filename.
- Also provide a `/cv` route that redirects to the PDF so a short link can be shared.

---

## 5. SEO, metadata & accessibility

- Next.js Metadata API: title "Adisha Madhushanka — Senior Software Engineer | React, Next.js, TypeScript", description, keywords, canonical URL (`NEXT_PUBLIC_SITE_URL`)
- Open Graph and Twitter cards with a generated OG image (`app/opengraph-image.tsx`) in the site's palette
- JSON-LD `Person` schema: name, jobTitle, email, address (Brisbane, QLD, AU), `sameAs` LinkedIn, `knowsAbout` core skills
- `sitemap.ts`, `robots.ts`, favicon/monogram icon
- Semantic HTML, one `h1`, skip-to-content link, visible focus rings in the accent colour, alt text on every image, full keyboard navigation, labelled form fields with accessible error messages

---

## 6. Performance targets

- Lighthouse ≥ 95 for Performance, Accessibility, Best Practices and SEO on mobile
- Server Components by default; only animated or interactive pieces are Client Components
- Lazy-load below-the-fold images; preload hero fonts only
- No layout shift from fonts or images

---

## 7. Deliverables & finish

1. Complete working project that runs with `npm run dev` and builds cleanly with `npm run build` (no type or lint errors)
2. `README.md` covering: local setup, how to edit content in `profile.ts`, how to add a project, how to replace the CV, environment variables, and how to deploy to Vercel (including adding a custom domain)
3. Run the build, fix any errors, and do a final review pass at 375px, 768px and 1440px widths in both light and dark mode
4. List any `TODO`s I need to complete (LinkedIn URL, CV PDF, Resend key, domain)
