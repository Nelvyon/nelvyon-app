"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SignupFormValues } from "@/features/client_portal_v1/types";

const INITIAL_FORM: SignupFormValues = {
  email: "",
  fullName: "",
  password: "",
};

export default function ClientSignupPage() {
  const [form, setForm] = useState<SignupFormValues>(INITIAL_FORM);
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setPhase("loading");
    try {
      // v1 intentionally uses a controlled placeholder flow while auth backend is finalized.
      await new Promise((resolve) => setTimeout(resolve, 650));
      setPhase("success");
    } catch {
      setPhase("error");
      setErrorMessage("Signup could not be completed right now. Try again in a minute.");
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Client self-signup v1</h1>
        <p className="text-sm text-muted-foreground">
          You can register basic access and continue to workspace selection. Advanced automation setup is not available
          from this screen yet.
        </p>
      </header>

      <form className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card" onSubmit={onSubmit}>
        <label className="block space-y-1 text-sm text-foreground">
          Full name
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            required
            type="text"
            value={form.fullName}
          />
        </label>
        <label className="block space-y-1 text-sm text-foreground">
          Email
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            type="email"
            value={form.email}
          />
        </label>
        <label className="block space-y-1 text-sm text-foreground">
          Password
          <input
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            minLength={8}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
            type="password"
            value={form.password}
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={phase === "loading"} type="submit">
            {phase === "loading" ? "Creating account…" : "Create account"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/client/sign-in">Use existing client access</Link>
          </Button>
        </div>
      </form>

      {phase === "success" ? (
        <div className="space-y-2 rounded-md border border-success/35 bg-success/10 p-3 text-sm">
          <p className="text-success-foreground">Account created. Next: select or create your workspace as workspace owner.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/os/workspaces/select">Continue to workspace selection</Link>
          </Button>
        </div>
      ) : null}
      {phase === "error" ? (
        <ErrorNotice>
          <p>Cause: signup request did not complete successfully.</p>
          <p className="mt-2 text-sm text-muted-foreground">Next: retry once; if it persists, contact support.</p>
        </ErrorNotice>
      ) : null}
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

      <p className="text-xs text-muted-foreground">
        Honest scope: this v1 flow creates basic access only. Billing setup, automated provisioning, and advanced team
        permissions are still handled manually.
      </p>
    </main>
  );
}
