import { BaseOsAgent } from "../BaseOsAgent";
import type { OsAgentStep, OsJobContext } from "../types";

export class StubPremiumAgent extends BaseOsAgent {
  readonly serviceId: string;
  readonly steps: OsAgentStep[];

  constructor(serviceId: string) {
    super();
    this.serviceId = serviceId;
    this.steps = [
      {
        name: "os_stub_delivery",
        description: `Ejecución stub v1 para ${serviceId} (listo para conectar LLM/API)`,
        run: async (_payload, ctx: OsJobContext) =>
          JSON.stringify({
            mode: "stub",
            serviceId: ctx.serviceId,
            note: "NELVYON OS v1 wiring — reemplazar con pipeline real.",
          }),
      },
    ];
  }
}
