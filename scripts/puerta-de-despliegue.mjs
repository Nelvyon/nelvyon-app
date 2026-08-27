#!/usr/bin/env node
/**
 * BLOQUE 10 · la puerta de despliegue.
 *
 * Una checklist en prosa se lee, se asiente y se despliega igual. Esta se
 * EJECUTA, y separa cuatro cosas que la gente confunde:
 *
 *   AUTOMATIC_PASS                 comprobado aquí, ahora, contra el árbol o el entorno.
 *   REQUIRED_CONFIGURATION         falta poner algo. Nadie puede desplegar sin ello.
 *   BLOCKED_HUMAN_DECISION         alguien tiene que decidir. No es un fallo: es una decisión.
 *   EXTERNAL_VERIFICATION_REQUIRED solo se comprueba contra algo que no está aquí.
 *
 * La diferencia importa porque las cuatro se arreglan de forma distinta, y
 * meterlas en la misma lista hace que la única acción posible sea «revisar
 * todo», que es lo mismo que no revisar nada.
 *
 * Los bloqueos NO se escriben aquí a mano: salen de
 * `backend/db/certificacion/decisiones_y_bloqueos.json`, que es la única fuente.
 * Añadir uno allí lo hace aparecer aquí solo.
 *
 * USO
 *   node scripts/puerta-de-despliegue.mjs            # contra el entorno actual
 *   DEPLOY_ENV_FILE=.env.produccion node scripts/...  # contra un fichero de entorno
 *
 * SALIDA
 *   0  si no queda nada bloqueante que dependa de esta maquina
 *   1  si falta configuración obligatoria
 *   2  si algo que debería estar comprobado automáticamente ha FALLADO
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRO = path.join(ROOT, "backend", "db", "certificacion", "decisiones_y_bloqueos.json");

const filas = [];
function fila(clase, id, estado, detalle) {
  filas.push({ clase, id, estado, detalle });
}

/** Lee el entorno: el del proceso, o el fichero que se indique. */
function entorno() {
  const f = process.env.DEPLOY_ENV_FILE;
  if (!f) return process.env;
  const texto = fs.readFileSync(path.resolve(ROOT, f), "utf8");
  const out = { ...process.env };
  for (const linea of texto.split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*)$/.exec(linea);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const ENV = entorno();

// ═════════════════════════════════════════════════════════════════════════════
// 1 · Lo que se comprueba SOLO, contra el árbol
// ═════════════════════════════════════════════════════════════════════════════

function existe(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function contiene(rel, texto) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8").includes(texto);
  } catch {
    return false;
  }
}

/** Defensas que se comprueban en el propio código: si desaparecen, se ve aquí. */
const DEFENSAS = [
  {
    id: "ses_cierra_en_falso_sin_topic",
    ruta: "apps/web/src/app/api/webhooks/ses/route.ts",
    senal: "SES_SNS_TOPIC_ARN required in production",
    porque:
      "sin la lista de topics, cualquiera con una cuenta gratuita de AWS escribia " +
      "en las campanias de cualquier inquilino",
  },
  {
    id: "ses_comprueba_el_topic",
    ruta: "apps/web/src/app/api/webhooks/ses/route.ts",
    senal: "Untrusted TopicArn",
    porque: "verificar la firma NO identifica al remitente: AWS firma para todo el mundo",
  },
  {
    id: "oauth_ata_el_flujo_al_navegador",
    ruta: "apps/web/src/lib/integrations/oauthState.ts",
    senal: "verificarNonceDelNavegador",
    porque:
      "el state firmado prueba quien EMPIEZA el flujo, no quien lo TERMINA; sin el " +
      "nonce, la cuenta de Google Ads de la victima acaba en la del atacante",
  },
  {
    id: "el_websocket_exige_sesion",
    ruta: "apps/web/src/pages/api/os/ws.ts",
    senal: "resolverClienteDeWs",
    porque: "sin esto, cualquiera escucha el canal en vivo de cualquier inquilino",
  },
  {
    id: "el_contexto_de_agente_va_delimitado",
    ruta: "backend/private-ai/context/AgentContextEngine.ts",
    senal: "NELVYON_DATOS",
    porque: "sin delimitar, la memoria del inquilino es texto de sistema para el agente",
  },
  {
    id: "el_pool_tiene_plazo_de_sentencia",
    ruta: "backend/db/DbClient.ts",
    senal: "statement_timeout",
    porque: "una consulta desbocada retiene su conexion y con el pool agotado es una caida",
  },
  {
    id: "la_guarda_de_salida_mira_dentro_de_la_ipv6",
    ruta: "backend/saas/safeEgressUrl.ts",
    senal: "ipv4DentroDeIpv6",
    porque: "sin esto, [::ffff:169.254.169.254] alcanza la metadata de la instancia",
  },
  {
    id: "la_sonda_de_vida_no_toca_la_base",
    ruta: "apps/web/src/app/api/health/live/route.ts",
    senal: null, // se comprueba lo CONTRARIO
    ausente: "checkDatabase",
    porque: "si dependiera de PostgreSQL, un parpadeo reiniciaria todo el parque",
  },
];

