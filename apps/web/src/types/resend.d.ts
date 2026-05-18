declare module "resend" {
  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(input: {
        from: string;
        to: string;
        subject: string;
        html: string;
      }): Promise<{ data?: { id?: string | null } | null; error?: { message?: string } | null }>;
    };
  }
}
