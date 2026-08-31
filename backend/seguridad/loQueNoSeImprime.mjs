/**
 * LO QUE NO SE IMPRIME.
 *
 * POR QUÉ EXISTE. Durante una auditoría de variables de entorno, un script de
 * diagnóstico imprimió `LOCAL_AI_DATABASE_URL` recortada a 60 caracteres. El
 * recorte incluía el usuario y parte de la contraseña. No hubo mala intención
 * ni un fallo de permisos: el script hacía exactamente lo que decía su código,
 * y su código era `console.log(clave + " = " + valor.slice(0, 60))`.
 *
 * EL RECORTE NO PROTEGE NADA. Es la lección concreta. Un secreto truncado sigue
 * siendo material sensible: reduce el espacio de búsqueda de quien lo ataque y,
 * en una cadena de conexión, los primeros caracteres son justo los que traen el
 * usuario y el principio de la contraseña. «Sólo los primeros» es un consuelo,
 * no una defensa.
 *
 * QUÉ OFRECE ESTE MÓDULO. Una forma de decir todo lo útil sobre un secreto sin
 * decir el secreto:
 *
 *   · si está definido o no;
 *   · cuánto mide;
 *   · una huella no reversible, para comparar dos valores sin conocerlos;
 *   · y, sólo si alguien escribe por qué, unos últimos caracteres.
 *
 * Con eso se diagnostica casi todo: «¿está puesta?», «¿es la misma que en el
 * otro entorno?», «¿la han cambiado?». Ninguna de esas preguntas necesita el
 * valor.
 *
 * LO QUE NO HACE. No cifra, no guarda y no rota nada. Y no puede impedir que
 * alguien escriba `console.log(process.env.X)`; eso lo vigila el detector que
 * acompaña a este módulo, porque una biblioteca que hay que acordarse de usar
 * no es una defensa: es una recomendación.
 *
 * COSTE EXTERNO: 0 €.
 */
import { createHash } from "node:crypto";

/**
 * `esNombreSensible` y `redactar` viven ahora en `formaDeUnSecreto.mjs`, que no
 * importa nada de Node: las usa tambien el registrador del lado web, y el
 * `import` de `node:crypto` de aqui arriba tumbaba el build del navegador.
 *
 * Se reexportan para que quien las importaba de aqui no tenga que enterarse.
 */
import { esNombreSensible, redactar } from "./formaDeUnSecreto.mjs";

export { esNombreSensible, redactar };

export function huella(valor) {
  if (typeof valor !== "string" || valor.length === 0) return "vacio";
  if (valor.length < 8) return "demasiado_corto_para_huella";
  return createHash("sha256").update(valor, "utf8").digest("hex").slice(0, 12);
}

/**
 * Describe una variable sin revelarla. Es lo que un diagnóstico debe imprimir.
 *
 * `ultimosCaracteres` existe porque a veces hace falta distinguir dos claves a
 * ojo, pero exige `porQue`: si nadie sabe escribir la razón, no hay razón. Y
 * aun con razón se limita a cuatro, y nunca sobre valores cortos.
 */
export function describir(nombre, valor, opciones = {}) {
  const sensible = esNombreSensible(nombre);
  if (valor === undefined || valor === null) return `${nombre}: UNDEFINED`;

  // Un objeto convertido con `String()` da «[object Object]», que no informa de
  // nada y ademas oculta si dentro habia un secreto. Se serializa primero.
  const v =
    typeof valor === "object" ? JSON.stringify(valor) ?? "" : String(valor);
  if (v.length === 0) return `${nombre}: UNDEFINED`;

  // SEGUNDA BARRERA, Y LA QUE DE VERDAD IMPORTA.
  //
  // Clasificar por el NOMBRE es una heuristica: acierta con `DB_PASSWORD` y
  // falla con `config_value`, `dato`, `linea` o cualquier nombre inocente que
  // resulte contener una cadena de conexion. Ese caso apareció de inmediato:
  // una tabla de configuración con las columnas `key` y `value`, donde el
  // nombre no dice nada y el valor podría serlo todo.
  //
  // Así que lo que se va a imprimir pasa SIEMPRE por `redactar`, que mira la
  // FORMA del valor y no su etiqueta. El nombre decide si se resume; la forma
  // decide si, aun resumido, hay que tachar algo.
  if (!sensible) {
    const limpio = redactar(v);
    // Si la forma delató un secreto, se deja de tratar como valor público: se
    // describe igual que si el nombre lo hubiera anunciado.
    if (limpio !== v) {
      return `${nombre}: DEFINED longitud=${v.length} huella=${huella(v)} (la forma del valor parecia un secreto)`;
    }
    return `${nombre}: ${limpio}`;
  }

  const partes = [`DEFINED`, `longitud=${v.length}`, `huella=${huella(v)}`];
  const { ultimosCaracteres, porQue } = opciones;
  if (ultimosCaracteres) {
    if (!porQue || String(porQue).trim().length < 10) {
      throw new Error(
        `describir(${nombre}): pedir ultimosCaracteres exige una razon escrita en porQue.`,
      );
    }
    if (v.length >= 24) partes.push(`termina_en=${v.slice(-Math.min(4, ultimosCaracteres))}`);
    else partes.push("termina_en=<valor demasiado corto para mostrar cola>");
  }
  return `${nombre}: ${partes.join(" ")}`;
}

/**
 * Un `console.log` que no puede filtrar por accidente.
 *
 * Pasa todo por `redactar` antes de escribir. No sustituye a `describir` —lo
 * correcto sigue siendo no llevar el secreto hasta aquí— pero convierte el
 * descuido en un `<REDACTADO>` en vez de en un incidente.
 */
export function imprimirSeguro(...trozos) {
  const linea = trozos
    .map((t) => (typeof t === "string" ? t : JSON.stringify(t)))
    .join(" ");
  // eslint-disable-next-line no-console
  console.log(redactar(linea));
}

/** Describe un mapa entero de variables sin imprimir ninguna sensible. */
export function describirTodas(mapa) {
  return Object.keys(mapa ?? {})
    .sort()
    .map((k) => describir(k, mapa[k]));
}
