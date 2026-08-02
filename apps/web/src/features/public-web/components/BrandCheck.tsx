/** Inline brand check — avoids Font Awesome (~440KB CSS). */
export function BrandCheck({ className = "" }: { className?: string }) {
  return (
    <span className={`nv-check ${className}`.trim()} aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="8" fill="#0084FF" />
        <path
          d="M4.5 8.2L6.8 10.5L11.5 5.5"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
