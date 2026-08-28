/**
 * EL PUENTE ENTRE UN AGENTE Y UN EJECUTOR.
 *
 * `MetaAdsExecutor` y `GoogleAdsExecutor` existen desde hace tiempo, y hasta
 * hoy no los llamaba ningún agente: sólo dos botones de interfaz. Ése es el
 * eslabón que faltaba para que NELVYON haga el trabajo en vez de proponerlo.
 *
 * Y es el eslabón donde más caro sale equivocarse, porque al otro lado hay
 * dinero de un cliente y publicaciones con su cara. Por eso el puente no es un
 * `await ejecutor.hacer()`: es una secuencia de puertas que ya existían y que
 * hasta ahora nadie encadenaba.
 *
 *     el agente PROPONE una acción
 *        │
 *        ├─ 1 · ¿su contrato le permite ESTA acción?        autonomia.ts
 *        │      (según las consecuencias reales, no las declaradas)
 *        ├─ 2 · ¿hace falta que una persona diga que sí?    autonomia.ts
 *        ├─ 3 · ¿hay autorización de gasto?                 guardaDeGasto.ts
 *        ├─ 4 · se registra la solicitud                    (idempotente)
 *        ├─ 5 · SE EJECUTA
 *        └─ 6 · se cierra el rastro: ejecutado o fallido
 *
 * NINGUNA PUERTA ES OPCIONAL. Saltarse la 1 deja que un agente de borradores
 * lance campañas; saltarse la 3 gasta dinero sin presupuesto; saltarse la 4
 * hace que un reintento de red lance dos veces la misma campaña.
 *
 * LO QUE ESTE FICHERO NO HACE: no llama a ningún proveedor. Los ejecutores se
 * inyectan, y en las pruebas el que se inyecta es un doble que cuenta lo que le
 * piden. Un puente que además supiera hablar con Meta no se podría probar sin
 * gastar dinero, y lo que hay que probar es justamente que NO gasta cuando no
 * debe.
 */

import type { ContratoDeAgente } from "../agentes/contratoDeAgente";
import { puedeHacer } from "../agentes/contratoDeAgente";
import type { Consecuencia } from "../agentes/autonomia";
import type { GuardaDeGasto, PeticionDeGasto } from "../gasto/guardaDeGasto";

/** Lo que un agente quiere hacer, antes de que ocurra. */
export interface AccionPropuesta {
  /** Qué ejecutor la haría: 'meta_ads', 'google_ads', 'email'... */
  ejecutor: string;
  /** La operación concreta: 'crear_campana', 'pausar_campana'... */
  operacion: string;
  /** Consecuencias REALES de esta acción con estos argumentos. */
  consecuencias: readonly Consecuencia[];
  /** Argumentos que recibirá el ejecutor. Nunca credenciales. */
  argumentos: Record<string, unknown>;

  tenantId: string;
  workspaceId: number;
  serviceId: string;
  clientId: string;

  /** Céntimos que compromete. 0 si no gasta. */
  importeCents: number;
  /** Clave estable. Sin ella, un reintento de red ejecuta dos veces. */
  idempotencyKey: string;
}

export type ResultadoDelPuente =
  | { estado: "ejecutado"; referenciaExterna: string | null; yaEstabaHecho: boolean }
  /** Todo en orden salvo que falta que una persona lo apruebe. */
  | { estado: "espera_aprobacion"; motivo: string }
  /** Una puerta dijo que no. No se ha ejecutado nada. */
  | { estado: "denegado"; puerta: PuertaQueDenego; motivo: string }
  /** Se ejecutó y el proveedor falló. El gasto NO se descuenta. */
  | { estado: "fallo_del_proveedor"; motivo: string };

export type PuertaQueDenego =
  | "autonomia_del_agente"
  | "autorizacion_de_gasto"
  | "clave_en_curso"
  | "ejecutor_desconocido";

/**
 * Un ejecutor. Sólo tiene que saber hacer una cosa y devolver una referencia
 * de lo que hizo, para que se pueda encontrar después.
 */
