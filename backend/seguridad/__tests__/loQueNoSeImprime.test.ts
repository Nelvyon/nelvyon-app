/**
 * NINGÚN DIAGNÓSTICO VUELVE A IMPRIMIR UN SECRETO.
 *
 * QUÉ LO PROVOCÓ. Auditando variables de entorno, un script imprimió
 * `LOCAL_AI_DATABASE_URL` recortada a 60 caracteres. El recorte traía el
 * usuario y parte de la contraseña. El script hacía exactamente lo que decía
 * su código, y su código era, en esencia:
 *
 *     console.log(clave + " = " + String(vars[clave]).slice(0, 60))
 *
 * LA LECCIÓN, que es la que estas pruebas fijan: **recortar no protege**. Un
 * secreto truncado sigue siendo material sensible —reduce el espacio de
 * búsqueda de quien ataque— y en una cadena de conexión los primeros
 * caracteres son justo los que llevan las credenciales. «Sólo los primeros» es
 * un consuelo, no una defensa.
 *
 * DOS DEFENSAS, Y LAS DOS SE PRUEBAN AQUÍ:
 *
 *   1. `loQueNoSeImprime.mjs` — la forma correcta de contarlo todo sobre un
 *      secreto sin contar el valor.
 *   2. `nada-de-secretos-en-los-diagnosticos.mjs` — el detector, porque una
 *      biblioteca que hay que ACORDARSE de usar es una recomendación, no una
 *      defensa. Lo que la convierte en defensa es que algo falle si no se usa.
 *
 * Y EL DETECTOR SE PRUEBA EN LAS DOS DIRECCIONES. Su primera versión señaló
 * seis líneas del repositorio y las seis eran legítimas: imprimían
 * `new URL(dsn).hostname`, que es el host y no la credencial. Un detector con
 * 100 % de falsos positivos se desconecta el primer día y deja de proteger
 * también lo que sí importaba. Por eso hay pruebas de que encuentra el fallo
 * real Y de que no señala lo correcto.
 *
 * COSTE EXTERNO: 0 €. Lee ficheros y compara cadenas.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import fs from "node:fs";

import {
  describir,
  describirTodas,
  esNombreSensible,
  huella,
  redactar,
} from "../loQueNoSeImprime.mjs";
import {
  ficherosAAuditar,
  hallazgosEnLinea,
} from "../../../scripts/nada-de-secretos-en-los-diagnosticos.mjs";

const RAIZ = path.resolve(__dirname, "..", "..", "..");

/** El valor real tenía esta forma. El de aquí es inventado, con la misma pinta. */
const CADENA =
  "postgresql://nelvyon_local_ai_app:UnaClaveQueNoEsLaDeVerdad@host.internal:5432/local_ai";

describe("describir cuenta lo útil sin contar el valor", () => {
  it("LA REGLA: la descripción no contiene el secreto, ni un trozo suyo", () => {
    const salida = describir("LOCAL_AI_DATABASE_URL", CADENA);
    expect(salida).not.toContain(CADENA);
    // Ni siquiera un fragmento: recortar es justo lo que falló la vez anterior.
    for (const n of [8, 16, 24, 40, 60]) {
      expect(salida, `filtra los primeros ${n} caracteres`).not.toContain(CADENA.slice(0, n));
    }
    expect(salida).not.toContain("UnaClaveQueNoEsLaDeVerdad");
    expect(salida).not.toContain("nelvyon_local_ai_app");
  });

  it("pero sí dice lo que un diagnóstico necesita saber", () => {
    const salida = describir("LOCAL_AI_DATABASE_URL", CADENA);
    expect(salida).toContain("DEFINED");
    expect(salida).toContain(`longitud=${CADENA.length}`);
    expect(salida).toMatch(/huella=[0-9a-f]{12}/);
  });

  it("distingue definida de ausente", () => {
    expect(describir("STRIPE_SECRET", undefined)).toContain("UNDEFINED");
    expect(describir("STRIPE_SECRET", "")).toContain("UNDEFINED");
    expect(describir("STRIPE_SECRET", "algo_largo_de_verdad")).toContain("DEFINED");
  });

  it("EL CONTROL: lo que NO es sensible se imprime entero", () => {
    // Una herramienta que oculta `PORT` obliga a saltársela para trabajar, y
    // una política que se salta todo el mundo no protege nada.
    expect(describir("PORT", "3000")).toBe("PORT: 3000");
    expect(describir("NELVYON_AI_ENABLED", "0")).toBe("NELVYON_AI_ENABLED: 0");
  });

  it("pedir la cola del valor exige escribir por qué", () => {
    expect(() => describir("API_KEY", CADENA, { ultimosCaracteres: 4 })).toThrow(/porQue/);
    expect(
      describir("API_KEY", CADENA, {
        ultimosCaracteres: 4,
        porQue: "hay dos claves y hace falta distinguirlas a ojo",
      }),
    ).toContain("termina_en=");
  });
});

