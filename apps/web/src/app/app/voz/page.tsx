"use client";

import Link from "next/link";

import { ApiError } from "@/core/api/types";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { useBillingSummary } from "@/features/billing/hooks";
import { useVoiceV2Governance } from "@/features/voice/hooks";
import { isVoiceAllowedForPlan } from "@/features/voice/planAccess";

/** VOZ NELVYON v1 layer 0 + v2 pilot governance (same /app/voz tree). */
export default function WorkspaceVoiceV1Page() {
  const summaryQuery = useBillingSummary();
  const summary = summaryQuery.data;
  const voiceOnContract = isVoiceAllowedForPlan(summary?.plan_id);
  const govQuery = useVoiceV2Governance();
  const gov = govQuery.data;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-foreground">Voice (VOZ)</h2>
          <Badge tone="neutral">NELVYON v1</Badge>
          {voiceOnContract ? <Badge tone="success">Plan allowlist</Badge> : null}
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Minimal workspace front for voice readiness: billing plan snapshot, explicit v1 boundaries, and support paths.
          Outbound mass calling, full IVR, and end-to-end voice automation are not claimed in this drop.
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card" aria-labelledby="voz-v2-gov">
        <h3 id="voz-v2-gov" className="text-sm font-semibold text-foreground">
          Pilot v2 · Monthly envelope (server)
        </h3>
        <p className="text-sm text-muted-foreground">
          Pilot de voz con límite mensual duro; no es consumo ilimitado ni call center. Inbound clips and browser-synth
          previews share one monthly action budget per workspace (see env{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">VOICE_V2_PILOT_MONTHLY_ACTION_CAP</code>, default 30).
        </p>
        {govQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading pilot usage…</p> : null}
        {govQuery.error instanceof ApiError ? (
          <ErrorNotice>
            <p>Could not load voice pilot governance. Confirm workspace header and operator session if this persists.</p>
          </ErrorNotice>
        ) : null}
        {gov ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">plan_id (billing)</dt>
              <dd className="font-medium text-foreground">{gov.plan_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pilot allowed</dt>
              <dd className="font-medium text-foreground">{gov.plan_allowed ? "yes" : "no"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period (YYYYMM)</dt>
              <dd className="font-medium text-foreground">{gov.period_yyyymm}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Monthly cap (actions)</dt>
              <dd className="font-medium text-foreground">{gov.monthly_cap}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Inbound clips used</dt>
              <dd className="font-medium text-foreground">{gov.inbound_used}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Synth slots used</dt>
              <dd className="font-medium text-foreground">{gov.synth_used}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Actions remaining</dt>
              <dd className="font-medium text-foreground">
                {gov.actions_remaining > 0 ? (
                  gov.actions_remaining
                ) : (
                  <span className="text-destructive">0 — pilot limit reached for this month.</span>
                )}
              </dd>
            </div>
          </dl>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/app/voz/inbound">Inbound voice note</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/voz/outbound-synth">Browser synth</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card" aria-labelledby="voz-flow-1">
        <h3 id="voz-flow-1" className="text-sm font-semibold text-foreground">
          1 · Plan snapshot and voice gate
        </h3>
        <p className="text-sm text-muted-foreground">
          Uses the same billing summary as the rest of the product. Voice unlock for this UI follows{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_VOICE_V1_PLAN_IDS</code> (comma-separated{" "}
          <span className="font-medium text-foreground">plan_id</span> values). Empty means voice stays off for every plan
          until your deployment configures the list.
        </p>
        {summaryQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading billing summary…</p> : null}
        {summaryQuery.error instanceof ApiError ? (
          <ErrorNotice>
            <p>Could not load billing summary. Open billing after confirming workspace context and permissions.</p>
          </ErrorNotice>
        ) : null}
        {summary ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">plan_id</dt>
              <dd className="font-medium text-foreground">{summary.plan_id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">plan_label</dt>
              <dd className="font-medium text-foreground">{summary.plan_label}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Voice gate</dt>
              <dd className="font-medium text-foreground">
                {voiceOnContract
                  ? "This plan_id is in the configured allowlist (pilot / contract signal only—no telephony action here yet)."
                  : "No voice allowlist match (or allowlist empty). Telephony controls remain disabled until product ships them behind real provider wiring."}
              </dd>
            </div>
          </dl>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/billing">Open billing</Link>
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card" aria-labelledby="voz-flow-2">
        <h3 id="voz-flow-2" className="text-sm font-semibold text-foreground">
          2 · What v1 explicitly does not ship
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>No outbound or inbound call placement, recording playback, or carrier routing from this page.</li>
          <li>No campaign-scale dialler, predictive queue, or full CCaaS automation.</li>
          <li>No promise that email or chat channels (other product fronts) gain voice without their own PASA closure.</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card" aria-labelledby="voz-flow-3">
        <h3 id="voz-flow-3" className="text-sm font-semibold text-foreground">
          3 · Human next step
        </h3>
        <p className="text-sm text-muted-foreground">
          If you need voice on this workspace, use support so delivery can align contract, carriers, and compliance before any
          UI dials numbers.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/help">Open help center</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/support">Client support v1</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
