# Checklist Daniel — Proveedor de telefonía (Twilio) real

> Hoy el dialer es **100% simulador** (síntetico, en memoria, sin red). No se hace ninguna
> llamada real. Este checklist es para cuando (si) decidas activar un proveedor real —
> mientras no lo completes y no se avise explícitamente, nada cambia.

## Qué falta para tener un proveedor real (no técnico)

| # | Qué | Qué hace falta de ti |
|---|-----|------------------------|
| 1 | **Cuenta Twilio** | Crear/activar cuenta Twilio de NELVYON con método de pago propio |
| 2 | **Números de teléfono** | Comprar el/los números que se usarán para llamar (por país si aplica) |
| 3 | **A2P / regulación de voz** | Confirmar si tu país exige registro de "caller ID"/verificación de negocio para llamadas salientes |
| 4 | **Consentimiento legal** | Confirmar la base legal para llamar a cada contacto (opt-in explícito, interés legítimo, o exclusión por listas Robinson/DNC según país) |
| 5 | **Grabación de llamadas** | Decidir si se graban llamadas y confirmar el aviso legal requerido a la persona llamada |
| 6 | **Horarios permitidos** | Confirmar franjas horarias legales para llamadas comerciales en cada país objetivo |
| 7 | **Presupuesto** | Aprobar presupuesto de coste por minuto/llamada (Twilio cobra por uso) |

## Qué pasa en el código mientras esto no esté

- `TwilioTelephonyProvider` (el proveedor real) **no se puede ni instanciar** — su
  constructor siempre lanza un error `BLOCKED_EXTERNAL`. No hay ninguna variable de entorno
  que lo active.
- Todo el dialer usa `SimulatorTelephonyProvider`: cola, consentimiento, límites de
  frecuencia y auditoría funcionan de verdad, pero ninguna llamada sale de la memoria del
  servidor.
- Activar el proveedor real requiere que el equipo técnico **reescriba manualmente** esa
  clase — nunca ocurre solo con un cambio de configuración.

## Próximo paso EXACTO

1. Si quieres avanzar hacia llamadas reales, completa la tabla de arriba punto por punto.
2. Avisa al equipo técnico cuando tengas cuenta Twilio + números + confirmación legal de
   consentimiento y horarios.
3. El equipo técnico implementará `TwilioTelephonyProvider` de verdad, con tus credenciales,
   y lo dejará también apagado hasta que tú apruebes explícitamente la primera llamada de
   prueba.
4. Hasta entonces: **simulador únicamente**, sin cambios pendientes de tu parte.