for (const d of DEFENSAS) {
  const ok = d.senal
    ? contiene(d.ruta, d.senal)
    : existe(d.ruta) && !contiene(d.ruta, d.ausente);
  fila("AUTOMATIC_PASS", d.id, ok ? "PASA" : "FALLA", ok ? d.ruta : `${d.ruta} · ${d.porque}`);
}

/** Herramientas de operación que tienen que existir el día que hagan falta. */
for (const [id, rel] of [
  ["existe_la_certificacion_de_restauracion", "scripts/certificar-restauracion.mjs"],
  ["existe_el_detector_de_deriva", "scripts/detectar-deriva-de-esquema.mjs"],
  ["existe_el_runner_de_migraciones", "scripts/migrate-pg.mjs"],
  ["existe_el_registro_de_bloqueos", "backend/db/certificacion/decisiones_y_bloqueos.json"],
  ["existe_la_receta_de_las_puertas", "docs/COMO_EJECUTAR_LAS_PUERTAS.md"],
]) {
  const ok = existe(rel);
  fila("AUTOMATIC_PASS", id, ok ? "PASA" : "FALLA", rel);
}

/** Los inventarios derivados tienen que seguir cerrando a cero huérfanos. */
for (const [id, modulo, marca] of [
  ["inventario_superficies_sin_huerfanas", "superficies_atacables", "huerfanas: 0"],
  ["inventario_escalado_sin_huerfanos", "puntos_de_escalado", "huerfanos: 0"],
]) {
  const r = spawnSync("python", [path.join(ROOT, "backend", "db", "certificacion", `${modulo}.py`)], {
    encoding: "utf8",
    cwd: ROOT,
  });
  const ok = (r.stdout || "").includes(marca);
  fila("AUTOMATIC_PASS", id, ok ? "PASA" : "FALLA", ok ? marca : (r.stderr || "").slice(0, 120));
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · Lo que hace falta CONFIGURAR
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Variables sin las cuales NELVYON no debe desplegarse.
 *
 * `SES_SNS_TOPIC_ARN` está aquí por obligación del Bloque 7 y no por gusto: la
 * ruta cierra en falso sin ella, así que su ausencia no es un agujero — es un
 * webhook de SES que deja de funcionar el dia del despliegue.
 */
const OBLIGATORIAS = [
  ["DATABASE_URL", "sin base no hay producto"],
  ["JWT_SECRET", "es la clave de las sesiones y de los enlaces de capacidad"],
  ["CRON_SECRET", "sin ella las 16 rutas de cron cierran en falso y no corre nada"],
  ["SES_SNS_TOPIC_ARN", "sin ella /api/webhooks/ses responde 503 en produccion"],
];

for (const [v, porque] of OBLIGATORIAS) {
  const valor = (ENV[v] ?? "").trim();
  fila(
    "REQUIRED_CONFIGURATION",
    v,
    valor ? "PUESTA" : "FALTA",
    valor ? `${valor.length} caracteres` : porque,
  );
}

/**
 * NUNCA se imprime el valor de un secreto.
 *
 * Esta salida acaba en registros de despliegue, en capturas y en tickets. Todo
 * lo que se dice de una clave es su longitud y si pasa las comprobaciones; si
 * hiciera falta señalar CUÁL de varias es, se dan ocho caracteres de su hash y
 * nunca del valor.
 */
function huella(valor) {
  return createHash("sha256").update(valor).digest("hex").slice(0, 8);
}

/**
 * Valores de relleno. Una variable «puesta» con uno de éstos es peor que vacía:
 * la puerta da verde y el secreto es público.
 *
 * No es una lista teórica — `roles_web.sql` lleva literalmente
 * `cambiar_en_el_cutover` porque es un fichero de certificación local, y el día
 * que alguien lo copie a un `.env` esto tiene que gritar.
 */
const RELLENOS_LARGOS = [
  "changeme", "change_me", "cambiar", "cambiame", "cambiar_en_el_cutover",
  "placeholder", "your-secret", "your_secret", "password", "example", "ejemplo",
];

/**
 * Los cortos se buscan por PALABRA, no por inclusión, y la diferencia es grande.
 *
 * La primera versión buscaba todos por `includes`. Medido sobre 200.000 secretos
 * aleatorios de 48 bytes en base64url: **0,21 % de falsos positivos** — uno de
 * cada 476. Los culpables eran los tokens de tres y cuatro letras (`tbd`,
 * `todo`, `xxxx`), que aparecen por azar dentro de una cadena aleatoria.
 *
 * Un falso positivo aquí no es grave por sí solo —falla cerrado, y regenerar el
 * secreto cuesta diez segundos—, pero una puerta que avisa en falso se acaba
 * ignorando, y entonces deja de servir para lo que sí importa.
 *
 * Exigiendo que el token esté rodeado de algo que no sea alfanumérico, la misma
 * medición da **0,001 %**: 210 veces menos. Y no se pierde ni un caso real —
 * `TODO`, `dev`, `test-secret`, `xxxx` y `tbd` se siguen cazando— porque un
 * valor de relleno de verdad es la cadena entera o va separado por guiones.
 */
const RELLENOS_CORTOS = ["xxxx", "todo", "tbd", "dev", "test", "secret"];

function pareceRelleno(valor) {
  const v = valor.toLowerCase();
  if (RELLENOS_LARGOS.some((r) => v.includes(r))) return true;
  return RELLENOS_CORTOS.some((r) =>
    new RegExp(`(^|[^a-z0-9])${r}([^a-z0-9]|$)`).test(v),
  );
}

/** Longitudes mínimas: una clave corta es peor que ninguna, porque tranquiliza. */
for (const [v, minimo] of [["JWT_SECRET", 32], ["CRON_SECRET", 16]]) {
  const valor = (ENV[v] ?? "").trim();
  if (!valor) continue;
  fila(
    "REQUIRED_CONFIGURATION",
    `${v}_longitud`,
    valor.length >= minimo ? "PUESTA" : "FALTA",
    valor.length >= minimo ? `>= ${minimo}` : `tiene ${valor.length}, hacen falta ${minimo}`,
  );
}

/** Ningún secreto puede ser un valor de relleno ni tener una sola variedad. */
for (const v of ["JWT_SECRET", "CRON_SECRET", "STRIPE_WEBHOOK_SECRET"]) {
  const valor = (ENV[v] ?? "").trim();
  if (!valor) continue;
  const relleno = pareceRelleno(valor);
  // Un secreto de un solo carácter repetido pasa cualquier longitud mínima.
  const variedad = new Set(valor).size;
  const ok = !relleno && variedad >= 8;
  fila(
    "REQUIRED_CONFIGURATION",
    `${v}_no_es_de_relleno`,
    ok ? "PUESTA" : "FALTA",
    ok
      ? `${variedad} caracteres distintos · huella ${huella(valor)}`
      : relleno
        ? "parece un valor de relleno: seria publico"
        : `solo ${variedad} caracteres distintos: no es un secreto`,
  );
}

/**
 * Los dos secretos no pueden ser el mismo.
 *
 * Si `CRON_SECRET` fuera igual que `JWT_SECRET`, quien viera pasar una cabecera
 * de cron —que va en claro en la configuración de cualquier programador de
 * tareas— tendría la clave con la que se firman TODAS las sesiones.
 */
{
  const j = (ENV.JWT_SECRET ?? "").trim();
  const c = (ENV.CRON_SECRET ?? "").trim();
  if (j && c) {
    fila(
      "REQUIRED_CONFIGURATION",
      "los_secretos_son_distintos",
      j === c ? "FALTA" : "PUESTA",
      j === c
        ? "JWT_SECRET y CRON_SECRET son el MISMO valor: la clave de las sesiones "
          + "viaja en una cabecera de cron"
        : "distintos",
    );
  }
}

/**
 * `SES_SNS_TOPIC_ARN`, sintácticamente.
 *
 * No se comprueba que el topic exista —eso exige AWS y es verificación externa—
 * sino que tenga forma de ARN de SNS. Un valor con una errata cierra el webhook
 * igual que si faltara, pero con la puerta en verde, que es peor.
 *
 *     arn:aws:sns:<region>:<cuenta de 12 digitos>:<nombre>
 *
 * Admite varios separados por coma, que es como se declara una lista de topics.
 */
{
  const bruto = (ENV.SES_SNS_TOPIC_ARN ?? "").trim();
  if (bruto) {
    const ARN_SNS = /^arn:aws[a-z-]*:sns:[a-z0-9-]+:\d{12}:[A-Za-z0-9_-]+$/;
    const partes = bruto.split(",").map((s) => s.trim()).filter(Boolean);
    const malos = partes.filter((a) => !ARN_SNS.test(a));
    const ok = partes.length > 0 && malos.length === 0;
    fila(
      "REQUIRED_CONFIGURATION",
      "SES_SNS_TOPIC_ARN_tiene_forma_de_arn",
      ok ? "PUESTA" : "FALTA",
      ok ? `${partes.length} topic(s), forma valida`
         : `${malos.length} de ${partes.length} no son un ARN de SNS`,
    );
  }
}

/**
 * `DATABASE_URL`: que sea una cadena de PostgreSQL y no la clave anónima.
 *
 * Lo segundo lo comprueba `DbClient` al arrancar y lanza, pero llegar ahí
 * significa haber desplegado ya. Aquí se ve antes, y sin imprimir la cadena —
 * que lleva la contraseña dentro.
 */
{
  const bruto = (ENV.DATABASE_URL ?? "").trim();
  if (bruto) {
    let motivo = null;
    let host = "";
    try {
      const u = new URL(bruto.replace(/^postgresql\+asyncpg:/, "postgresql:"));
      host = u.hostname;
      if (!/^postgres(ql)?:$/.test(u.protocol)) motivo = `no es postgres: (${u.protocol})`;
      else if (!u.hostname) motivo = "sin host";
      else if (!u.pathname.replace(/^\//, "")) motivo = "sin nombre de base";
      else if (bruto.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) motivo = "referencia la clave anonima";
    } catch {
      motivo = "no se puede leer como URL";
    }
    fila(
      "REQUIRED_CONFIGURATION",
      "DATABASE_URL_tiene_forma_valida",
      motivo ? "FALTA" : "PUESTA",
      motivo ?? `host ${host}`,   // el host, nunca la contrasena
    );
  }
}

/**
 * Coherencia con el cutover del rol web.
 *
 * Mover `DATABASE_URL` a `nelvyon_web_app` SIN poner
 * `NELVYON_WEB_JOBS_DATABASE_URL` es el error caro de ese cambio: los 14 crons,
 * los 6 webhooks y los planos platform/admin no darían error — devolverían CERO
 * FILAS, en silencio. Medido en `elCutoverDelRolDelLadoWeb.pg.test.ts`.
 */
{
  const principal = (ENV.DATABASE_URL ?? "").trim();
  const trabajos = (ENV.NELVYON_WEB_JOBS_DATABASE_URL ?? "").trim();
  if (/(^|[:/@])nelvyon_web_app([:@]|$)/.test(principal)) {
    fila(
      "REQUIRED_CONFIGURATION",
      "NELVYON_WEB_JOBS_DATABASE_URL",
      trabajos ? "PUESTA" : "FALTA",
      trabajos
        ? "puesta, como exige el cutover"
        : "DATABASE_URL ya apunta a nelvyon_web_app pero falta la conexion "
          + "cross-tenant: los crons y los webhooks devolverian cero filas EN SILENCIO",
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · Lo que tiene que decidir una persona
// ═════════════════════════════════════════════════════════════════════════════

const registro = JSON.parse(fs.readFileSync(REGISTRO, "utf8")).entradas;
for (const e of registro) {
  if (e.clase === "REQUIRED_CONFIGURATION") {
    // Ya se comprueba arriba si es una variable; si no, se lista igual.
    if (!OBLIGATORIAS.some(([v]) => v === e.id)) {
      fila("REQUIRED_CONFIGURATION", e.id, "FALTA", e.titulo);
    }
    continue;
  }
  fila(e.clase, e.id, "PENDIENTE", e.titulo);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · Lo que solo se comprueba fuera de aquí
// ═════════════════════════════════════════════════════════════════════════════

const EXTERNAS = [
  ["rls_del_supabase_gestionado", "los 2 casos de rls.test.ts exigen Supabase en vivo (RUN_SUPABASE_RLS=1)"],
  ["deriva_de_esquema_en_produccion", "ejecutar detectar-deriva-de-esquema.mjs contra la base de produccion"],
  ["colision_de_workspace_en_produccion", "ejecutar la deteccion de STABLE_WORKSPACE_ID_MIGRATION contra produccion"],
  ["restauracion_desde_el_backup_real", "el simulacro corre en local; el backup de produccion hay que restaurarlo una vez"],
  ["entrega_de_correo_real", "SES en produccion: solo se comprueba enviando"],
  ["webhooks_de_stripe_en_vivo", "la firma se certifica en local; la entrega real no"],
];
for (const [id, detalle] of EXTERNAS) {
  fila("EXTERNAL_VERIFICATION_REQUIRED", id, "PENDIENTE", detalle);
}

// ═════════════════════════════════════════════════════════════════════════════
// Informe
// ═════════════════════════════════════════════════════════════════════════════

const porClase = {};
for (const f of filas) (porClase[f.clase] ??= []).push(f);

const ORDEN = [
  "AUTOMATIC_PASS",
  "REQUIRED_CONFIGURATION",
  "BLOCKED_HUMAN_DECISION",
  "EXTERNAL_VERIFICATION_REQUIRED",
];

console.log("═".repeat(78));
console.log("PUERTA DE DESPLIEGUE DE NELVYON");
console.log("═".repeat(78));

for (const clase of ORDEN) {
  const grupo = porClase[clase] ?? [];
  if (!grupo.length) continue;
  console.log(`\n── ${clase} (${grupo.length}) ${"─".repeat(Math.max(0, 60 - clase.length))}`);
  for (const f of grupo) {
    const marca = f.estado === "PASA" || f.estado === "PUESTA" ? "  OK  " : `  ${f.estado.padEnd(4)}`;
    console.log(`${marca} ${f.id.padEnd(42)} ${f.detalle ?? ""}`);
  }
}

const automaticosFallidos = (porClase.AUTOMATIC_PASS ?? []).filter((f) => f.estado === "FALLA");
const configFaltante = (porClase.REQUIRED_CONFIGURATION ?? []).filter((f) => f.estado === "FALTA");
const bloqueos = porClase.BLOCKED_HUMAN_DECISION ?? [];
const externas = porClase.EXTERNAL_VERIFICATION_REQUIRED ?? [];

console.log("\n" + "═".repeat(78));
if (automaticosFallidos.length) {
  console.log(`NO SE PUEDE DESPLEGAR: ${automaticosFallidos.length} comprobacion(es) automatica(s) FALLAN.`);
  console.log("Eso no es configuracion que falte: es una defensa que ha desaparecido del arbol.");
} else if (configFaltante.length) {
  console.log(`FALTA CONFIGURACION: ${configFaltante.length} variable(s) obligatoria(s).`);
  console.log("El arbol esta bien; falta poner cosas en el entorno de despliegue.");
} else {
  console.log("Todo lo comprobable desde aqui esta en verde.");
}
console.log(
  `Quedan ${bloqueos.length} decision(es) humana(s) y ${externas.length} verificacion(es) externa(s).`,
);
console.log("NO son fallos. Son cosas que esta maquina no puede resolver ni comprobar.");
console.log("═".repeat(78));

const destino = path.join(ROOT, "docs", "evidence", "bloque10");
fs.mkdirSync(destino, { recursive: true });
fs.writeFileSync(
  path.join(destino, "puerta_de_despliegue.json"),
  JSON.stringify(
    {
      resumen: {
        automaticos_ok: (porClase.AUTOMATIC_PASS ?? []).length - automaticosFallidos.length,
        automaticos_fallidos: automaticosFallidos.length,
        configuracion_puesta:
          (porClase.REQUIRED_CONFIGURATION ?? []).length - configFaltante.length,
        configuracion_faltante: configFaltante.length,
        decisiones_humanas: bloqueos.length,
        verificaciones_externas: externas.length,
      },
      filas,
    },
    null,
    2,
  ),
);
console.log(`evidencia: ${path.join(destino, "puerta_de_despliegue.json")}`);

process.exit(automaticosFallidos.length ? 2 : configFaltante.length ? 1 : 0);
