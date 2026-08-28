/**
 * EL TRABAJADOR que vacía `os_jobs`.
 *
 * Toma trabajo de `ColaDeTrabajos`, lo ejecuta con el manejador que
 * corresponda, late mientras dura y cierra la fila con el resultado. Es el
 * eslabón que faltaba entre una tabla que sólo recibía escrituras y los agentes
 * que sí saben hacer el trabajo.
 *
 * LO QUE NO HACE, y es deliberado:
 *
 *   - No conoce a ningún agente. Los manejadores se registran desde fuera, de
 *     modo que este fichero no crece cada vez que hay un servicio nuevo y las
 *     pruebas pueden ejercitarlo sin arrastrar medio producto.
 *
 *   - No decide si algo puede publicarse ni si algo puede gastar dinero. Un
 *     manejador que necesite una persona devuelve `esperandoAprobacion`, y el
 *     trabajo queda parado. El trabajador no interpreta.
 *
 *   - No toca `waiting_approval` jamás. Ni al reclamar —la cola usa lista
 *     blanca— ni al rescatar arriendos vencidos.
 */

import { conInquilino } from "../db/contextoDeInquilino";
import { ColaDeTrabajos, type TrabajoReclamado } from "./colaDeTrabajos";

/**
 * Lo que un manejador puede responder. Son tres cosas distintas y conviene que
 * lo sigan siendo: terminar, esperar a una persona, y fallar. Fundir las dos
 * últimas es lo que hace que un trabajo pendiente de aprobación parezca una
 * avería y acabe reintentándose.
 */
export type ResultadoDeManejador =
  | { tipo: "completado"; resultado: unknown }
  | { tipo: "esperandoAprobacion"; motivo: string };

export type ManejadorDeTrabajo = (
  trabajo: TrabajoReclamado,
  utilidades: { latir: () => Promise<boolean>; señal: AbortSignal },
) => Promise<ResultadoDeManejador>;

export interface OpcionesDeTrabajador {
  /** Cuántos trabajos a la vez. */
  concurrencia?: number;
  /** Cada cuánto se pregunta por trabajo nuevo cuando la cola está vacía. */
  esperaEntreVueltasMs?: number;
  /** Cada cuánto late un trabajo en curso. Debe ser bastante menor que el arriendo. */
  latidoMs?: number;
  /** Cada cuánto se barren los arriendos vencidos. */
  rescateMs?: number;
  /** Tiempo máximo de UN trabajo antes de abortarlo. */
  tiempoMaximoPorTrabajoMs?: number;
  registrar?: (evento: Record<string, unknown>) => void;
}

const SIN_MANEJADOR = Symbol("sin-manejador");

export class TrabajadorDeCola {
  private readonly manejadores = new Map<string, ManejadorDeTrabajo>();
  private corriendo = false;
  private enVuelo = 0;
  private temporizadores: Array<ReturnType<typeof setInterval>> = [];
  private readonly opciones: Required<Omit<OpcionesDeTrabajador, "registrar">> & {
    registrar: (evento: Record<string, unknown>) => void;
  };

  constructor(
    private readonly cola: ColaDeTrabajos,
    opciones: OpcionesDeTrabajador = {},
  ) {
    this.opciones = {
      concurrencia: opciones.concurrencia ?? 3,
      esperaEntreVueltasMs: opciones.esperaEntreVueltasMs ?? 2_000,
      latidoMs: opciones.latidoMs ?? 30_000,
      rescateMs: opciones.rescateMs ?? 60_000,
      tiempoMaximoPorTrabajoMs: opciones.tiempoMaximoPorTrabajoMs ?? 10 * 60_000,
      registrar:
        opciones.registrar ??
        ((e) => console.error(`[cola] ${Object.entries(e).map(([k, v]) => `${k}=${v}`).join(" ")}`)),
    };
  }

  registrarManejador(serviceId: string, manejador: ManejadorDeTrabajo): void {
    this.manejadores.set(serviceId, manejador);
  }

  manejadoresRegistrados(): string[] {
    return [...this.manejadores.keys()].sort();
  }

  /**
   * Una vuelta: reclama lo que quepa y lo procesa. Devuelve cuántos trabajos
   * atendió, para poder ejercitarla desde una prueba sin arrancar temporizadores.
   */
  async unaVuelta(): Promise<number> {
    const hueco = this.opciones.concurrencia - this.enVuelo;
    if (hueco <= 0) return 0;

    const trabajos = await this.cola.reclamar(hueco);
    if (trabajos.length === 0) return 0;

    await Promise.all(trabajos.map((t) => this.procesar(t)));
    return trabajos.length;
  }

