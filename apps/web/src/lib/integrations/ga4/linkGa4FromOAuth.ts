import { getGA4Service } from "../../../../../../backend/integrations/GoogleAnalytics4Service";
import { OAuthService } from "../../../../../../backend/oauth/OAuthService";

/** Copia tokens OAuth Google (analytics.readonly) a integration_ga4. */
export async function linkGa4PropertyFromGoogleOAuth(
  userId: string,
  propertyId: string,
): Promise<void> {
  const google = await OAuthService.instance().getConnection(userId, "google");
  if (!google?.accessToken || !google.refreshToken) {
    throw new Error("Conecta Google OAuth primero (incluye scope analytics.readonly).");
  }
  const expiry = google.expiresAt ?? new Date(Date.now() + 3600_000);
  await getGA4Service().saveCredentials(
    userId,
    propertyId,
    google.accessToken,
    google.refreshToken,
    expiry,
  );
}
