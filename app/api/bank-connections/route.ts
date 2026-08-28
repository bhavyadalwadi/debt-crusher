import { loadBankConnectionDto } from "@/lib/bank-sync";
import { financialJson, requireOwnerContext, safeRouteError } from "@/lib/security";

export async function GET() {
  try {
    return financialJson(await loadBankConnectionDto(await requireOwnerContext()));
  } catch (error) {
    return safeRouteError(error, "Unable to load bank connections.");
  }
}
