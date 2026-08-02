import { permanentRedirect } from "next/navigation";

/**
 * Fallback if middleware rewrite to `/www/index.html` is skipped.
 * Prefer middleware rewrite (200 + AIOR HTML at `/`) over this path.
 */
export default function HomePage() {
  permanentRedirect("/www/index.html");
}
