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
disponible y coherente en ese instante. Manrope viste el producto —la usa
`src/app/fonts.ts`—, asi que su fichero vive en el repositorio y el build ya no
sale a Internet a buscarla.

## Que hay

    manrope-latin-variable.woff2   24 KB, subconjunto latin, eje de peso 200-800

Es la fuente VARIABLE, no cuatro instancias estaticas: un solo fichero cubre
todo el rango que usaba la declaracion anterior (`400, 500, 600, 700`).

## Licencia

Manrope se distribuye bajo la SIL Open Font License 1.1, que permite
redistribuir el fichero incluido en un producto. Autor: Mikhail Sharanda.
https://github.com/sharanda/manrope

## Lo que sigue pendiente

Las quince familias restantes —las de las paginas `os/*-premium`— siguen
descargandose de Google en tiempo de build. Es la misma clase de fragilidad y
esta registrada como deuda: hoy no fallaban, y traerlas todas a la vez sin poder
comparar el resultado visual habria sido mas arriesgado que el problema.