  private async procesar(trabajo: TrabajoReclamado): Promise<void> {
    this.enVuelo += 1;
    const inicio = Date.now();
    const control = new AbortController();

    const latido = setInterval(() => {
      void this.cola.latir(trabajo.jobId).then((vivo) => {
        // Si el latido no encuentra la fila, este trabajador ya no la tiene:
        // otro la rescató. Seguir trabajando sería ejecutarla dos veces.
        if (!vivo) control.abort(new Error("el arriendo ya no es nuestro"));
      });
    }, this.opciones.latidoMs);

    const corte = setTimeout(() => {
      control.abort(new Error(`el trabajo supero ${this.opciones.tiempoMaximoPorTrabajoMs} ms`));
    }, this.opciones.tiempoMaximoPorTrabajoMs);

    try {
      const manejador = this.manejadores.get(trabajo.serviceId);
      if (!manejador) throw SIN_MANEJADOR;

      // El contexto de inquilino se instala AQUI y no antes: el reclamo es
      // cruzado entre inquilinos por necesidad, la ejecucion nunca lo es.
      const salida = await conInquilino(
        { tenantId: trabajo.tenantId ?? undefined },
        () =>
          manejador(trabajo, {
            latir: () => this.cola.latir(trabajo.jobId),
            señal: control.signal,
          }),
      );

      if (salida.tipo === "esperandoAprobacion") {
        await this.cola.dejarEsperandoAprobacion(trabajo.jobId, salida.motivo);
        this.opciones.registrar({
          evento: "esperando_aprobacion",
          job: trabajo.jobId,
          servicio: trabajo.serviceId,
          motivo: salida.motivo.slice(0, 120),
        });
        return;
      }

      const duracion = Date.now() - inicio;
      await this.cola.completar(trabajo.jobId, salida.resultado, duracion);
      this.opciones.registrar({
        evento: "completado",
        job: trabajo.jobId,
        servicio: trabajo.serviceId,
        intento: trabajo.attempts,
        ms: duracion,
      });
    } catch (err) {
      // Un servicio sin manejador no es un fallo transitorio: reintentarlo tres
      // veces no va a hacer que aparezca. Se agotan los intentos de golpe para
      // que caiga a `dead_letter` en la primera vuelta y se vea.
      const sinManejador = err === SIN_MANEJADOR;
      const causa = sinManejador
        ? new Error(`no hay manejador registrado para el servicio "${trabajo.serviceId}"`)
        : err;
      const intentos = sinManejador ? trabajo.maxAttempts : trabajo.attempts;

      const destino = await this.cola.fallar(
        trabajo.jobId,
        causa,
        intentos,
        trabajo.maxAttempts,
      );
      this.opciones.registrar({
        evento: destino === "dead_letter" ? "dead_letter" : "reintento_programado",
        job: trabajo.jobId,
        servicio: trabajo.serviceId,
        intento: trabajo.attempts,
        de: trabajo.maxAttempts,
        causa: (causa instanceof Error ? causa.message : String(causa)).slice(0, 160),
      });
    } finally {
      clearInterval(latido);
      clearTimeout(corte);
      this.enVuelo -= 1;
    }
  }

  arrancar(): void {
    if (this.corriendo) return;
    this.corriendo = true;

    // El rescate va PRIMERO y sin esperar: si este proceso es el que reinicia
    // tras una caida, lo que hay que hacer antes que nada es devolver a la cola
    // lo que quedo colgando.
    void this.cola.rescatarArriendosVencidos().then((r) => {
      if (r.devueltos || r.agotados) {
        this.opciones.registrar({
          evento: "rescate_al_arrancar",
          devueltos: r.devueltos,
          agotados: r.agotados,
        });
      }
    });

    const vuelta = setInterval(() => {
      void this.unaVuelta().catch((e) =>
        this.opciones.registrar({
          evento: "vuelta_fallida",
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }, this.opciones.esperaEntreVueltasMs);

    const rescate = setInterval(() => {
      void this.cola.rescatarArriendosVencidos().catch(() => undefined);
    }, this.opciones.rescateMs);

    for (const t of [vuelta, rescate]) {
      if (typeof t.unref === "function") t.unref();
    }
    this.temporizadores = [vuelta, rescate];
    this.opciones.registrar({
      evento: "arrancado",
      identidad: this.cola.identidad,
      concurrencia: this.opciones.concurrencia,
      manejadores: this.manejadoresRegistrados().length,
    });
  }

  /** Para de tomar trabajo nuevo y espera a que termine lo que está en vuelo. */
  async parar(): Promise<void> {
    this.corriendo = false;
    for (const t of this.temporizadores) clearInterval(t);
    this.temporizadores = [];
    while (this.enVuelo > 0) {
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}
