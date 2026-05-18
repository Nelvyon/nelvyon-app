import { NelvyonDsStatusDot } from "@/design-system/components";
import { DISENO_PREMIUM_DELIVERY_ITEMS } from "@/templates/diseno-grafico-premium/checklist";

export function DisenoGraficoPremiumDeliveryChecklist() {
  return (
    <section aria-labelledby="diseno-delivery-qa-heading" className="border-t border-dashed border-border bg-card px-4 py-10 sm:px-6 lg:py-14" id="delivery-qa">
      <div className="mx-auto max-w-5xl space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground" id="diseno-delivery-qa-heading">
          OS delivery QA (Diseño gráfico y creatividades Premium checklist)
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Mirrors backend/ops/runbooks/diseno_grafico_creatividades_premium_nelvyon_v1.md and Design System v2 parity. No design or asset APIs from this panel.
        </p>
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-foreground">
          {DISENO_PREMIUM_DELIVERY_ITEMS.map((item) => (
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
