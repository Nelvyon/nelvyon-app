"use client";

import React from "react";

import { Client } from "@/features/crm/types";

export function ClientDetailCard({ client }: { client: Client }) {
  return (
    <section className="rounded border p-4">
      <h2 className="text-lg font-semibold">{client.business_name}</h2>
      <p className="text-sm text-muted-foreground">{client.sector}</p>
      <dl className="mt-3 space-y-1 text-sm">
        <div>
          <dt className="inline font-medium">Country:</dt> <dd className="inline">{client.country ?? "-"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">City:</dt> <dd className="inline">{client.city ?? "-"}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Website:</dt>{" "}
          <dd className="inline">{client.website_url ?? "-"}</dd>
        </div>
      </dl>
    </section>
  );
}