export interface Ejecutor {
  readonly id: string;
  ejecutar(
    operacion: string,
    argumentos: Record<string, unknown>,
  ): Promise<{ referenciaExterna: string | null }>;
}

/**
 * Quién decide si una acción que exige persona ya está aprobada.
 *
 * Se inyecta porque hoy hay dos caminos de aprobación en el árbol —las tarjetas
 * de aprobación y el portal del cliente— y el puente no debe elegir por ellos.
 */
export interface RegistroDeAprobaciones {
  estaAprobada(clave: string): Promise<boolean>;
  solicitar(clave: string, resumen: string): Promise<void>;
}

export class PuenteDeEjecucion {
  private readonly ejecutores = new Map<string, Ejecutor>();

  constructor(
    private readonly guarda: GuardaDeGasto,
    private readonly aprobaciones: RegistroDeAprobaciones,
    private readonly registrar: (evento: Record<string, unknown>) => void = (e) =>
      console.error(`[puente] ${Object.entries(e).map(([k, v]) => `${k}=${v}`).join(" ")}`),
  ) {}

  registrarEjecutor(e: Ejecutor): void {
    this.ejecutores.set(e.id, e);
  }

  ejecutoresRegistrados(): string[] {
    return [...this.ejecutores.keys()].sort();
  }

