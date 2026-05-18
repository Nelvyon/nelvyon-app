"use client";

import React, { FormEvent, useId, useState } from "react";

import { Button } from "@/core/ui/button";
import { memberInviteSchema } from "@/features/settings/schema";
import { MemberInviteInput } from "@/features/settings/types";

interface InviteMemberFormProps {
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: MemberInviteInput) => Promise<void> | void;
}

export function InviteMemberForm({ canSubmit, isSubmitting = false, onSubmit }: InviteMemberFormProps) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberInviteInput["role"]>("member");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = memberInviteSchema.safeParse({ email, role });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    await onSubmit(parsed.data);
    setEmail("");
  };

  return (
    <form className="space-y-3 rounded border p-4" onSubmit={handleSubmit}>
      <h3 className="font-medium">Invite member</h3>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-email`}>
          Email
        </label>
        <input
          className="w-full rounded border px-2 py-1"
          id={`${id}-email`}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          value={email}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm" htmlFor={`${id}-role`}>
          Role
        </label>
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          id={`${id}-role`}
          onChange={(e) => setRole(e.target.value as MemberInviteInput["role"])}
          value={role}
        >
          <option value="member">member</option>
          <option value="viewer">viewer</option>
          <option value="operator">operator</option>
          <option value="admin">admin</option>
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!canSubmit && <p className="text-sm text-warning-foreground">Only operator/admin can send invites.</p>}
      <Button disabled={!canSubmit || isSubmitting} type="submit">
        {isSubmitting ? "Sending..." : "Send invite"}
      </Button>
    </form>
  );
}
