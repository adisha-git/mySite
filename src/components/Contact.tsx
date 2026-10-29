import { Check, Mail, MapPin, Phone } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa6";
import type { ReactNode } from "react";
import { hasLinkedIn, profile } from "@/data/profile";
import { ContactForm } from "./ContactForm";
import { CopyEmail } from "./CopyEmail";
import { DownloadCvLink } from "./DownloadCvLink";
import { Reveal } from "./Reveal";
import { Section } from "./ui";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="border-line relative border-t py-5 pl-14">
      <dt className="label text-muted">
        <span className="border-line text-accent-text absolute top-5 left-0 flex size-10 items-center justify-center rounded-full border">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

export function Contact() {
  return (
    <Section
      id="contact"
      index="06"
      eyebrow="Contact"
      title={profile.contact.heading}
      intro={profile.contact.intro}
    >
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <div className="border-accent/40 bg-surface/70 mb-8 rounded-xl border p-5 sm:p-6">
            <h3 className="text-accent-text font-mono text-[13px]">
              <span aria-hidden="true" className="text-muted">
                {"// "}
              </span>
              what I&apos;m looking for
            </h3>
            <ul className="mt-4 space-y-2">
              {profile.jobSearch.roles.map((role) => (
                <li key={role} className="text-ink flex gap-3">
                  <Check aria-hidden="true" className="text-accent-text mt-1 size-4 shrink-0" />
                  {role}
                </li>
              ))}
            </ul>
            <p className="text-muted mt-4 text-sm leading-relaxed">
              Full-time · {profile.location.display} or relocating to{" "}
              {profile.relocation.join(", ")} · {profile.workRights}
            </p>
          </div>
          <dl>
            <Row icon={<Mail aria-hidden="true" className="size-4" />} label="Email">
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${profile.email}`}
                  className="text-ink decoration-accent min-w-0 break-all underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  {profile.email}
                </a>
                <CopyEmail email={profile.email} />
              </div>
            </Row>
            <Row icon={<FaLinkedinIn aria-hidden="true" className="size-4" />} label="LinkedIn">
              {hasLinkedIn ? (
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink decoration-accent underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  Connect on LinkedIn<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                // TODO: set profile.linkedin in src/data/profile.ts
                <span className="text-muted">Available on request</span>
              )}
            </Row>
            <Row icon={<MapPin aria-hidden="true" className="size-4" />} label="Location">
              <p className="text-ink">{profile.location.display}</p>
              <p className="text-muted mt-0.5 text-sm">Open to {profile.relocation.join(", ")}</p>
            </Row>
            {profile.showPhone ? (
              <Row icon={<Phone aria-hidden="true" className="size-4" />} label="Phone">
                <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="text-ink">
                  {profile.phone}
                </a>
              </Row>
            ) : null}
          </dl>
          <div className="border-line border-t pt-6">
            <DownloadCvLink placement="contact" variant="secondary" />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-7">
          <ContactForm />
        </Reveal>
      </div>
    </Section>
  );
}
