# Fuentes autoalojadas

## Por que estan aqui

El build de produccion fallo —en CI y en local— con:

    Failed to fetch `Manrope` from Google Fonts

No era un corte generico: `fonts.googleapis.com` respondia 200 y las otras
quince familias descargaban bien. Lo que fallaba eran los ficheros del
subconjunto `latin` de Manrope, que devolvian 404 de forma consistente mientras
la hoja de estilo seguia anunciandolos. Una inconsistencia del lado de Google,
imposible de arreglar desde aqui y capaz de tumbar cualquier despliegue sin
previo aviso.

Un build de produccion no deberia depender de que un CDN de terceros este
disponible y coherente en ese instante. Que aquel dia solo fallara Manrope fue
suerte, no diseño: `next/font/google` descarga la fuente **durante el build**,
asi que cada import era el mismo punto de fallo remoto esperando su turno. Las
dieciseis familias viven ahora en este directorio y se cargan con
`next/font/local`. El build ya no sale a Internet a buscar tipografia.

## Que hay

Una sola instancia VARIABLE por familia: un fichero cubre todo el eje de peso,
asi que no hacen falta las instancias estaticas que se pedian antes. Todos son
el subconjunto `latin` —el bloque `@font-face` con `unicode-range` que incluye
`U+0000-00FF`—, el mismo que servia Google.

| Fichero | Familia | Eje de peso | Tamaño | Autoria | Licencia |
| --- | --- | --- | ---: | --- | --- |
| `dm-sans-latin-variable.woff2` | DM Sans | 100-1000 | 36 KB | Colophon Foundry, Jonny Pinhorn, Indian Type Foundry | OFL 1.1 |
| `exo-2-latin-variable.woff2` | Exo 2 | 100-900 | 40 KB | Natanael Gama | OFL 1.1 |
| `figtree-latin-variable.woff2` | Figtree | 300-900 | 20 KB | Erik Kennedy | OFL 1.1 |
| `ibm-plex-sans-latin-variable.woff2` | IBM Plex Sans | 100-700 | 45 KB | Mike Abbink, Bold Monday | OFL 1.1 |
| `inter-latin-variable.woff2` | Inter | 100-900 | 47 KB | Rasmus Andersson | OFL 1.1 |
| `jetbrains-mono-latin-variable.woff2` | JetBrains Mono | 100-800 | 39 KB | JetBrains, Philipp Nurullin, Konstantin Bulenkov | OFL 1.1 |
| `lexend-latin-variable.woff2` | Lexend | 100-900 | 39 KB | Bonnie Shaver-Troup, Thomas Jockin, Santiago Orozco, Héctor Gómez | OFL 1.1 |
| `lora-latin-variable.woff2` | Lora | 400-700 | 37 KB | Cyreal | OFL 1.1 |
| `manrope-latin-variable.woff2` | Manrope | 200-800 | 24 KB | Mikhail Sharanda | OFL 1.1 |
| `newsreader-latin-variable.woff2` | Newsreader | 200-800 | 57 KB | Production Type | OFL 1.1 |
| `outfit-latin-variable.woff2` | Outfit | 100-900 | 32 KB | Smartsheet Inc, Rodrigo Fuenzalida | OFL 1.1 |
| `playfair-display-latin-variable.woff2` | Playfair Display | 400-900 | 38 KB | Claus Eggers Sørensen | OFL 1.1 |
| `plus-jakarta-sans-latin-variable.woff2` | Plus Jakarta Sans | 200-800 | 27 KB | Tokotype | OFL 1.1 |
| `sora-latin-variable.woff2` | Sora | 100-800 | 33 KB | Jonathan Barnbrook, Julián Moncada | OFL 1.1 |
| `source-sans-3-latin-variable.woff2` | Source Sans 3 | 200-900 | 28 KB | Paul D. Hunt | OFL 1.1 |
| `space-grotesk-latin-variable.woff2` | Space Grotesk | 300-700 | 22 KB | Florian Karsten | OFL 1.1 |

Total: 562 KB en el repositorio. Al navegador solo le llega la familia de la
pagina que visita, igual que antes.

## Licencias