describe("la FORMA del valor también decide, no sólo el nombre", () => {
  /**
   * EL HUECO QUE ESTO CIERRA. Clasificar por el nombre es una heurística:
   * acierta con `DB_PASSWORD` y falla con `config_value`. Apareció de
   * inmediato en una tabla real de configuración cuyas columnas son `key` y
   * `value`: el nombre no dice nada y el valor podría serlo todo.
   */
  it("LA REGLA: un nombre inocente con un valor secreto NO se imprime", () => {
    const secreto = "postgresql://u:claveSuperSecreta@h:5432/d";
    const salida = describir("config_value", secreto);
    expect(salida).not.toContain("claveSuperSecreta");
    expect(salida).not.toContain(secreto);
    expect(salida).toContain("la forma del valor parecia un secreto");
  });

  it("también con un token, que no se parece a una URL", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firmafirmafirma";
    expect(describir("dato", jwt)).not.toContain(jwt);
  });

  it("un objeto se serializa en vez de dar «[object Object]»", () => {
    // `String({})` daba «[object Object]»: no filtraba, pero tampoco informaba,
    // y con un secreto dentro habría escondido el problema en vez de verlo.
    expect(describir("value", { modelo: "llama3.2", activo: true })).toContain('"modelo":"llama3.2"');
  });

  it("EL CONTROL: lo inocente sigue leyéndose entero", () => {
    // Si esta prueba se pusiera roja, la herramienta habría dejado de servir:
    // una que lo tacha todo protege igual que apagar el servidor.
    expect(describir("PORT", "3000")).toBe("PORT: 3000");
    expect(describir("checksum", "2ced6015e0a6acde4f3b150d2d4fa558")).toContain(
      "2ced6015e0a6acde4f3b150d2d4fa558",
    );
  });
});

describe("la huella compara sin revelar", () => {
  it("el mismo valor da la misma huella, y otro valor da otra", () => {
    expect(huella(CADENA)).toBe(huella(CADENA));
    expect(huella(CADENA)).not.toBe(huella(`${CADENA}x`));
  });

  it("la huella no aparece dentro del secreto: no es un trozo suyo", () => {
    expect(CADENA.includes(huella(CADENA))).toBe(false);
  });

  it("un valor corto no recibe huella: sería adivinable", () => {
    // SHA-256 sin sal sobre "1234" lo rompe un diccionario al instante.
    expect(huella("1234")).toBe("demasiado_corto_para_huella");
  });
});

describe("clasificación de nombres, en las dos direcciones", () => {
  it("reconoce lo que lleva secreto", () => {
    for (const n of [
      "LOCAL_AI_DATABASE_URL",
      "OPENAI_API_KEY",
      "STRIPE_SECRET",
      "WEBHOOK_SECRET",
      "SESSION_TOKEN",
      "DB_PASSWORD",
    ]) {
      expect(esNombreSensible(n), `${n} debería ser sensible`).toBe(true);
    }
  });

  it("EL CONTROL: no marca lo que sólo suena parecido", () => {
    // Sin esta prueba, endurecer el patrón haría que todo fuera «sensible» y
    // la herramienta se volvería inservible sin que nada lo notara.
    for (const n of [
      "AUTH_ENABLED",
      "SESSION_TIMEOUT",
      "COOKIE_SAMESITE",
      "NEXT_PUBLIC_SITE_URL",
      "PORT",
      "NODE_ENV",
      "NELVYON_AI_ENABLED",
    ]) {
      expect(esNombreSensible(n), `${n} NO debería ser sensible`).toBe(false);
    }
  });
});

