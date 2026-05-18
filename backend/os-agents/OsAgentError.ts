/** Structured failure from OS agents / LLM transport (strict messaging for orchestrator + logs). */
export class OsAgentError extends Error {
  readonly code: string;

  constructor(message: string, code = "os_agent") {
    super(message);
    this.name = "OsAgentError";
    this.code = code;
  }
}
