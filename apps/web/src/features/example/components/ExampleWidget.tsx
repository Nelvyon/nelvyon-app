"use client";

import { Button } from "@/core/ui/button";
import { useAuth } from "@/core/auth/AuthContext";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { can } from "@/core/routing/roleMatrix";

export function ExampleWidget() {
  const { user, signIn } = useAuth();

  if (!user) {
    return (
      <div className="rounded border p-4">
        <p className="text-sm text-muted-foreground">No session initialized. Use demo sign-in.</p>
        <Button
          className="mt-3"
          onClick={() =>
            signIn(
              { id: "demo-user", email: "demo@nelvyon.com", role: "operator" },
              "demo-token",
            )
          }
        >
          Demo Sign In (Operator)
        </Button>
      </div>
    );
  }

  const canCreate = can(user.role, "crm", "create");
  const canDelete = can(user.role, "crm", "delete");

  return (
    <ProtectedLayout module="crm">
      <section className="space-y-3 rounded border p-4">
        <h2 className="font-medium">Role Matrix usage demo</h2>
        <p className="text-sm text-muted-foreground">
          Create button is visible for operator+, delete stays disabled for non-admin.
        </p>
        {canCreate && <Button>Crear cliente</Button>}
        <Button disabled={!canDelete} variant="outline">
          Borrar cliente
        </Button>
      </section>
    </ProtectedLayout>
  );
}
