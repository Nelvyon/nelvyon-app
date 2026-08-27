/**
 * La política de email de los contactos del CRM.
 *
 * QUÉ HABÍA ANTES
 * ===============
 * Nada. `normalizeOptional` recortaba espacios y ya: `"no soy un email"`,
 * `"pepe@"`, `"a@b"` y `"<script>"` entraban tal cual en `saas_contacts.email`.
 * La tabla tampoco tiene ninguna restricción de formato — comprobado en el
 * catálogo, no supuesto.
 *
 * Eso importa más de lo que parece porque ese campo no es decorativo: es a donde
 * salen las campañas. Un email inválido no falla al guardarse, falla semanas
 * después, en un envío, contra un proveedor externo y sobre una lista entera.
 *
 * POR QUÉ NO BASTA CON «VALIDAR»
 * ===============================
 * Poner una validación estricta en todas las puertas a la vez es la respuesta
 * fácil y rompe cosas legítimas:
 *
 *   · Los contactos que YA están guardados con un email raro dejarían de poder
 *     editarse — ni siquiera para arreglarles el teléfono— porque la validación
 *     saltaría al reescribir la fila entera.
 *   · Una importación de 5.000 contactos con tres emails malos se rechazaría
 *     entera. Quien la hace no sabe cuáles son los tres.
 *
 * Rechazar datos que ya existen no es rigor: es perderlos por otra vía.
 *
 * LA POLÍTICA, ENTONCES, ES POR PUERTA
 * =====================================
 *   crear / editar de uno en uno   ESTRICTO. Hay una persona delante que puede
 *                                  corregirlo, y el error dice qué pasa.
 *   importación en lote            NO RECHAZA. Importa el contacto, conserva el
 *                                  valor tal cual y lo DEVUELVE en un informe
 *                                  para que se pueda arreglar sabiendo cuál es.
 *   lo ya guardado                 INTOCABLE. Se lee, se lista y se edita. Sólo
 *                                  se exige validez si se cambia el email.
 *
 * La tercera es la que hace que esto se pueda desplegar sin migrar nada.
 *
 * SOBRE LA FORMA DEL PATRÓN
 * =========================
 * Deliberadamente conservador: `algo@algo.algo`, sin espacios, con TLD de dos
 * letras o más. No pretende implementar el RFC 5322 —que admite cosas que
 * ningún proveedor de correo acepta— sino rechazar lo que seguro no se puede
 * enviar. Un validador más listo que el proveedor rechaza direcciones buenas, y
 * eso se paga en soporte.
 *
 * Es el MISMO patrón que `AuthService.EMAIL_RE` usa para registrarse. Tener dos
 * definiciones de «email válido» en el mismo producto significa que un contacto
 * podría ser inválido para el CRM y válido para el alta, o al revés.
 */

/** Igual que el de `AuthService`: una sola definición de email válido. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Cortado por lo que aguanta el estándar: 254 caracteres en total. */
const LARGO_MAXIMO = 254;

export type EmailDeContacto = {
  /** El valor normalizado, o `null` si venía vacío. Nunca se inventa. */
  valor: string | null;
  /** `true` si es enviable, o si no hay email (ausencia no es invalidez). */
  valido: boolean;
  /** Por qué no vale, en una línea. `null` si vale. */
  motivo: string | null;
};

/**
 * Normaliza y dictamina, sin decidir qué hacer con el resultado.
 *
 * La decisión —rechazar o informar— es de cada puerta, y por eso esta función no
 * lanza. Si lanzara, la importación no podría usarla sin envolverla en un
 * `try` por fila, y ahí es donde se pierden los informes.
 */
export function examinarEmailDeContacto(bruto: string | null | undefined): EmailDeContacto {
  if (bruto === undefined || bruto === null) {
    return { valor: null, valido: true, motivo: null };
  }
  // Minúsculas y sin espacios alrededor: lo mismo que hace `normalizeEmail` en
  // la deduplicación. Si aquí se normalizara distinto, dos contactos que el
  // deduplicador considera el mismo se guardarían con dos valores distintos.
  const v = bruto.trim().toLowerCase();
  if (v.length === 0) {
    // Vacío es ausencia, no error. Un contacto sin email es legítimo: hay quien
    // sólo tiene teléfono.
    return { valor: null, valido: true, motivo: null };
  }
  if (v.length > LARGO_MAXIMO) {
    return { valor: v, valido: false, motivo: `pasa de ${LARGO_MAXIMO} caracteres` };
  }
  if (!EMAIL_RE.test(v)) {
    return { valor: v, valido: false, motivo: "no tiene la forma nombre@dominio.ext" };
  }
  return { valor: v, valido: true, motivo: null };
}

/**
 * Para las puertas estrictas: devuelve el valor o explica por qué no.
 *
 * El mensaje incluye el valor recibido a propósito. «Email inválido» a secas
 * obliga a adivinar cuál de los campos del formulario es, y en una importación
 * de 5.000 filas no dice nada en absoluto.
 */
export function exigirEmailDeContacto(bruto: string | null | undefined): {
  ok: true; valor: string | null;
} | {
  ok: false; mensaje: string;
} {
  const r = examinarEmailDeContacto(bruto);
  if (r.valido) return { ok: true, valor: r.valor };
  return { ok: false, mensaje: `email invalido (${r.motivo}): ${JSON.stringify(r.valor)}` };
}
