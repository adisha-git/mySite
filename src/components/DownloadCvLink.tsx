import { Download } from "lucide-react";
import { profile } from "@/data/profile";
import { buttonClass } from "./ui";

interface DownloadCvLinkProps {
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  label?: string;
}

export function DownloadCvLink({
  variant = "primary",
  className = "",
  label = "Download CV",
}: DownloadCvLinkProps) {
  return (
    <a
      href={profile.cv.href}
      download={profile.cv.fileName}
      className={buttonClass(variant, className)}
    >
      <Download aria-hidden="true" className="size-4" />
      {label}
    </a>
  );
}
