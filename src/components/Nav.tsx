"use client";

import { AnimatePresence, m } from "framer-motion";
import { useEffect, useState } from "react";
import { navLinks, profile, type SectionId } from "@/data/profile";
import { DownloadCvLink } from "./DownloadCvLink";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<SectionId | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section occupying the middle band of the viewport.
  useEffect(() => {
    const sections = navLinks
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SectionId);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    const onTop = () => {
      if (window.scrollY < 200) setActive(null);
    };
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid
          ? "border-line bg-paper/80 border-b backdrop-blur-md backdrop-saturate-150"
          : "border-b border-transparent"
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8"
      >
        <a href="#top" className="group flex items-center gap-3">
          <span
            aria-hidden="true"
            className="border-accent text-ink group-hover:bg-accent group-hover:text-on-accent flex size-9 items-center justify-center rounded-lg border font-mono text-[13px] font-semibold transition-colors"
          >
            {profile.initials}
          </span>
          <span className="lg:font-display sr-only lg:not-sr-only lg:text-[17px] lg:font-semibold lg:tracking-tight">
            {profile.name}
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ id, label }) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative rounded-full px-3 py-2 text-sm transition-colors ${
                    isActive ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                  {isActive ? (
                    <m.span
                      layoutId="nav-active"
                      className="bg-accent absolute inset-x-3 -bottom-0.5 h-px"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1 sm:gap-2">
          <DownloadCvLink placement="nav" className="hidden !px-4 !py-2 sm:inline-flex" />
          <ThemeToggle />
          <button
            type="button"
            className="text-ink hover:bg-ink/5 inline-flex size-10 items-center justify-center rounded-full md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span
                className={`bg-ink absolute left-0 h-px w-5 transition-transform duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`bg-ink absolute top-1.5 left-0 h-px w-5 transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`bg-ink absolute left-0 h-px w-5 transition-transform duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <m.div
            id="mobile-menu"
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden md:hidden"
          >
            <ul className="border-line mx-5 flex flex-col border-t py-4">
              {navLinks.map(({ id, label }, i) => (
                <m.li
                  key={id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i + 0.05 }}
                >
                  <a
                    href={`#${id}`}
                    onClick={() => setOpen(false)}
                    className={`font-display block py-3 text-2xl font-semibold ${
                      active === id ? "text-accent-text" : "text-ink"
                    }`}
                  >
                    {label}
                  </a>
                </m.li>
              ))}
              <li className="pt-4">
                <DownloadCvLink placement="nav_mobile_menu" className="w-full" />
              </li>
            </ul>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
