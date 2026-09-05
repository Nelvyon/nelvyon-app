/**
 * BLOQUE 4 · el correo no sale a menos que alguien lo encienda.
 *
 * NELVYON tenía interruptor para la IA (`NELVYON_AI_ENABLED`) y **no lo tenía
 * para el correo**. Con credenciales de SES en el entorno, cualquier ejecución
 * —una suite, un script, una certificación— podía mandar correos **reales** a
 * las direcciones que hubiera en las fixtures. Un correo enviado no se devuelve.
 *
 * La decisión de diseño que importa: cuando está apagado **se lanza**, no se
 * devuelve en silencio. Un envío que se da por hecho sin salir es la peor de las
 * dos opciones, porque el cliente cree que ha avisado a alguien.
 *
 * Y el error lleva tipo propio para que quien llame pueda distinguir tres cosas
 * que no son la misma: **desactivado**, **falló el proveedor** y **enviado**.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const ENTORNO = { ...process.env };

afterEach(() => {
  process.env = { ...ENTORNO };
  vi.restoreAllMocks();
  vi.resetModules();
});

/** El módulo se importa fresco: la decisión se toma leyendo el entorno. */
async function servicioFresco() {
  vi.resetModules();
  return import("../emailService");
}

describe("BLOQUE 4 · interruptor de correo", () => {
  it("por DEFECTO fuera de producción no se envía", async () => {
    // Es donde viven las fixtures. El valor por defecto tiene que ser el seguro.
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.NELVYON_EMAIL_ENABLED;
    const { envioDeCorreoPermitido } = await servicioFresco();
    expect(envioDeCorreoPermitido()).toBe(false);
  });

  it("EL CONTROL: en producción SÍ se envía", async () => {
    // Sin este control, un interruptor que apagara siempre pasaría todas las
    // pruebas de abajo y dejaría el producto sin poder avisar a nadie.
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NELVYON_EMAIL_ENABLED;
    const { envioDeCorreoPermitido } = await servicioFresco();
    expect(envioDeCorreoPermitido()).toBe(true);
  });

  it("se puede encender explícitamente fuera de producción", async () => {
    // Alguien puede necesitar probar el envío de verdad. Que sea explícito es
    // justo la diferencia con lo que había antes.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "1";
    const { envioDeCorreoPermitido } = await servicioFresco();
    expect(envioDeCorreoPermitido()).toBe(true);
  });

  it("se puede APAGAR explícitamente incluso en producción", async () => {
    // Un incidente, una migración de proveedor, una lista contaminada. Poder
    // parar el correo sin desplegar vale más que la elegancia.
    vi.stubEnv("NODE_ENV", "production");
    process.env.NELVYON_EMAIL_ENABLED = "0";
    const { envioDeCorreoPermitido } = await servicioFresco();
    expect(envioDeCorreoPermitido()).toBe(false);
  });

  it("apagado, `sendEmail` LANZA en vez de fingir que envió", async () => {
    // El corazón del asunto. Devolver `void` en silencio dejaría al llamante
    // creyendo que el aviso salió.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "0";
    const { sendEmail } = await servicioFresco();

    await expect(
      sendEmail("cancellation" as never, { email: "cliente@ejemplo.test" }, "es"),
    ).rejects.toThrow(/desactivado/i);
  });

  it("el error lleva TIPO propio: desactivado no es lo mismo que fallo", async () => {
    // Tres cosas distintas -desactivado, fallo del proveedor, enviado- que si se
    // mezclan llevan a informar mal al cliente. El código lo permite distinguir.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "0";
    const { sendEmail, CorreoDesactivadoError } = await servicioFresco();

    try {
      await sendEmail("cancellation" as never, { email: "cliente@ejemplo.test" }, "es");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).toBeInstanceOf(CorreoDesactivadoError);
      expect((e as { code: string }).code).toBe("CORREO_DESACTIVADO");
    }
  });

  it("apagado, NO se llega a construir el cliente del proveedor", async () => {
    // La comprobación tiene que ir ANTES de tocar el SDK. Si fuera después,
    // construir el cliente ya podría resolver DNS o leer credenciales.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "0";
    process.env.SES_ACCESS_KEY_ID = "clave-que-no-debe-usarse";

    vi.resetModules();
    const espia = vi.fn();
    vi.doMock("../sesClient", () => ({
      getSesClient: () => {
        espia();
        return { send: async () => undefined };
      },
      resetSesClientForTests: () => undefined,
    }));

    const { sendEmail } = await import("../emailService");
    await sendEmail("cancellation" as never, { email: "x@y.test" }, "es").catch(() => null);

    expect(espia, "se construyo el cliente del proveedor estando apagado").not.toHaveBeenCalled();
  });

  it("un valor sin sentido no enciende el correo fuera de producción", async () => {
    // Fallo cerrado ante configuración mal escrita: `NELVYON_EMAIL_ENABLED=si`
    // no puede interpretarse como encendido.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "quizas";
    const { envioDeCorreoPermitido } = await servicioFresco();
    expect(envioDeCorreoPermitido()).toBe(false);
  });

  it("encendido, el envío llega al proveedor", async () => {
    // La otra mitad del control: con todo a favor, el correo tiene que salir.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "1";

    vi.resetModules();
    const enviados: unknown[] = [];
    vi.doMock("../sesClient", () => ({
      getSesClient: () => ({
        send: async (cmd: unknown) => {
          enviados.push(cmd);
        },
      }),
      resetSesClientForTests: () => undefined,
    }));

    const { sendEmail } = await import("../emailService");
    await sendEmail("cancellation" as never, { email: "cliente@ejemplo.test" }, "es");

    expect(enviados).toHaveLength(1);
  });

  it("encendido, un fallo del proveedor se propaga como fallo, no como apagado", async () => {
    // La tercera de las tres cosas. Si el proveedor revienta, quien llama tiene
    // que saber que fue el proveedor y no la configuración.
    vi.stubEnv("NODE_ENV", "test");
    process.env.NELVYON_EMAIL_ENABLED = "1";

    vi.resetModules();
    vi.doMock("../sesClient", () => ({
      getSesClient: () => ({
        send: async () => {
          throw new Error("SES no disponible");
        },
      }),
      resetSesClientForTests: () => undefined,
    }));

    const { sendEmail, CorreoDesactivadoError } = await import("../emailService");
    try {
      await sendEmail("cancellation" as never, { email: "x@y.test" }, "es");
      throw new Error("deberia haber lanzado");
    } catch (e) {
      expect(e).not.toBeInstanceOf(CorreoDesactivadoError);
      expect(String(e)).toMatch(/SES no disponible/);
    }
  });
});
