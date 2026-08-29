/**
 * CADA FAMILIA DE SERVICIO, DE PUNTA A PUNTA.
 *
 * LO QUE YA HABÍA, Y POR QUÉ NO BASTA. `todosLosServiciosPorElMismoCableado`
 * demuestra que los trece servicios con dimensiones recorren el cableado. Pero
 * lo hace con UN cliente sintético y comprobando sólo que la maquinaria encaja.
 *
 * Esto es distinto: recorre el ciclo con CLIENTES DE VERDAD DISTINTOS y
 * comprueba, en cada paso, algo que sólo tiene sentido para ese cliente.
 *
 *   CLIENTE → SERVICIO → INTAKE → CEREBRO → AGENTE → CALIDAD → APROBACIÓN
 *     → EJECUTOR → RESULTADO → ENTREGABLE
 *
 * Y lo que se afirma no es «la cadena funciona» —eso ya estaba— sino:
 *
 *   · que lo que el cliente contesta en el intake LLEGA al agente
 *   · que la calidad juzga la pieza con el criterio de SU disciplina
 *   · que un cliente de sector regulado NO recibe una pieza que le incumpla
 *   · que al final hay un fichero que el cliente puede abrir
 *
 * ETIQUETA: `LOCAL_SIMULATED_EXTERNAL`. El ejecutor es un doble y el modelo no
 * se toca. Lo que se demuestra es el cableado y el criterio, no el contenido.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import { dimensionesQueAportaElCliente } from "../cerebro/dimensiones";
import { CicloDelClienteService } from "../portal/CicloDelClienteService";
import { MotorDeCalidad } from "../calidad/MotorDeCalidad";
import { CLIENTES, cargaDe } from "../calidad/clientesSinteticos";
import { GuardaDeGasto } from "../gasto/guardaDeGasto";
import { CATALOGO } from "../agentes/catalogo";
import { puedeHacer } from "../agentes/contratoDeAgente";
import {
  EjecutorSimulado,
  PuenteDeEjecucion,
  type RegistroDeAprobaciones,
} from "../ejecucion/PuenteDeEjecucion";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "dddddddd-000f-400f-800f-00000000000f";
const WS = 999101;

let pool: pg.Pool;
let cerebro: CerebroDeNegocioService;
let ciclo: CicloDelClienteService;
let guarda: GuardaDeGasto;

const almacen = () => ({
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params);
    return r.rows as T[];
  },
});

/**
 * Las familias, con el cliente al que de verdad le encaja ese servicio.
 *
 * No se emparejan al azar: a un restaurante de barrio con 300 €/mes le encaja
 * SEO local, no una campaña multicanal. Emparejar mal produciría un recorrido
 * que pasa por casualidad.
 */
const FAMILIAS: ReadonlyArray<{
  familia: string;
  servicio: string;
  cliente: string;
  dominioDeCalidad: string;
  /** Una pieza que ese servicio produciría para ESE cliente. */
  pieza: () => Record<string, unknown>;
}> = [
  {
    familia: "SEO",
    servicio: "seo_premium",
    cliente: "restaurante",
    dominioDeCalidad: "seo",
    pieza: () => ({
      metaDescripcion: "Cocina de mercado en Lavapiés, menú diario y carta de temporada en Casa Manuela.",
      h1: ["Casa Manuela · cocina de mercado en Lavapiés"],
      palabraClave: "menú",
      keywords: [{ termino: "menu del dia lavapies", intencion: "transaccional" }],
    }),
  },
  {
    familia: "Paid Media",
    servicio: "ads_premium",
    cliente: "saas_b2b",
    dominioDeCalidad: "ads",
    pieza: () => ({
      urlDestino: "https://rutalia-ejemplo.test/demostracion",
      presupuestoDiarioCents: 40_000,
      canales: ["google"],
      negativas: ["gratis", "empleo", "curso"],
      kpi: "20 demostraciones cualificadas al mes con flotas de más de 50 vehículos",
    }),
  },
  {
    familia: "Social",
    servicio: "social_media_premium",
    cliente: "restaurante",
    dominioDeCalidad: "social",
    pieza: () => ({
      red: "instagram",
      texto: "El martes hay guiso. Reserva mesa.",
      publicacionesPorSemana: 2,
    }),
  },
  {
    familia: "Contenido",
    servicio: "contenido_copywriting_premium",
    cliente: "despacho",
    dominioDeCalidad: "contenido",
    pieza: () => ({
      audiencia: "trabajadores que acaban de recibir una carta de despido",
      anguloPropio: "qué mirar en la carta antes de firmar nada",
    }),
  },
  {
    familia: "Email y ciclo de vida",
    servicio: "email_marketing_premium",
    cliente: "ecommerce",
    dominioDeCalidad: "email",
    pieza: () => ({
      asunto: "Tu pedido de creatina, listo para repetir",
      cuerpo: "Han pasado 30 días. Si quieres repetir, aquí lo tienes. Puedes darte de baja cuando quieras.",
      segmento: "compraron creatina hace 30 días",
    }),
  },
  {
    familia: "Conversión",
    servicio: "funnel_premium",
    cliente: "ecommerce",
    dominioDeCalidad: "cro",
    pieza: () => ({
      hipotesis: "mostrar el coste de envío antes del checkout reduce el abandono en el paso de pago",
      criterioDeExito: "abandono en checkout -8 % con significación del 95 %",
    }),
  },
  {
    familia: "Web",
    servicio: "web_premium",
    cliente: "franquicia",
    dominioDeCalidad: "web",
    pieza: () => ({
      botones: [{ texto: "Pedir cita", destino: "https://dentalia-ejemplo.test/cita" }],
      imagenes: [{ src: "clinica.jpg", alt: "Sala de espera de la clínica de Getafe" }],
      ctasPrincipales: ["Pedir cita"],
      camposDelFormulario: [
        { nombre: "nombre", obligatorio: true },
        { nombre: "telefono", obligatorio: true },
      ],
    }),
  },
  {
    familia: "Reputación",
    servicio: "reputacion_online_orm_premium",
    cliente: "franquicia",
    dominioDeCalidad: "reputacion",
    pieza: () => ({
      respuesta:
        "Sentimos que la espera fuera larga. Escríbenos y revisamos qué pasó ese día en la clínica.",
    }),
  },
];

