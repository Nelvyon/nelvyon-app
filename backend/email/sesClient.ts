import { SESClient } from "@aws-sdk/client-ses";

let sesInstance: SESClient | null = null;

export function getSesClient(): SESClient {
  if (!sesInstance) {
    sesInstance = new SESClient({
      region: process.env.SES_REGION ?? "us-east-1",
      credentials: {
        accessKeyId:
          process.env.SES_ACCESS_KEY_ID ?? process.env.AWS_SES_ACCESS_KEY ?? "",
        secretAccessKey:
          process.env.SES_SECRET_ACCESS_KEY ?? process.env.AWS_SES_SECRET_KEY ?? "",
      },
    });
  }
  return sesInstance;
}

// Para tests
export function resetSesClientForTests(): void {
  sesInstance = null;
}
