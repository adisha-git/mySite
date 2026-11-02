"use client";

import { ArrowRight, Target } from "lucide-react";
import { openChat } from "./chat/open-chat";

/** Hero link that opens the chat ready for a pasted job description (the fit check). */
export function FitCheckLink() {
  return (
    <button
      type="button"
      onClick={() => openChat({ placement: "hero_fit_check", mode: "jd" })}
      className="group text-accent-text decoration-accent text-left text-[15px] font-medium underline-offset-4 hover:underline"
    >
      <Target aria-hidden="true" className="mr-2 inline size-4 align-[-2px]" />
      Hiring? Paste your job description and check my fit
      <ArrowRight
        aria-hidden="true"
        className="ml-1.5 inline size-4 align-[-3px] transition-transform group-hover:translate-x-0.5"
      />
    </button>
  );
}
