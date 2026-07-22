/**
 * Per-tenant circuit breaker for MCP tool execution.
 */

export type CircuitState = "closed" | "open" | "half_open";

export class McpCircuitBreaker {
  private failures = 0;
  private state: CircuitState = "closed";
  private openedAt = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly resetMs: number,
  ) {}

  isOpen(): boolean {
    if (this.state === "open") {
      if (Date.now() - this.openedAt >= this.resetMs) {
        this.state = "half_open";
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }

  getState(): CircuitState {
    this.isOpen();
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.state = "closed";
    this.openedAt = 0;
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
