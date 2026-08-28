import { loadStagedChangeDto } from "@/lib/bank-sync";
import { financialJson, requireOwnerContext, safeRouteError } from "@/lib/security";

export async function GET() {
  try {
    return financialJson(await loadStagedChangeDto(await requireOwnerContext()));
  } catch (error) {
    return safeRouteError(error, "Unable to load proposed changes.");
  }
}