**Las dieciseis estan bajo SIL Open Font License 1.1**, que permite redistribuir
el fichero incluido en un producto siempre que no se venda la fuente por
separado y se conserve el aviso de licencia —que es este documento—. Autoria y
licencia verificadas contra los `METADATA.pb` del repositorio oficial
`google/fonts` (https://github.com/google/fonts): las dieciseis viven bajo
`ofl/` y declaran `license: "OFL"`.

Ninguna familia quedo fuera por motivos de licencia.

## Como se obtuvieron

Consultando la CSS API de Google con un User-Agent moderno —para que devuelva
`woff2` y no formatos heredados— y quedandose con el bloque `@font-face` cuyo
`unicode-range` incluye `U+0000-00FF`:

    curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
      (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
      "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap"

El rango `wght@min..max` es lo que hace que Google sirva la fuente variable en
vez de una instancia estatica. Los limites de cada eje salen de los metadatos
que usa el propio Next (`next/dist/compiled/@next/font/dist/google/font-data.json`),
asi que el rango declarado en el codigo coincide con el que ofrece la familia y
cubre todos los pesos que se pedian antes.

Para actualizar una familia: repetir la consulta, descargar el `woff2` del
bloque `latin` sobre el fichero existente y comprobar que sigue siendo un woff2
(`file <fichero>` debe decir «Web Open Font Format (Version 2)»).

## Quien las usa

- `src/app/fonts.ts` — Inter, Manrope y DM Sans, la tipografía del producto.
- `src/app/(marketing)/layout.tsx` — Manrope y Outfit.
- `src/app/os/*-premium/layout.tsx` — una familia por página, 23 layouts.
- `src/lib/fonts/fuentesEmbebidas.ts` — Playfair Display e Inter, incrustadas en
  base64 dentro del HTML del certificado del LMS.

Los nombres de las variables CSS (`--font-*`) no cambiaron al autoalojar, ni el
`display`, ni los pesos efectivos: ningún consumidor de estilos tuvo que tocarse.

## HTML que no pasa por Next

El build dejó de salir a Internet, pero quedaba una dependencia remota más
sutil, esta de **tiempo de ejecución**: el certificado del LMS
(`src/app/api/saas/lms/cert/[id]/route.ts`) se genera como una cadena de HTML y
sale tal cual por la respuesta, con un `@import` a la CSS API de Google dentro.
No lo pagaba el build sino el navegador de quien abriera el certificado —o lo
imprimiera a PDF—, y de paso le anunciaba la visita a un tercero.

Ese HTML no pasa por el pipeline de Next, así que no puede usar
`next/font/local`: no hay componente que emita el `<link>` ni URL generada a la
que apuntar. `src/lib/fonts/fuentesEmbebidas.ts` lee el `woff2` de este
directorio, lo codifica en base64 y emite un `@font-face` con la fuente dentro
del propio documento. No hay petición externa, no depende de que ninguna ruta
estática resuelva en producción y no toca el bundle del cliente: la lectura y el
encoding ocurren en el servidor, cacheados en el módulo, y el resultado viaja en
el HTML que ya se estaba enviando. Si el fichero faltara, la regla se omite y el
documento cae en el fallback declarado (`serif` / `sans-serif`) en vez de
romperse o volver a salir a Internet.

Los `woff2` que consume se declaran en `outputFileTracingIncludes`
(`next.config.ts`): nadie los importa como módulo, así que el trazado no los
vería y no los copiaría a la salida del servidor.

## El pack estático de `public/`

Quedaba una tercera vía, y era la más ruidosa: el pack estático que se sirve tal
cual desde `public/` —las 19 páginas de `public/www` y la hoja de W3CRM
`public/w3crm/css/style.css`—. Cada página traía un `<link>` a la CSS API y la
hoja seis `@import`; se sirven en este mismo origen (`/` y `/*.html` vía
rewrite), así que cada visita a la portada o al panel SaaS acababa pidiendo
tipografía a Google.

Tampoco pasa por el pipeline de Next —no hay componente que emita nada— pero, a
diferencia del certificado, sí puede referenciar una URL de este origen: los
ficheros viven en **`public/fonts/`** y cada página o hoja declara su
`@font-face` contra `/fonts/<fichero>.woff2`, con las mismas familias, los
mismos pesos efectivos y el mismo `font-display: swap` que servía Google.
`public/fonts` es una copia deliberada: `src/fonts` solo es alcanzable a través
del pipeline, y estos ficheros se piden por URL.

| Fichero (`public/fonts/`) | Familia | Eje de peso | Quién la usa |
| --- | --- | --- | --- |
| `sora-latin-variable.woff2` | Sora | 100-800 | `public/www` (`--title-font`) |
| `urbanist-latin-variable.woff2` | Urbanist | 100-900 | `public/www` (`--title-font2`) |
| `work-sans-latin-variable.woff2` | Work Sans | 100-900 | `public/www` (`--body-font`) |
| `poppins-latin-{300,400,500,600,700,800}.woff2` | Poppins | 300/400/500/600/700/800 | W3CRM (`--bs-body-font-family`) |
| `cairo-latin-variable.woff2` | Cairo | 200-1000 | W3CRM (`[data-typography="cairo"]`) |
| `open-sans-latin-variable.woff2` | Open Sans | 300-800 | W3CRM (`[data-typography="opensans"]`) |
| `roboto-latin-variable.woff2` | Roboto | 100-900 | W3CRM (`[data-typography="roboto"]`, datamaps) |

Sora es el mismo fichero que ya estaba en `src/fonts`, copiado. Las otras seis
se obtuvieron igual que las dieciséis de arriba y están las seis bajo `ofl/` en
`google/fonts` con `license: "OFL"`; ninguna quedó fuera por licencia.

Dos matices:

- **Poppins no tiene versión variable** en Google Fonts (sin `axes` en los
  metadatos; pedirle un rango `wght@100..900` devuelve *400: Font family not
  found*). Se autoalojan seis instancias estáticas, exactamente los pesos que
  pedía el `@import` original —300 a 800—, ni uno más ni uno menos.
- **Montserrat y Nunito no se autoalojaron**: la hoja de W3CRM las importaba,
  pero ningún selector suyo ni del pack las nombra. Traerlas habría sido peso
  muerto; no traerlas no cambia nada de lo que se pinta.

Las páginas de `public/www` pedían además el eje itálico de Urbanist y Work
Sans. No se autoaloja: ninguna página usa `font-style: italic` ni la clase
`.fst-italic` de Bootstrap, así que la cara itálica nunca llegaba a
seleccionarse.

## La CSP

`src/lib/security/headers.ts` **ya no autoriza** `fonts.googleapis.com` ni
`fonts.gstatic.com`: `style-src` quedó en `'self' 'unsafe-inline'` y `font-src`
en `'self' data:`. No queda quien los pida —ni la aplicación, ni el certificado,
ni el pack estático—, así que la política deja de anunciar un permiso que solo
servía para que un error futuro pasara desapercibido. `data:` sigue en
`font-src` por las fuentes en base64 del propio pack y del certificado.

## El guard

`src/app/__tests__/fuentesLocales.test.ts` barre `src` y falla si reaparece un
import del cargador remoto de fuentes. Además comprueba que cada `woff2`
referenciado existe, que tiene cabecera `wOF2` de verdad —una página de error
descargada por equivocación también acaba con extensión `.woff2`— y que no
quedan ficheros huérfanos en este directorio.

Un segundo bloque cubre el tiempo de ejecución: ningún fichero de `src` **ni de
`public`** —código, CSS o HTML— puede nombrar los dos orígenes de Google Fonts.
La única excepción es el propio guard, que los monta por partes para buscarlos
sin dispararse contra sí mismo; la que tenía `lib/security/headers.ts` se retiró
al recortar la CSP, así que reabrirla falla aquí. El mismo bloque fija que las
dos directivas quedaron recortadas y que todo `/fonts/*.woff2` que pide el pack
existe bajo `public/fonts`, tiene cabecera `wOF2` y no sobra ninguno.

`src/app/api/saas/lms/cert/__tests__/certificadoSinFuentesRemotas.test.ts` lo
confirma sobre el HTML generado de verdad: sin `@import`, sin esos dominios y con
las dos familias viajando como data URI con cabecera `wOF2` válida.
