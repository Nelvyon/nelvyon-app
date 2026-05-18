import { ComponentType, lazy } from "react";
import ComingSoonOverlay from "./ComingSoonOverlay";

interface ComingSoonConfig {
  moduleName: string;
  description?: string;
}

/**
 * HOC that wraps any page component with a "Próximamente" overlay.
 * The original component still renders (blurred) behind the overlay.
 */
export function withComingSoon<P extends object>(
  WrappedComponent: ComponentType<P>,
  config: ComingSoonConfig
) {
  const WithComingSoonComponent = (props: P) => (
    <ComingSoonOverlay moduleName={config.moduleName} description={config.description}>
      <WrappedComponent {...props} />
    </ComingSoonOverlay>
  );
  WithComingSoonComponent.displayName = `withComingSoon(${config.moduleName})`;
  return WithComingSoonComponent;
}