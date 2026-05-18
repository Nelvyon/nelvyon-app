import { NelvyonDsStatusDot } from "@/design-system/components";
import { ECOMMERCE_PREMIUM_DELIVERY_ITEMS } from "@/templates/ecommerce-premium/checklist";

export function EcommercePremiumDeliveryChecklist() {
  return (
    <section aria-labelledby="delivery-qa-heading" className="border-t border-dashed border-border bg-card px-4 py-10 sm:px-6 lg:py-14" id="delivery-qa">
      <div className="mx-auto max-w-6xl space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground" id="delivery-qa-heading">
          OS delivery QA (E‑commerce Premium checklist)
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Aligned with backend/ops/runbooks/ecommerce_premium_nelvyon_v1.md plus PLP/PDP/checkout verification and Design System v2
          parity. Operators tick items manually — nothing here executes tests remotely.
        </p>
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-foreground">
          {ECOMMERCE_PREMIUM_DELIVERY_ITEMS.map((item) => (
            <li className="pl-2" key={item.id}>
              <span className="inline-flex items-start gap-2">
                <NelvyonDsStatusDot className="mt-1.5" status={item.status} />
                <span>
                  <span className="font-medium text-foreground">{item.area}</span>{" "}
                  <span className="text-muted-foreground">({item.source})</span>
                  <span className="mt-1 block text-muted-foreground">{item.description}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
