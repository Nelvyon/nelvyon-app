import { Suspense } from "react";

import { SignInForm } from "@/app/sign-in/SignInForm";

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <SignInForm />
    </Suspense>
  );
}