describe("redactar limpia lo que uno no escribió", () => {
  const casos: Array<[string, string]> = [
    ["fallo: postgresql://usuario:clavesecreta@db:5432/x", "clavesecreta"],
    [
      "authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.firmafirmafirma",
      "eyJhbGciOiJIUzI1NiJ9",
    ],
    ["OPENAI_API_KEY=sk" + "-proj-AAAABBBBCCCCDDDD", "sk" + "-proj-AAAABBBBCCCCDDDD"],
    ["cookie: session=abcdef1234567890abcdef", "abcdef1234567890abcdef"],
  ];

  it.each(casos)("quita el secreto de: %s", (texto, secreto) => {
    const limpio = redactar(texto);
    expect(limpio).not.toContain(secreto);
    expect(limpio).toContain("<REDACTADO>");
  });

  it("EL CONTROL: no destroza un texto sin secretos", () => {
    // Una redacción que borra todo protege igual que apagar el servidor.
    const inocente = "todo bien: 200 OK, 488 migraciones, 0 pendientes";
    expect(redactar(inocente)).toBe(inocente);
  });

  it("describirTodas no filtra ninguna de las sensibles", () => {
    const lineas = describirTodas({ PORT: "3000", DB_PASSWORD: "clave-larga-secreta-1234" });
    expect(lineas.join("\n")).not.toContain("clave-larga-secreta-1234");
    expect(lineas.join("\n")).toContain("PORT: 3000");
  });
});

describe("el detector encuentra el fallo real y no señala lo correcto", () => {
  it("EL CONTROL POSITIVO: reconoce la línea exacta que filtró", () => {
    // Si esta prueba se pusiera verde con un detector roto, todo lo demás
    // sobra: el repositorio saldría limpio porque nadie está mirando.
    const laQueFiltro =
      "for (const k of loc) console.log(`  ${k} = ${JSON.stringify(String(vars[k]).slice(0, 60))}`);";
    expect(hallazgosEnLinea(laQueFiltro).length).toBeGreaterThan(0);
  });

  it("reconoce las otras formas de filtrar", () => {
    const malas = [
      "console.log(process.env.DATABASE_URL)",
      "console.log(`clave: ${apiKey}`)",
      "console.log(JSON.stringify(process.env))",
      'console.log("dsn=" + dsn)',
    ];
    for (const linea of malas) {
      expect(hallazgosEnLinea(linea).length, `no detecta: ${linea}`).toBeGreaterThan(0);
    }
  });

  it("EL CONTROL NEGATIVO: no señala lo que es seguro", () => {
    // Las cinco primeras fueron falsos positivos reales de la primera versión.
    const buenas = [
      "console.log(`objetivo: ${new URL(dsn).hostname}`)",
      'console.log(`objetivo: ${new URL(dsn.replace(/^a:/, "b:")).hostname}`)',
      'console.log("  gh secret set STAGING_QA_PASSWORD")',
      'console.log(describir("DATABASE_URL", dsn))',
      "console.log(`longitud: ${dsn.length}`)",
      'console.log("200 OK, sin novedad")',
    ];
    for (const linea of buenas) {
      expect(hallazgosEnLinea(linea), `falso positivo en: ${linea}`).toEqual([]);
    }
  });
});

describe("el repositorio entero está limpio", () => {
  const ficheros = ficherosAAuditar(RAIZ);

  it("el denominador no es cero: un cero aquí sería un aprobado falso", () => {
    // Si `git ls-files` devolviera vacío, la prueba de abajo pasaría sin haber
    // mirado nada. Ya ha ocurrido con otras herramientas de este repositorio.
    expect(ficheros.length).toBeGreaterThan(100);
  });

  it("LA REGLA: ninguna herramienta de diagnóstico imprime un secreto", () => {
    const hallazgos: string[] = [];
    for (const rel of ficheros) {
      const abs = path.join(RAIZ, rel);
      if (!fs.existsSync(abs)) continue;
      const lineas = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n").split("\n");
      lineas.forEach((linea, i) => {
        const sinComentario = linea.replace(/^\s*(\/\/|\*|#).*$/, "");
        for (const h of hallazgosEnLinea(sinComentario)) {
          hallazgos.push(`${rel}:${i + 1} ${h.forma} (${h.detalle})`);
        }
      });
    }
    expect(hallazgos, `pueden imprimir un secreto:\n${hallazgos.join("\n")}`).toEqual([]);
  });
});
