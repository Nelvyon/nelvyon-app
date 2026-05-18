import { authenticate } from "@nelvyon/auth";
import { getNelvyonAdminService } from "@nelvyon/admin";
import { OsAgentError } from "@nelvyon/os-agents";

export async function assertAdmin(req: Request): Promise<void> {
  const claims = await authenticate(req);
  const isAdmin = await getNelvyonAdminService().isUserAdmin(claims.userId);
  if (!isAdmin) throw new OsAgentError("Forbidden");
}
