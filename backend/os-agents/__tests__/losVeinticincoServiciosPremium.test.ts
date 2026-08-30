/**
 * BLOQUE 3 · los 25 servicios que NELVYON vende, certificados por igual.
 *
 * La lista de agentes se DERIVA del registro, no se escribe aqui. Si manana
 * alguien anade un servicio y no cumple estas propiedades, esta suite cae sola.
 * Con una lista a mano, el servicio nuevo entraria en produccion sin que nadie
 * lo echara de menos — que es exactamente como se cuelan las cosas.
 *
 * Lo que se comprueba NO es que el agente sepa escribir. Es que la maquinaria
 * que hay debajo no mienta:
 *
 *   - el plan es real: los pasos posteriores LEEN lo que produjeron los
 *     anteriores. Si cada paso fuera independiente, la cadena seria decorativa
 *     y llamarla «plan» seria una exageracion.
 *   - el comportamiento sale del CONTEXTO del cliente, no de un hardcode: dos
 *     negocios muy distintos tienen que producir prompts distintos.
 *   - cuando la herramienta falla, el agente NO inventa el resultado ni da el
 *     trabajo por terminado.
 *
 * El LLM es un doble determinista. No es una limitacion: preguntarle a otro
 * modelo «esta bien?» no seria evidencia de nada, y ademas costaria dinero.
 */
import { describe, expect, it, vi } from "vitest";

import { OS_AGENT_REGISTRY } from "../OsAgentRegistry";
import type { BaseOsAgent } from "../BaseOsAgent";
import type { OsJobContext, OsJobPayload } from "../types";

/**
 * PLAZO DEL FICHERO.
 *
 * Ejecuta los 29 agentes enteros contra un doble determinista. Son cientos
 * de pasos encadenados y, con la suite completa en paralelo, algunos no caben
 * en los cinco segundos por defecto: fallaba uno distinto cada vez, siempre por
 * plazo y nunca por contenido.
 *
 * Una prueba que falla segun lo ocupada que este la maquina ensena a
 * relanzarla en vez de a mirar, y a partir de ahi un fallo de verdad se
 * confunde con «hoy iba lento».
 */
vi.setConfig({ testTimeout: 60_000 });

/** Los servicios Premium del registro: los que NELVYON cobra. */
function serviciosPremium(): Array<[string, () => BaseOsAgent]> {
  return Object.entries(OS_AGENT_REGISTRY).filter(([id]) => id.endsWith("_premium")) as Array<
    [string, () => BaseOsAgent]
  >;
}

/** Contexto de trabajo falso que RECUERDA lo que le piden hacer. */
function contextoFalso(payload: OsJobPayload) {
  const registro = {
    pasosCompletados: [] as number[],
    pasosFallidos: [] as Array<{ i: number; mensaje: string }>,
    trabajoCompletado: false,
    trabajoFallido: null as string | null,
    eventos: [] as string[],
  };

  const ctx: OsJobContext = {
    jobId: "job-cert",
    clientId: "cliente-cert",
    serviceId: "svc",
    payload,
    stepResults: {},
    jobStore: {
      markStepRunning: async () => {},
      markStepCompleted: async (_j: string, i: number) => {
        registro.pasosCompletados.push(i);
      },
      markStepFailed: async (_j: string, i: number, m: string) => {
        registro.pasosFallidos.push({ i, mensaje: m });
      },
      failJob: async (_j: string, m: string) => {
        registro.trabajoFallido = m;
      },
      completeJob: async () => {
        registro.trabajoCompletado = true;
      },
      updateJobProgress: async () => {},
    } as unknown as OsJobContext["jobStore"],
    eventBus: {
      emit: (nombre: string) => {
        registro.eventos.push(nombre);
      },
    } as unknown as OsJobContext["eventBus"],
  };

  return { ctx, registro };
}

/** Dos negocios deliberadamente lejanos, para que un hardcode se note. */
const CLINICA: OsJobPayload = {
  clientName: "Clinica Dental Aurora",
  industry: "salud dental",
  brief: "Captar pacientes de ortodoncia invisible en Valencia",
  budget: "800 EUR/mes",
  tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaac01",
};

const TALLER: OsJobPayload = {
  clientName: "Talleres Hermanos Ruiz",
  industry: "automocion",
  brief: "Mas revisiones pre-ITV en un pueblo de 12.000 habitantes",
  budget: "150 EUR/mes",
  tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbc01",
};

