const logos = [
  "Meta Ads",
  "Google Ads",
  "WhatsApp Business",
  "Stripe",
  "Twilio",
  "Zapier",
  "Mailchimp",
  "TikTok Ads",
  "Shopify",
  "HubSpot",
];

function LogoPill({ name }: { name: string }) {
  return (
    <span className="mx-3 inline-flex items-center gap-2 rounded-full border border-[#e8eef8] bg-white px-5 py-2.5 text-sm font-semibold text-[#07122a] shadow-sm">
      <svg className="size-4 text-[#1a7fc4]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <circle cx="12" cy="12" r="8" />
      </svg>
      {name}
    </span>
  );
}

export function HomeLogoMarquee() {
  const track = [...logos, ...logos];

  return (
    <section className="overflow-hidden bg-white py-14">
      <h2 className="mb-8 text-center text-xl font-semibold text-[#07122a] md:text-2xl">
        Conectado con las herramientas que ya usas
      </h2>
      <div className="relative flex overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {track.map((name, i) => (
            <LogoPill key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
