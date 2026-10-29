"use client";

import { Download } from "lucide-react";
import { profile } from "@/data/profile";
import { track, type CvPlacement } from "@/lib/analytics";
import { buttonClass } from "./ui";

interface DownloadCvLinkProps {
  /** Where the button is, reported with cv_download_click. */
  placement: CvPlacement;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  label?: string;
}

export function DownloadCvLink({
  placement,
  variant = "primary",
  className = "",
  label = "Download CV",
}: DownloadCvLinkProps) {
  return (
    <a
      href={profile.cv.href}
      download={profile.cv.fileName}
      className={buttonClass(variant, className)}
      // Measures the click, not a completed download.
      onClick={() => track("cv_download_click", { placement })}
    >
      <Download aria-hidden="true" className="size-4" />
      {label}
    </a>
  );
}
