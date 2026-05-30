import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/logo.png";

type NelvyonLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  href?: string;
  priority?: boolean;
  className?: string;
};

export function NelvyonLogo({
  size = 32,
  showWordmark = true,
  wordmarkClassName = "",
  href = "/",
  priority = false,
  className = "",
}: NelvyonLogoProps) {
  const content = (
    <>
      <Image
        src={LOGO_SRC}
        alt="NELVYON"
        width={size}
        height={size}
        className="object-contain shrink-0"
        priority={priority}
      />
      {showWordmark ? (
        <span className={`nelvyon-logo-wordmark ${wordmarkClassName}`.trim()}>NELVYON</span>
      ) : null}
    </>
  );

  const wrapClass = `nelvyon-logo ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={wrapClass}>
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
