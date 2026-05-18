import ComingSoonOverlay from "@/components/saas/ComingSoonOverlay";
import SaasLayout from "@/components/SaasLayout";

interface Props {
  moduleName: string;
  description?: string;
  title: string;
  subtitle: string;
}

/**
 * A lightweight placeholder page for modules that are still in development.
 * Shows a professional "Próximamente" overlay with a blurred placeholder.
 */
export default function ComingSoonWrapper({ moduleName, description, title, subtitle }: Props) {
  return (
    <ComingSoonOverlay moduleName={moduleName} description={description}>
      <SaasLayout title={title} subtitle={subtitle}>
        <div className="space-y-6">
          {/* Placeholder cards to give visual weight behind the blur */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-40 rounded-xl bg-white/[0.03] border border-white/[0.06]" />
            ))}
          </div>
        </div>
      </SaasLayout>
    </ComingSoonOverlay>
  );
}