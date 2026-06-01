import Image from "next/image";
import Link from "next/link";

const LOGO = "/logo.png.png";

type NvLogoProps = {
  size?: number;
  showWordmark?: boolean;
  href?: string;
  priority?: boolean;
};

export function NvLogo({ size = 32, showWordmark = true, href = "/", priority = false }: NvLogoProps) {
  const inner = (
    <>
      <Image src={LOGO} alt="NELVYON" width={size} height={size} className="object-contain shrink-0" priority={priority} />
      {showWordmark ? <span className="nv-logo__wordmark">NELVYON</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="nv-logo">
        {inner}
      </Link>
    );
  }

  return <div className="nv-logo">{inner}</div>;
}
