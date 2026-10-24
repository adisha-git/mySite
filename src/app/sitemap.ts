import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/Adisha-Madhushanka-CV.pdf`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
