import { SESClient } from "@aws-sdk/client-ses";

let sesInstance: SESClient | null = null;

export function resolveSesCredentials(): { accessKeyId: string; secretAccessKey: string } {
  const accessKeyId =
    process.env.SES_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_SES_ACCESS_KEY?.trim() ||
    "";
  const secretAccessKey =
    process.env.SES_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SES_SECRET_KEY?.trim() ||
    "";
  return { accessKeyId, secretAccessKey };
}

export function resolveSesRegion(): string {
  return (
    process.env.SES_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    "eu-west-1"
  );
}

export function isSesConfigured(): boolean {
  const { accessKeyId, secretAccessKey } = resolveSesCredentials();
  return Boolean(accessKeyId && secretAccessKey);
}

export function getSesClient(): SESClient {
  if (!sesInstance) {
    const { accessKeyId, secretAccessKey } = resolveSesCredentials();
    sesInstance = new SESClient({
      region: resolveSesRegion(),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return sesInstance;
}

export function resetSesClientForTests(): void {
  sesInstance = null;
}
