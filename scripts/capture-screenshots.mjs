// Captures 1440×900 screenshots of each live project and saves them as WebP
// in public/projects/. Run with: npm run screenshots
//
// Sites that fail to load are reported; the site falls back to a generated
// placeholder (see ProjectScreenshot) until a screenshot exists.

import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const targets = [
  { slug: "sri-aero", url: "https://sri-aero.vercel.app/" },
  {
    slug: "dhanesha",
    url: "https://www.dhaneshachemicalsandfertilisers.com/",
  },
  { slug: "tgs", url: "https://www.tgs.co.nz/" },
  { slug: "mindlogics", url: "https://mindlogics.co.nz/" },
  { slug: "heykitty", url: "https://heykitty.net/" },
];

const outDir = join(process.cwd(), "public", "projects");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});

const failures = [];

for (const { slug, url } of targets) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    // Give hero animations and lazy images a moment to settle.
    await page.waitForTimeout(2500);
    const meta = await page.evaluate(() => ({
      title: document.title,
      description:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    }));
    const png = await page.screenshot({ type: "png" });
    await sharp(png)
      .resize(1440, 900)
      .webp({ quality: 78 })
      .toFile(join(outDir, `${slug}.webp`));
    console.log(`✓ ${slug}  —  ${meta.title}\n    ${meta.description}`);
  } catch (error) {
    failures.push(slug);
    console.error(`✗ ${slug}: ${error instanceof Error ? error.message : error}`);
  } finally {
    await page.close();
  }
}

await browser.close();

if (failures.length > 0) {
  console.error(`\nFailed: ${failures.join(", ")} — placeholders will be shown.`);
  process.exitCode = 1;
}
