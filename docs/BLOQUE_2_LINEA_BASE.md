# Bloque 2 — línea base medida

Antes de tocar nada, qué hay. Todo lo de abajo está **medido**, no supuesto, y
sirve para saber después si algo mejoró o empeoró.

Arrancado el 2026-08-23, al cerrar el Bloque 1.

## Qué promete la interfaz y qué hay detrás

| Medida | Valor |
|---|---:|
| Rutas de API que existen | 922 |
| Rutas distintas que llama la interfaz | 261 |
| Llamadas a rutas **inexistentes** | **0** |
| Rutas de API que devuelven datos inventados (`Math.random`, `mockData`, `placeholderResponse`) | **0** |

Las dos «huérfanas» que salieron en el primer barrido eran artefactos de mi
propia expresión regular: `/api/os/seeds${qs}` y
`/api/saas/workflows/${wf.id}/${ep}` son interpolaciones, y las dos rutas
existen.

## Botones que no llevan a ninguna parte

| Medida | Valor |
|---|---:|
| `<button>` del DOM examinados | 809 |
| `<Button>` de componente examinados | 253 |
| Con `onClick` **vacío** (`() => {}`) | **0** |
| Sin acción detectable | 17 |

De esos 17: **11** están en `components/pa` (plantilla de marketing comprada),
**2** en `saas-w3crm-preview` (página de vista previa), **1** en un widget de
demostración de la matriz de roles, y **3** en `app/saas`, los tres explicables:

- `autopilot/page.tsx` — sin `role` a propósito, para que el spec de E2E lo
  localice con `getByRole`.
- `billing/page.tsx` — está dentro de un `Dropdown.Toggle`; el clic lo cablea el
  componente padre.
- `white-label/page.tsx` — es la **vista previa** del botón del cliente con sus
  colores de marca. Que no haga nada es lo correcto.

### Dos veces me equivoqué al medir esto

La primera pasada dio **158** botones muertos. Estaba mal por dos motivos, y los
dos son míos:

1. La expresión casaba `<Button>` (el componente) además de `<button>` (el
   elemento del DOM). No son lo mismo: `<Button asChild>` delega la navegación en
   su hijo `<Link href>`, así que contarlo como muerto es un falso positivo.
2. Solo miraba `onClick`. Un botón de «mantén pulsado para hablar»
   (`VoiceCommand`) responde a `onPointerDown`/`onPointerUp`, y salía como
   muerto.

Corregidas las dos, 158 → 17. Queda anotado porque el mismo error volvería a
darse: **un barrido que no distingue el elemento del componente mide otra cosa.**

## Lo que esta línea base NO dice

No dice que las 922 rutas funcionen: dice que la interfaz no llama a ninguna que
no exista y que ninguna responde con datos inventados. Que cada una haga lo que
promete es justamente el trabajo del Bloque 2.

Tampoco dice nada de las superficies que no se renderizan desde `apps/web/src`.
