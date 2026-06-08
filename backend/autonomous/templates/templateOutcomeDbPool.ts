/** Lazy DB pool — isolated from vitest bundle unless ENABLE_TEMPLATE_LEARNING_DB */

import { DbClient } from "../../db/DbClient";

export async function queryTemplateOutcomes<T>(sql: string, params?: unknown[]): Promise<T[]> {
  return DbClient.getInstance().query<T>(sql, params);
}
