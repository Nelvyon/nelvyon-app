import { cn } from "@/lib/pa/utils";
import Image from "next/image";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link href="/" className={cn("", className)}>
      <Image
        src="/logo.png"
        height="56"
        width="56"
        alt="NELVYON"
        className={cn("block dark:hidden", className)}
      />
      <Image
        src="/logo.png"
        height="56"
        width="56"
        alt="NELVYON"
        className={cn("hidden dark:block", className)}
      />
    </Link>
  );
};
