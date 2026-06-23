import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link href="/" className={cn("", className)}>
      <Image
        src="/logo.webp"
        height="50"
        width="50"
        alt="Logo"
        className={cn("block dark:hidden", className)}
      />
      <Image
        src="/logo-dark.webp"
        height="50"
        width="50"
        alt="Logo"
        className={cn("hidden dark:block", className)}
      />
    </Link>
  );
};
