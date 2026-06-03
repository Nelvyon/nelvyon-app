import { cn } from "@/lib/pa/utils";
import Image from "next/image";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)} aria-label="NELVYON">
      <Image
        src="/logo.png"
        height={56}
        width={56}
        alt=""
        className={cn("size-full max-h-14 max-w-14 object-contain", className)}
        priority
      />
    </Link>
  );
};
