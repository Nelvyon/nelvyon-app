import { NELVYON_BLUE } from "./marketing-brand";

export function ServiciosHeroVisual() {
  return (
    <div className="nelvyon-servicios-visual" aria-hidden>
      <svg viewBox="0 0 400 320" className="nelvyon-servicios-visual__svg">
        <defs>
          <linearGradient id="srv-block" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c1a30" />
            <stop offset="100%" stopColor="#07122a" />
          </linearGradient>
        </defs>
        <rect x="40" y="180" width="120" height="80" rx="8" fill="url(#srv-block)" stroke="rgba(0,132,252,0.35)" />
        <rect x="140" y="120" width="120" height="80" rx="8" fill="url(#srv-block)" stroke="rgba(0,132,252,0.45)" />
        <rect x="240" y="60" width="120" height="80" rx="8" fill="url(#srv-block)" stroke={NELVYON_BLUE} strokeOpacity={0.55} />
        <line x1="100" y1="180" x2="200" y2="160" stroke={NELVYON_BLUE} strokeOpacity={0.4} strokeWidth={1.5} />
        <line x1="200" y1="160" x2="300" y2="100" stroke={NELVYON_BLUE} strokeOpacity={0.5} strokeWidth={1.5} />
        <circle cx="200" cy="200" r="36" fill="rgba(0,132,252,0.15)" stroke={NELVYON_BLUE} strokeOpacity={0.5} />
        <text x="200" y="206" textAnchor="middle" fill="#fff" fontSize={14} fontWeight={700}>
          NELVYON
        </text>
      </svg>
    </div>
  );
}
