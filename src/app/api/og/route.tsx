import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const runtime = "edge";

// Dynamic Open Graph / Twitter social card (1200×630).
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #0a8d6e 0%, #0b6f58 60%, #16110f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#ffffff",
              color: "#0a8d6e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800
            }}
          >
            R
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
            Student roommates & rooms across Kazakhstan
          </div>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.82)", maxWidth: 860 }}>
            Match by budget, university, and lifestyle — then chat before you move in.
          </div>
        </div>

        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.7)" }}>{siteConfig.url.replace(/^https?:\/\//, "")}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
