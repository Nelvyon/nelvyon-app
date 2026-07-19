import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "NELVYON — Agencia de Marketing Digital con IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(135deg, #020817 0%, #0a1628 50%, #001a33 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", color: "#0084ff" }}>
          NELVYON
        </div>
        <div style={{ marginTop: 24, fontSize: 36, fontWeight: 500, maxWidth: 900, lineHeight: 1.25 }}>
          Agencia de marketing digital con inteligencia artificial
        </div>
        <div style={{ marginTop: 40, fontSize: 22, color: "rgba(255,255,255,0.55)" }}>
          SEO · Ads · Email · Webs · Automatización
        </div>
      </div>
    ),
    { ...size },
  );
}
