import { Mail } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";
import { hasLinkedIn, navLinks, profile } from "@/data/profile";
import { CurrentYear } from "./CurrentYear";
import { DownloadCvLink } from "./DownloadCvLink";

const iconLink =
  "border-line text-ink hover:border-accent hover:text-accent-text inline-flex size-10 items-center justify-center rounded-full border transition-colors";

export function Footer() {
  return (
    <footer className="border-line bg-surface/40 border-t">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="font-display text-2xl font-semibold tracking-tight">{profile.name}</p>
          <p className="text-muted mt-2 max-w-sm">
            {profile.title} · {profile.availability.toLowerCase()}.
          </p>
          <ul className="mt-6 flex gap-2" aria-label="Elsewhere">
            <li>
              <a
                href={`mailto:${profile.email}`}
                className={iconLink}
                aria-label={`Email ${profile.firstName}`}
              >
                <Mail aria-hidden="true" className="size-4" />
              </a>
            </li>
            {hasLinkedIn ? (
              <li>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconLink}
                  aria-label="LinkedIn profile (opens in a new tab)"
                >
                  <FaLinkedinIn aria-hidden="true" className="size-4" />
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <nav aria-label="Footer" className="md:col-span-3">
          <h2 className="label text-muted">Sections</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-1">
            {navLinks.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} className="text-ink/85 hover:text-accent-text transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="md:col-span-4">
          <h2 className="label text-muted">Résumé</h2>
          <p className="text-muted mt-4 text-sm">
            Full experience, skills and education in one PDF.
          </p>
          <DownloadCvLink className="mt-4" />
        </div>
      </div>

      <div className="border-line border-t">
        <div className="text-muted mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-6 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
          <p>
            © <CurrentYear /> {profile.name}. All rights reserved.
          </p>
          <p>
            Built with Next.js, TypeScript, Tailwind CSS &amp; Framer Motion — deployed on Vercel.
          </p>
        </div>
      </div>
    </footer>
  );
}
