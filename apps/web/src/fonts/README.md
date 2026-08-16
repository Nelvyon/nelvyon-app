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

- `src/app/fonts.ts` — Inter, Manrope y DM Sans, la tipografia del producto.
- `src/app/(marketing)/layout.tsx` — Manrope y Outfit.
- `src/app/os/*-premium/layout.tsx` — una familia por pagina, 23 layouts.

Los nombres de las variables CSS (`--font-*`) no cambiaron al autoalojar, ni el
`display`, ni los pesos efectivos: ningun consumidor de estilos tuvo que tocarse.

## El guard

`src/app/__tests__/fuentesLocales.test.ts` barre `src` y falla si reaparece un
import del cargador remoto de fuentes. Ademas comprueba que cada `woff2`
referenciado existe, que tiene cabecera `wOF2` de verdad —una pagina de error
descargada por equivocacion tambien acaba con extension `.woff2`— y que no
quedan ficheros huerfanos en este directorio.
