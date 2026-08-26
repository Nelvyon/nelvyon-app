/**
 * Per-tenant circuit breaker for MCP tool execution.
 */

export type CircuitState = "closed" | "open" | "half_open";

export class McpCircuitBreaker {
  private failures = 0;
  private state: CircuitState = "closed";
  private openedAt = 0;
  /**
   * Ya hay una sonda en vuelo por el circuito medio abierto.
   *
   * Sin esto, `isOpen()` devolvia `false` en TODAS las llamadas desde que
   * entraba en `half_open` hasta que alguien registrase el resultado: al
   * cumplirse el tiempo de reposo, la cola entera de peticiones acumuladas
   * entraba a la vez contra la dependencia que acababa de caerse. Eso no es
   * recuperarse, es rematarla — y es como una caida breve se convierte en larga.
   *
   * Medio abierto significa **una** sonda. Si va bien, se cierra; si va mal, se
   * vuelve a abrir. Mientras se decide, los demas siguen cortados.
   */
  private sondaEnVuelo = false;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetMs: number,
  ) {}

  /**
   * ¿Hay que cortar esta peticion? Puede MUTAR el estado: es la puerta.
   *
   * Quien solo quiera mirar tiene `getState()`, que no toca nada.
   */
  isOpen(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.resetMs) {
        this.state = "half_open";
        this.sondaEnVuelo = true;
        return false; // esta es la sonda
      }
      return true;
    }
    if (this.state === "half_open") {
      // Ya hay una sonda decidiendo. El resto espera.
      return this.sondaEnVuelo;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
    this.sondaEnVuelo = false;
  }

  recordFailure(): void {
    this.failures += 1;
    this.sondaEnVuelo = false;
    if (this.failures >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  /**
   * Lectura PURA del estado.
   *
   * Antes llamaba a `isOpen()`, que muta: un panel de observabilidad sondeando
   * el estado movia el circuito de `open` a `half_open` por su cuenta. El
   * observador cambiaba lo observado, y la siguiente peticion real se colaba
   * por una puerta que no habia abierto ella.
   *
   * Se calcula si el reposo ya venció sin escribirlo: quien mira, mira.
   */
  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.openedAt >= this.resetMs) {
      return "open"; // vencido pero aun sin sonda: sigue abierto hasta que alguien pase
    }
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = "closed";
    this.openedAt = 0;
    this.sondaEnVuelo = false;
  }
}

const breakers = new Map<string, McpCircuitBreaker>();

export function getTenantCircuit(
  tenantId: string,
  failureThreshold: number,
  resetMs: number,
): McpCircuitBreaker {
  let b = breakers.get(tenantId);
  if (!b) {
    b = new McpCircuitBreaker(failureThreshold, resetMs);
    breakers.set(tenantId, b);
  }
  return b;
}

export function resetAllCircuitsForTests(): void {
  breakers.clear();
}
