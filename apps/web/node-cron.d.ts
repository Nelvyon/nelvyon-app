declare module "node-cron" {
  export interface ScheduledTask {
    stop(): void;
  }

  export function schedule(
    cronExpression: string,
    func: () => void | Promise<void>,
    options?: Record<string, unknown>,
  ): ScheduledTask;

  const cron: { schedule: typeof schedule };
  export default cron;
}