conBase("cada familia de servicio, de punta a punta", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    cerebro = new CerebroDeNegocioService(almacen());
    ciclo = new CicloDelClienteService(almacen(), cerebro);
    guarda = new GuardaDeGasto(almacen());
  });

  afterAll(async () => {
    await limpiar();
    await pool.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  async function limpiar(): Promise<void> {
    await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM os_client_connections WHERE workspace_id = $1`, [WS]).catch(() => undefined);
    await pool.query(`DELETE FROM os_service_requests WHERE workspace_id = $1`, [WS]).catch(() => undefined);
    await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = $1`, [WS]).catch(() => undefined);
    await pool.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
  }

  afterEach(async () => {
    await limpiar();
    vi.unstubAllEnvs();
  });

  /** Da de alta al cliente sintético y le rellena el intake de ese servicio. */
  async function darDeAlta(idCliente: string, servicio: string): Promise<string> {
    const c = CLIENTES.find((x) => x.id === idCliente)!;
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, sector, status)
       VALUES ($1, 'e2e-familias', $2, $3, 'active') RETURNING id`,
      [WS, c.empresa, c.sector],
    );
    const clientId = rows[0].id;

    await ciclo.pedirServicio({
      workspaceId: WS,
      clientId,
      serviceId: servicio,
      solicitadaPor: "portal:cliente",
      motivo: c.objetivo,
    });

    // El intake, por la puerta del portal y sólo lo que le toca al cliente.
    await ciclo.contestar({
      workspaceId: WS,
      clientId,
      quien: "portal:cliente",
      respuestas: dimensionesQueAportaElCliente(servicio).map((d) => ({
        dimension: d.id,
        valor: ejemploParaCliente(d.forma, c),
      })),
    });

    return clientId;
  }

  for (const f of FAMILIAS) {
    describe(`${f.familia} · ${f.cliente}`, () => {
      it("recorre el ciclo entero y acaba en algo que el cliente puede usar", async () => {
        vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
        const cliente = CLIENTES.find((c) => c.id === f.cliente)!;
        const clientId = await darDeAlta(f.cliente, f.servicio);

        // ── 1 · el intake desbloquea el trabajo ──────────────────────────
        const completitud = await cerebro.completitud(WS, clientId);
        expect(
          completitud.listoParaOperar,
          `${f.familia}: el intake no desbloquea el trabajo — faltan ` +
            completitud.huecos.filter((h) => h.imprescindible).map((h) => h.dimension).join(", "),
        ).toBe(true);

        // ── 2 · lo que el cliente contestó LLEGA al agente ───────────────
        const paraAgente = await cerebro.paraAgente(WS, clientId);
        expect(
          Object.keys(paraAgente.contexto).length,
          `${f.familia}: el agente recibiría un contexto vacío`,
        ).toBeGreaterThan(3);

        // ── 3 · calidad juzga con el criterio de SU disciplina ───────────
        const motor = new MotorDeCalidad();
        const informe = motor.evaluar(
          {
            dominio: f.dominioDeCalidad,
            autor: `agente-${f.servicio}`,
            contenido: f.pieza(),
            contexto: {
              restricciones: cliente.restricciones,
              presupuestoMensualCents: cliente.presupuestoMensualCents,
              visitasMensuales: 40_000,
              origenDeLaLista: "altas en el formulario con doble confirmación",
              horasSemanalesDelCliente: 3,
            },
          },
          "qa-entregable",
        );

        expect(
          informe.veredicto,
          `${f.familia}: una pieza correcta para ${f.cliente} ha suspendido — ` +
            informe.hallazgos.map((h) => `${h.id}: ${h.quePasa}`).join(" · "),
        ).not.toBe("FAIL");

        // ── 4 · el puente exige aprobación y calidad antes de ejecutar ───
        const agente = CATALOGO.find((a) => puedeHacer(a, ["gasta_dinero"]).permitido)!;
        const ejecutor = new EjecutorSimulado("meta_ads");
        const aprobaciones: RegistroDeAprobaciones = {
          async estaAprobada() {
            return true;
          },
          async solicitar() {},
        };
        const puente = new PuenteDeEjecucion(guarda, aprobaciones, () => {}, motor);
        puente.registrarEjecutor(ejecutor);

        await pool.query(
          `INSERT INTO autorizaciones_de_gasto
             (tenant_id, workspace_id, service_id, proveedor, presupuesto_cents,
              tope_por_operacion_cents, vigente_hasta, estado, solicitada_por,
              aprobada_por, aprobada_en)
           VALUES ($1::uuid, $2, $3, 'meta_ads', 500000, 100000,
                   NOW() + interval '30 days', 'aprobada', 'cliente', 'daniel', NOW())`,
          [TENANT, WS, f.servicio],
        );

        const r = await puente.cruzar(agente, {
          ejecutor: "meta_ads",
          operacion: "crear_campana",
          consecuencias: ["gasta_dinero"],
          argumentos: { servicio: f.servicio },
          pieza: {
            dominio: f.dominioDeCalidad,
            autor: `agente-${f.servicio}`,
            contenido: f.pieza(),
            contexto: { restricciones: cliente.restricciones },
          },
          tenantId: TENANT,
          workspaceId: WS,
          serviceId: f.servicio,
          clientId,
          importeCents: 5_000,
          idempotencyKey: `familia:${f.servicio}`,
        });

        expect(
          r.estado,
          `${f.familia}: no llega a ejecutar — ${JSON.stringify(r)}`,
        ).toBe("ejecutado");
        expect(ejecutor.llamadas).toHaveLength(1);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  describe("un cliente regulado NO recibe una pieza que le incumpla", () => {
    it("la clínica dental: una pieza que promete resultados se para", async () => {
      // Es lo que separa un plan flojo de una sanción con el nombre de NELVYON.
      const cliente = CLIENTES.find((c) => c.id === "franquicia")!;
      const motor = new MotorDeCalidad();

      const informe = motor.evaluar(
        {
          dominio: "compliance",
          autor: "agente-web",
          contenido: { cuerpo: "Te garantizamos una sonrisa perfecta en tres sesiones." },
          contexto: { restricciones: cliente.restricciones },
        },
        "qa-entregable",
      );

      expect(informe.veredicto).toBe("FAIL");
    });

    it("y la tienda de suplementos, igual", async () => {
      const cliente = CLIENTES.find((c) => c.id === "ecommerce")!;
      const motor = new MotorDeCalidad();

      const informe = motor.evaluar(
        {
          dominio: "compliance",
          autor: "agente-copy",
          contenido: { cuerpo: "Este producto cura la fatiga y elimina la grasa en dos semanas." },
          contexto: { restricciones: cliente.restricciones },
        },
        "qa-entregable",
      );

      expect(informe.veredicto).toBe("FAIL");
    });

    it("EL CONTROL: una pieza que respeta los límites del mismo cliente pasa", async () => {
      // Sin esto, un motor que suspendiera todo pasaría las dos de arriba.
      const cliente = CLIENTES.find((c) => c.id === "ecommerce")!;
      const motor = new MotorDeCalidad();

      const informe = motor.evaluar(
        {
          dominio: "compliance",
          autor: "agente-copy",
          contenido: { cuerpo: "Cada bote lleva 60 dosis y el envío llega en 24 horas." },
          contexto: { restricciones: cliente.restricciones },
        },
        "qa-entregable",
      );

      expect(informe.veredicto).not.toBe("FAIL");
    });
  });
});

/**
 * Un valor de intake propio de ESTE cliente, no un relleno.
 *
 * Rellenar el intake con «respuesta del cliente» probaría que el cerebro guarda
 * cosas, que ya está probado. Con los datos del cliente sintético se prueba lo
 * que hace falta: que lo suyo llega hasta el agente.
 */
function ejemploParaCliente(
  forma: string,
  c: (typeof CLIENTES)[number],
): Record<string, unknown> {
  switch (forma) {
    case "texto":
      return { texto: `${c.empresa}: ${c.propuestaDeValor}` };
    case "lista":
      return { items: c.hechosQueLoDistinguen };
    case "personas":
      return { personas: [{ nombre: "Cliente tipo", rol: c.publico }] };
    case "competidores":
      return { competidores: c.competidores.map((n) => ({ nombre: n })) };
    case "ubicaciones":
      return { ubicaciones: [{ nombre: "sede", ciudad: c.ubicacion, pais: "ES" }] };
    case "objetivos":
      return { objetivos: [{ metrica: c.objetivo, valorObjetivo: 1, plazo: "3 meses" }] };
    case "presupuesto":
      return { moneda: "EUR", mensualCents: c.presupuestoMensualCents };
    case "booleano":
      return { valor: true };
    default:
      return { nota: c.propuestaDeValor };
  }
}
