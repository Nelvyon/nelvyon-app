import { RUNNERS } from "@/app/api/os/packs/[packId]/kickoff/runnersMap";
import type { DiffRunnerPort } from "@nelvyon/saas";

/** Wires OS pack RUNNERS into OsBriefDiffRerunService rerun execution. */
export function createBriefDiffRunnerPort(): DiffRunnerPort {
  return {
    validate(packId, body) {
      const entry = RUNNERS[packId];
      return entry ? entry.validate(body) : null;
    },
    async run({ workspaceId, userId, intake, packId }) {
      const entry = RUNNERS[packId];
      if (!entry) throw new Error(`Pack desconocido: ${packId}`);
      const validated = entry.validate(intake);
      if (!validated) throw new Error(`Brief inválido para ${packId}`);
      const run = await entry.run({ workspaceId, userId, intake: validated as never });
      return { id: run.id };
    },
  };
}
