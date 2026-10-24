import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile } from "@/data/profile";

export const alt = `${profile.name} — ${profile.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "node_modules", "@fontsource", "inter", "files");

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([
    readFile(join(fontDir, "inter-latin-700-normal.woff")),
    readFile(join(fontDir, "inter-latin-400-normal.woff")),
  ]);
  const [first, ...rest] = profile.name.split(" ");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#070B12",
        backgroundImage:
          "radial-gradient(circle at 85% 20%, rgba(97,218,251,0.18), transparent 45%), radial-gradient(circle at 10% 90%, rgba(49,120,198,0.18), transparent 45%), linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 100% 100%, 64px 64px, 64px 64px",
        color: "#E6EDF3",
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", fontSize: 26, color: "#8B98AB" }}>
        {"~/portfolio $ whoami"}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: -4,
            gap: 24,
          }}
        >
          <span>{first}</span>
          <span style={{ color: "#61DAFB" }}>{rest.join(" ")}</span>
        </div>
        <div
          style={{
            width: 220,
            height: 3,
            backgroundImage: "linear-gradient(90deg, #61DAFB, #7AA7E8)",
            margin: "32px 0 26px",
          }}
        />
        <div style={{ display: "flex", fontSize: 38 }}>{profile.title}</div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {profile.coreSkills.map((skill) => (
          <div
            key={skill}
            style={{
              display: "flex",
              fontSize: 22,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #1A2433",
              background: "#0D1420",
              color: "#61DAFB",
            }}
          >
            {skill}
          </div>
        ))}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Inter", data: bold, style: "normal", weight: 700 },
        { name: "Inter", data: regular, style: "normal", weight: 400 },
      ],
    },
  );
}
