export type { MarcaInput, MarcaOutput } from "./shared";
export {
  marcaLlmOpts as marcaLlmOpts,
  parseMarcaLlmJson,
  buildMarcaPrompt,
  runMarcaAgentCore,
  getDefaultMarcaLlm,
} from "./shared";
export * from "./MarcaIdentidadAgent";
export * from "./MarcaPosicionamientoAgent";
export * from "./MarcaTonoComunicacionAgent";
export * from "./MarcaNamingAgent";
export * from "./MarcaArquitecturaAgent";
export * from "./MarcaConsistenciaAgent";
export * from "./MarcaPerceptionAgent";
export * from "./MarcaEvolucionAgent";

import { resetMarcaArquitecturaAgentForTests } from "./MarcaArquitecturaAgent";
import { resetMarcaConsistenciaAgentForTests } from "./MarcaConsistenciaAgent";
import { resetMarcaEvolucionAgentForTests } from "./MarcaEvolucionAgent";
import { resetMarcaIdentidadAgentForTests } from "./MarcaIdentidadAgent";
import { resetMarcaNamingAgentForTests } from "./MarcaNamingAgent";
import { resetMarcaPerceptionAgentForTests } from "./MarcaPerceptionAgent";
import { resetMarcaPosicionamientoAgentForTests } from "./MarcaPosicionamientoAgent";
import { resetMarcaTonoComunicacionAgentForTests } from "./MarcaTonoComunicacionAgent";

export function resetAllMarcaAgentsForTests(): void {
  resetMarcaIdentidadAgentForTests();
  resetMarcaPosicionamientoAgentForTests();
  resetMarcaTonoComunicacionAgentForTests();
  resetMarcaNamingAgentForTests();
  resetMarcaArquitecturaAgentForTests();
  resetMarcaConsistenciaAgentForTests();
  resetMarcaPerceptionAgentForTests();
  resetMarcaEvolucionAgentForTests();
}
