/**
 * El inquilino de la petición en curso, aplicado a cada consulta de PostgreSQL.
 *
 * QUÉ PROBLEMA RESUELVE
 * ---------------------
 * `@nelvyon/web` conecta como `postgres`, que es SUPERUSUARIO: las 498 tablas con
 * RLS y las 1.763 políticas no se le aplican, y `FORCE ROW LEVEL SECURITY`
 * tampoco —FORCE somete al dueño de la tabla, no al superusuario—. El día que se
 * le retire ese privilegio, esas políticas empiezan a decidir; y para decidir
 * necesitan saber quién pregunta.
 *
 * Ese «quién» viaja en dos variables de sesión, porque los ayudantes que usan las
 * políticas no leen la misma:
 *
 *     nelvyon_jwt_user_id()      ->  request.jwt.claim.sub
 *     current_tenant_id()        ->  app.tenant_id
 *     nelvyon_erp_tenant_text()  ->  app.tenant_id
 *
 * Es el mismo mecanismo que `core/contexto_rls.py` ya hace en el lado Python, y
 * por las mismas razones. Aquí se escribe aparte porque el runtime es distinto:
 * allí hay un evento `after_begin` de SQLAlchemy; aquí hay un pool de `pg` y un
 * modelo de peticiones donde nadie pasa un objeto de sesión de mano en mano.
 *
 * POR QUÉ TRANSACCIONAL Y NO DE SESIÓN
 * -------------------------------------
 * `set_config(clave, valor, false)` dura toda la SESIÓN. Y las sesiones son
 * conexiones de un pool que se reutilizan: la petición siguiente —de OTRO
 * inquilino— se encontraría el contexto del anterior. Sería una fuga entre
 * clientes causada justo por el mecanismo que debe evitarlas.
 *
 * `set_config(clave, valor, true)` dura la TRANSACCIÓN y PostgreSQL lo revierte
 * solo al COMMIT o al ROLLBACK. Por eso toda consulta con contexto se envuelve en
 * una transacción, aunque sea un `SELECT` suelto: es lo que hace imposible que el
 * contexto sobreviva a la petición.
 *
 * POR QUÉ AsyncLocalStorage Y NO UN PARÁMETRO
 * --------------------------------------------
 * Hay 240 rutas y 246 servicios de dominio. Enhebrar el inquilino por todos ellos
 * sería un cambio de firma en cada uno, y —lo importante— cada firma nueva sería
 * una oportunidad más de olvidarlo. Ya se vio lo que pasa cuando el inquilino es
 * un parámetro que se puede omitir: cinco servicios OS devolvían los datos de
 * todos los clientes.
 *
 * `AsyncLocalStorage` sobrevive a los `await` dentro de la misma petición, así que
 * el contexto se fija una vez en la frontera y llega hasta la última consulta sin
 * que nadie tenga que acordarse.
 *
 * ES INOCUO HOY
 * -------------
 * Mientras el rol siga siendo superusuario, `set_config` no cambia ni una
 * respuesta: las políticas no llegan a evaluarse. Esto es preparación
 * verificable —se certifica contra un rol sin BYPASSRLS— y no un cambio de
 * conducta. Se puede desplegar y observar antes de tocar ninguna credencial.
 *
 * LO QUE NO HACE
 * --------------
 * No retira el privilegio ni activa nada. Ese paso necesita demostrar antes que
 * TODAS las rutas pasan por aquí, y que las que no —crons, plano `platform`,
 * migraciones— tienen su mecanismo explícito. Saltárselo convertiría un fallo de
 * aislamiento en una caída: con RLS activa y sin contexto, las consultas no dan
 * error, devuelven CERO FILAS.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import type pg from "pg";

/** Quién pregunta. Al menos uno de los dos; los dos si se conocen. */
export type InquilinoDeLaPeticion = {
  /** UUID del tenant SaaS. Alimenta `request.jwt.claim.sub` y `app.tenant_id`. */
  tenantId?: string | null;
  /** Entero del workspace OS. Alimenta `app.workspace_id`. */
  workspaceId?: number | null;
  /** UUID del usuario. Alimenta `request.jwt.claim.sub` cuando se conoce. */
  userId?: string | null;
};

const almacen = new AsyncLocalStorage<InquilinoDeLaPeticion>();

/**
 * Ejecuta `fn` con este inquilino como contexto de todas sus consultas.
 *
 * Se llama UNA vez por petición, en la frontera de autenticación, antes de que
 * nadie consulte nada. Lo de dentro —servicios, ayudantes, `Promise.all`— lo
 * hereda sin saberlo.
 */
export function conInquilino<T>(quien: InquilinoDeLaPeticion, fn: () => Promise<T>): Promise<T> {
  return almacen.run(quien, fn);
}

