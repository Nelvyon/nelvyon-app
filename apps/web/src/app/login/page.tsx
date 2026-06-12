import { Suspense } from "react";

import { LoginForm } from "@/app/login/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-8 text-sm text-neutral-500">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