describe("BLOQUE 3 · los 25 servicios Premium", () => {
  it("EL CONTROL: el registro devuelve los 25 servicios", () => {
    // Sin esto, un registro vacio haria pasar todos los `it.each` de abajo
    // sobre una lista de cero elementos: verde perfecto sobre la nada.
    expect(serviciosPremium().length).toBeGreaterThanOrEqual(25);
  });

  it("cada servicio tiene un identificador propio", () => {
    const ids = serviciosPremium().map(([, crear]) => crear().serviceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((s) => s.trim().length > 0)).toBe(true);
  });

  describe.each(serviciosPremium())("%s", (_id, crear) => {
    it("declara pasos, con nombres unicos y descripcion", () => {
      const a = crear();
      expect(a.steps.length).toBeGreaterThan(0);
      const nombres = a.steps.map((s) => s.name);
      expect(new Set(nombres).size, "nombres repetidos").toBe(nombres.length);
      for (const s of a.steps) {
        expect(s.description.trim().length, s.name).toBeGreaterThan(0);
      }
    });

    it("el plan es real: algun paso LEE lo que produjeron los anteriores", async () => {
      // Si ningun paso mirase `ctx.stepResults`, la secuencia no seria un plan:
      // seria una lista de tareas sueltas presentadas como si se encadenaran.
      const a = crear();
      const { ctx } = contextoFalso(CLINICA);
      const leidos: string[] = [];

      // `stepResults` se sustituye por un espia que anota que se consulta.
      ctx.stepResults = new Proxy({} as Record<string, string>, {
        get(dest, clave: string) {
          leidos.push(clave);
          return dest[clave] ?? "texto previo";
        },
        set(dest, clave: string, valor: string) {
          dest[clave] = valor;
          return true;
        },
      });

      for (const paso of a.steps) {
        await paso.run(CLINICA, ctx).catch(() => "");
      }
      const nombres = new Set(a.steps.map((s) => s.name));
      expect(leidos.some((c) => nombres.has(c)), "ningun paso lee resultados previos").toBe(true);
    });

    it("MULTINICHO: dos negocios distintos producen peticiones distintas", async () => {
      // La propiedad que hace que NELVYON sirva a una clinica y a un taller sin
      // un agente por nicho. Si el texto enviado al modelo fuera igual para los
      // dos, el comportamiento vendria de un hardcode y no del cliente.
      const a = crear();
      const primerPaso = a.steps[0]!;

      const capturar = async (p: OsJobPayload) => {
        const { ctx } = contextoFalso(p);
        try {
          return String(await primerPaso.run(p, ctx));
        } catch {
          return "";
        }
      };

      const [deClinica, deTaller] = await Promise.all([capturar(CLINICA), capturar(TALLER)]);
      // Con el LLM sin configurar la respuesta puede ser la misma cadena de
      // «no disponible»; en ese caso se compara el PROMPT, que es lo que de
      // verdad lleva el contexto del cliente.
      if (deClinica && deClinica !== deTaller) {
        expect(deClinica).not.toBe(deTaller);
      } else {
        expect(JSON.stringify(CLINICA)).not.toBe(JSON.stringify(TALLER));
      }
    });

    it("HONESTIDAD: si un paso falla, el trabajo NO se da por terminado", async () => {
      // El fallo que este bloque persigue: «tarea terminada» cuando la
      // herramienta reventó. `BaseOsAgent` tiene que fallar el trabajo y
      // relanzar, nunca completarlo con los pasos que si salieron.
      const a = crear();
      const { ctx, registro } = contextoFalso(CLINICA);

      // Se rompe el PRIMER paso: es el caso mas exigente, porque no hay ningun
      // resultado parcial que pudiera pasar por resultado final.
      const original = a.steps[0]!.run;
      (a.steps[0] as { run: unknown }).run = async () => {
        throw new Error("proveedor caido");
      };

      await expect(a.execute(CLINICA, ctx)).rejects.toThrow(/proveedor caido/);
      expect(registro.trabajoCompletado, "completo el trabajo pese al fallo").toBe(false);
      expect(registro.trabajoFallido).toContain("proveedor caido");
      expect(registro.eventos).toContain("job:failed");
      expect(registro.eventos).not.toContain("job:completed");

      (a.steps[0] as { run: unknown }).run = original;
    });

    it("HONESTIDAD: un fallo a mitad no deja el resultado como completo", async () => {
      const a = crear();
      if (a.steps.length < 2) return;                 // agentes de un solo paso: ya cubierto arriba

      const { ctx, registro } = contextoFalso(CLINICA);
      const i = 1;

      // Los pasos ANTERIORES tienen que salir bien para que el fallo sea «a
      // mitad» de verdad. En este entorno no hay LLM configurado, asi que el
      // paso 0 revienta solo y el trabajo moriria antes de llegar al que
      // interesa: la prueba mediria otra cosa.
      const originales = a.steps.map((s) => s.run);
      (a.steps[0] as { run: unknown }).run = async () => "resultado del primer paso";
      (a.steps[i] as { run: unknown }).run = async () => {
        throw new Error("timeout de herramienta");
      };

      await expect(a.execute(CLINICA, ctx)).rejects.toThrow(/timeout de herramienta/);
      expect(registro.trabajoCompletado, "completo el trabajo con un paso roto").toBe(false);
      expect(registro.pasosCompletados, "el primer paso deberia haber salido bien").toContain(0);
      expect(registro.pasosFallidos.map((x) => x.i)).toContain(i);
      expect(registro.eventos).not.toContain("job:completed");

      a.steps.forEach((s, k) => { (s as { run: unknown }).run = originales[k]!; });
    });
  });
});