/**
 * Fija el inquilino para el resto de ESTA cadena de ejecución, sin envolver nada.
 *
 * `conInquilino` necesita rodear el trabajo con una función. Eso obligaría a
 * cambiar la forma de las 240 rutas, y cada cambio sería otra oportunidad de
 * olvidarlo —que es exactamente cómo cinco servicios OS acabaron devolviendo los
 * datos de todos los clientes—.
 *
 * `enterWith` fija el almacén para el contexto asíncrono actual y todo lo que
 * cuelgue de él. Así la frontera de autenticación lo llama UNA vez, en un solo
 * fichero, y las 237 rutas que pasan por `requireSaasContext` quedan cubiertas
 * sin tocar ninguna.
 *
 * LO QUE HAY QUE SABER PARA USARLO BIEN
 * --------------------------------------
 * `enterWith` no acota: no hay un «después» en el que se deshaga solo. Es seguro
 * aquí porque en Node cada petición HTTP nace en su propia cadena asíncrona, así
 * que lo que se fija en una no alcanza a otra. Deja de serlo si se llama desde
 * código compartido entre peticiones —el arranque del módulo, un temporizador
 * global, un manejador de eventos de proceso—: ahí sí quedaría pegado.
 *
 * Regla: `enterWith` SOLO desde una frontera de autenticación, dentro de una
 * petición. Para todo lo demás, `conInquilino`, que se cierra solo.
 *
 * Y la red de debajo no depende de esto: el contexto que llega a PostgreSQL tiene
 * ámbito de TRANSACCIÓN, así que aunque un valor quedara colgado en el proceso,
 * no puede sobrevivir en la conexión a la petición que lo puso.
 */
export function entrarConInquilino(quien: InquilinoDeLaPeticion): void {
  // FUSIONA con lo que ya hubiera, no lo sustituye.
  //
  // Una petición del OS pasa por dos fronteras: `verifyToken` conoce el usuario y
  // el tenant del JWT, y `requireOsWorkspaceAccess` —después— conoce el workspace
  // verificado. Si la segunda sustituyera, se perdería el `tenantId` que la
  // primera ya había establecido, y las 606 políticas que resuelven el inquilino
  // por `request.jwt.claim.sub` se quedarían sin sujeto. Con RLS activa eso no da
  // error: devuelve cero filas.
  //
  // Solo se sobrescriben los campos que llegan con valor, así que una frontera
  // posterior puede REFINAR el contexto pero no vaciarlo por omisión.
  const previo = almacen.getStore() ?? {};
  almacen.enterWith({
    tenantId: quien.tenantId ?? previo.tenantId,
    workspaceId: quien.workspaceId ?? previo.workspaceId,
    userId: quien.userId ?? previo.userId,
  });
}

/** El inquilino de la petición en curso, o `undefined` fuera de una. */
export function inquilinoActual(): InquilinoDeLaPeticion | undefined {
  return almacen.getStore();
}

/**
 * Ejecuta `fn` SIN contexto, a propósito.
 *
 * Para crons y mantenimiento, que legítimamente trabajan entre inquilinos. Es una
 * función con nombre y no la ausencia de una llamada: lo global tiene que
 * escribirse, porque «me olvidé» y «lo quiero todo» no pueden parecerse.
 */
export function sinInquilinoAPropósito<T>(fn: () => Promise<T>): Promise<T> {
  return almacen.run({}, fn);
}

/** Las sentencias `set_config` que corresponden a un contexto. Vacío si no hay nada que fijar. */
export function sentenciasDeContexto(
  quien: InquilinoDeLaPeticion | undefined,
): Array<{ sql: string; params: unknown[] }> {
  if (!quien) return [];
  const fuera: Array<{ sql: string; params: unknown[] }> = [];
  const sujeto = quien.userId ?? quien.tenantId;
  if (sujeto) {
    // `true` = ámbito de transacción. Con `false` duraría toda la sesión y la
    // siguiente petición que reutilizara esta conexión heredaría el inquilino.
    fuera.push({ sql: "SELECT set_config('request.jwt.claim.sub', $1, true)", params: [String(sujeto)] });
  }
  if (quien.tenantId) {
    fuera.push({ sql: "SELECT set_config('app.tenant_id', $1, true)", params: [String(quien.tenantId)] });
  }
  if (quien.workspaceId != null && Number.isInteger(quien.workspaceId)) {
    fuera.push({ sql: "SELECT set_config('app.workspace_id', $1, true)", params: [String(quien.workspaceId)] });
  }
  return fuera;
}

/** Aplica el contexto sobre un cliente que YA está dentro de una transacción. */
export async function aplicarContexto(
  client: pg.PoolClient,
  quien: InquilinoDeLaPeticion | undefined,
): Promise<void> {
  for (const s of sentenciasDeContexto(quien)) {
    await client.query(s.sql, s.params);
  }
}
