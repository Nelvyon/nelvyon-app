import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";

const LOGOS = [
  { name: "Google", color: "#4285F4" },
  { name: "Meta", color: "#0668E1" },
  { name: "OpenAI", color: "#10A37F" },
  { name: "Stripe", color: "#635BFF" },
  { name: "TikTok", color: "#EE1D52" },
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "Klaviyo", color: "#2DD881" },
  { name: "Twilio", color: "#F22F46" },
  { name: "Shopify", color: "#96BF48" },
  { name: "HubSpot", color: "#FF7A59" },
] as const;

function LogoPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold"
      style={{
        borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.04)",
        color: BRAND.textMuted,
      }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function LandingLogosMarquee() {
  const row = [...LOGOS, ...LOGOS];

  return (
    <section
      className="border-y py-12 md:py-16"
      style={{
        backgroundColor: BRAND.bgSoft,
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest" style={{ color: BRAND.textDim }}>
            Integrado con las mejores plataformas del mundo
          </p>
        </FadeIn>
      </div>
      <div className="relative overflow-hidden">
        <div className="nelvyon-marquee flex gap-6 whitespace-nowrap px-4">
          {row.map((logo, i) => (
            <LogoPill color={logo.color} key={`${logo.name}-${i}`} name={logo.name} />
          ))}
        </div>
      </div>
    </section>
  );
}
