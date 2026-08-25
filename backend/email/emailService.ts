import { SendEmailCommand } from "@aws-sdk/client-ses";

import { getSesClient } from "./sesClient";
import { buildEmail, type EmailTemplate } from "./templates";

const FROM = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

/**
 * Se lanza cuando el envio esta desactivado a proposito.
 *
 * Es un tipo propio y no un error generico para que quien llame pueda
 * distinguir «no se envio porque esta apagado» de «no se envio porque fallo».
 * Son cosas distintas y mezclarlas lleva a informar mal al cliente.
 */
export class CorreoDesactivadoError extends Error {
  readonly code = "CORREO_DESACTIVADO" as const;

  constructor(motivo: string) {
    super(`Envio de correo desactivado: ${motivo}`);
    this.name = "CorreoDesactivadoError";
  }
}

/**
 * ¿Se puede enviar correo de verdad ahora mismo?
 *
 * NELVYON tenia interruptor para la IA (`NELVYON_AI_ENABLED`) y NO lo tenia para
 * el correo. Con credenciales de SES en el entorno, cualquier ejecucion -una
 * suite, un script, una certificacion- podia mandar correos REALES a las
 * direcciones que hubiera en las fixtures. Un correo enviado no se devuelve.
 *
 * Por defecto se apaga fuera de produccion, que es donde estan las fixtures.
 * `NELVYON_EMAIL_ENABLED=1` lo enciende explicitamente para quien lo necesite.
 */
export function envioDeCorreoPermitido(): boolean {
  const explicito = process.env.NELVYON_EMAIL_ENABLED?.trim();
  if (explicito === "0" || explicito?.toLowerCase() === "false") return false;
  if (explicito === "1" || explicito?.toLowerCase() === "true") return true;
  return process.env.NODE_ENV === "production";
}

export async function sendEmail(
  template: EmailTemplate,
  params: Record<string, string>,
  locale?: string | null,
): Promise<void> {
  if (!envioDeCorreoPermitido()) {
    // Se LANZA en vez de devolver en silencio. Un envio que se da por hecho sin
    // salir es la peor de las dos opciones: el cliente cree que ha avisado a
    // alguien. Ver el contrato de estados del Bloque 3.
    throw new CorreoDesactivadoError(
      "NELVYON_EMAIL_ENABLED no esta activado y el entorno no es produccion",
    );
  }

  const email = buildEmail(template, params, locale);
  const client = getSesClient();
  await client.send(
    new SendEmailCommand({
      Source: `NELVYON <${FROM}>`,
      Destination: { ToAddresses: [email.to] },
      Message: {
        Subject: { Data: email.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: email.html, Charset: "UTF-8" },
          Text: { Data: email.text, Charset: "UTF-8" },
        },
      },
    }),
  );
}