  /**
   * Cruza el puente. Devuelve qué pasó y por qué, nunca lanza para decir «no
   * te dejo»: una denegación es una respuesta, no una avería.
   */
  async cruzar(
    agente: ContratoDeAgente,
    accion: AccionPropuesta,
  ): Promise<ResultadoDelPuente> {
    const traza = {
      agente: agente.id,
      ejecutor: accion.ejecutor,
      operacion: accion.operacion,
      cliente: accion.clientId,
    };

    // ── 1 · ¿su contrato le permite ESTA acción? ───────────────────────────
    //
    // Se comprueba con las consecuencias de la acción concreta, no con las que
    // el agente declaró en su contrato: el mismo agente que redacta un correo
    // puede estar a punto de enviarlo.
    const permiso = puedeHacer(agente, accion.consecuencias);
    if (!permiso.permitido) {
      this.registrar({ ...traza, evento: "denegado", puerta: "autonomia", motivo: permiso.motivo });
      return {
        estado: "denegado",
        puerta: "autonomia_del_agente",
        motivo: permiso.motivo ?? "el agente no puede hacer esta acción",
      };
    }

    // ── 2 · ¿hace falta que una persona diga que sí? ───────────────────────
    if (permiso.exigeAprobacion) {
      const aprobada = await this.aprobaciones.estaAprobada(accion.idempotencyKey);
      if (!aprobada) {
        await this.aprobaciones.solicitar(
          accion.idempotencyKey,
          `${agente.id} quiere ${accion.operacion} en ${accion.ejecutor}`,
        );
        this.registrar({ ...traza, evento: "espera_aprobacion" });
        return {
          estado: "espera_aprobacion",
          motivo: `${accion.operacion} tiene consecuencias que exigen una persona: ${accion.consecuencias.join(", ")}`,
        };
      }
    }

    // ── 3 · ¿el ejecutor existe? ───────────────────────────────────────────
    //
    // Antes de la puerta de gasto: reservar presupuesto para una operación que
    // no se puede hacer deja una reserva colgando.
    const ejecutor = this.ejecutores.get(accion.ejecutor);
    if (!ejecutor) {
      this.registrar({ ...traza, evento: "denegado", puerta: "ejecutor" });
      return {
        estado: "denegado",
        puerta: "ejecutor_desconocido",
        motivo: `no hay ejecutor registrado para "${accion.ejecutor}"`,
      };
    }

    // ── 4 · ¿hay autorización de gasto? ────────────────────────────────────
    //
    // Se pasa por la guarda SIEMPRE que la acción gaste, aunque el importe sea
    // cero: un importe cero declarado por quien propone no es un importe cero
    // comprobado.
    const gasta = accion.consecuencias.includes("gasta_dinero");
    let gastoId: string | null = null;
    let autorizacionId: string | null = null;

    if (gasta) {
      const peticion: PeticionDeGasto = {
        tenantId: accion.tenantId,
        workspaceId: accion.workspaceId,
        serviceId: accion.serviceId,
        proveedor: accion.ejecutor,
        actor: `agente:${agente.id}`,
        operacion: accion.operacion,
        importeCents: accion.importeCents,
        idempotencyKey: accion.idempotencyKey,
      };

      const veredicto = await this.guarda.autorizar(peticion);
      if (!veredicto.permitido) {
        await this.guarda.registrarDenegacion(peticion, veredicto);
        this.registrar({ ...traza, evento: "denegado", puerta: "gasto", motivo: veredicto.motivo });
        return {
          estado: "denegado",
          puerta: "autorizacion_de_gasto",
          motivo: `${veredicto.motivo}: ${veredicto.detalle}`,
        };
      }

      // Ya se hizo con esta clave: se devuelve lo de entonces en vez de
      // lanzar una segunda campaña idéntica.
      if (veredicto.yaEjecutado) {
        this.registrar({ ...traza, evento: "ya_estaba_hecho" });
        return {
          estado: "ejecutado",
          referenciaExterna: veredicto.referenciaExterna,
          yaEstabaHecho: true,
        };
      }

      autorizacionId = veredicto.autorizacionId;
      const solicitud = await this.guarda.registrarSolicitud(peticion, autorizacionId);
      if (!solicitud) {
        // Otra petición con la misma clave se adelantó entre la comprobación y
        // el registro. El UNIQUE lo detecta; no se ejecuta nada.
        this.registrar({ ...traza, evento: "denegado", puerta: "clave_en_curso" });
        return {
          estado: "denegado",
          puerta: "clave_en_curso",
          motivo: "otra operación con esta misma clave está en curso",
        };
      }
      gastoId = solicitud.gastoId;
    }

    // ── 5 · Se ejecuta ─────────────────────────────────────────────────────
    try {
      const r = await ejecutor.ejecutar(accion.operacion, accion.argumentos);

      // ── 6 · Se cierra el rastro ──────────────────────────────────────────
      if (gasta && gastoId && autorizacionId) {
        await this.guarda.marcarEjecutado(
          gastoId,
          autorizacionId,
          accion.importeCents,
          r.referenciaExterna,
        );
      }
      this.registrar({ ...traza, evento: "ejecutado", referencia: r.referenciaExterna });
      return { estado: "ejecutado", referenciaExterna: r.referenciaExterna, yaEstabaHecho: false };
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      // Un gasto fallido NO descuenta presupuesto: cobrarle a un cliente por
      // algo que no ocurrió es cobrarle por nada.
      if (gasta && gastoId) {
        await this.guarda.marcarFallido(gastoId, motivo).catch(() => undefined);
      }
      this.registrar({ ...traza, evento: "fallo_del_proveedor", motivo });
      return { estado: "fallo_del_proveedor", motivo };
    }
  }
}

/**
 * Un ejecutor de mentira, para probar el puente entero sin gastar un céntimo.
 *
 * No vive en `__tests__` a propósito: también sirve para el escenario de agencia
 * completa y para un entorno de demostración. Lo que NO hace nunca es fingir
 * que habló con un proveedor real — devuelve una referencia que se ve a la
 * legua que es simulada.
 */
export class EjecutorSimulado implements Ejecutor {
  readonly llamadas: Array<{ operacion: string; argumentos: Record<string, unknown> }> = [];

  constructor(
    readonly id: string,
    private readonly comportamiento: "ok" | "falla" = "ok",
  ) {}

  async ejecutar(
    operacion: string,
    argumentos: Record<string, unknown>,
  ): Promise<{ referenciaExterna: string | null }> {
    this.llamadas.push({ operacion, argumentos });
    if (this.comportamiento === "falla") {
      throw new Error(`el proveedor ${this.id} rechazo la operacion ${operacion}`);
    }
    return { referenciaExterna: `simulado:${this.id}:${operacion}:${this.llamadas.length}` };
  }
}
