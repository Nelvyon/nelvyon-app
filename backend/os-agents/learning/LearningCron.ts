import { learningService } from "./LearningService";

const DAY_MS = 24 * 60 * 60 * 1000;
let timer: NodeJS.Timeout | undefined;

async function scheduleNext(): Promise<void> {
  timer = setTimeout(() => {
    void learningService.autoLearnCycle().finally(() => {
      void scheduleNext();
    });
  }, DAY_MS);
}

export async function initLearningCron(): Promise<void> {
  if (timer) return;
  await learningService.autoLearnCycle().catch(() => {
    // silencioso
  });
  await scheduleNext();
}

export function stopLearningCronForTests(): void {
  if (timer) clearTimeout(timer);
  timer = undefined;
}

if (process.env.VITEST !== "true") {
  void initLearningCron();
}
