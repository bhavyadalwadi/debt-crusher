import { createPortfolioBackup, parsePortfolioBackup } from "@/lib/backup";
import {
  loadCompleteHistory,
  loadPortfolioBundle,
  restorePortfolioBackup,
} from "@/lib/portfolio-store";
import {
  assertSameOrigin,
  financialJson,
  readBoundedJson,
  requireOwnerContext,
  requireStrictReverification,
  safeRouteError,
} from "@/lib/security";

export async function GET() {
  try {
    const context = await requireOwnerContext();
    const reverification = requireStrictReverification(context);
    if (reverification) return reverification;
    const [bundle, history] = await Promise.all([
      loadPortfolioBundle(),
      loadCompleteHistory(),
    ]);
    return financialJson(
      createPortfolioBackup({
        portfolio: bundle.portfolio,
        snapshots: history.snapshots,
        events: history.events,
      }),
    );
  } catch (error) {
    return safeRouteError(error, "Failed to export backup");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireOwnerContext();
    const reverification = requireStrictReverification(context);
    if (reverification) return reverification;
    const backup = parsePortfolioBackup(await readBoundedJson(request, 5_000_000));
    const bundle = await restorePortfolioBackup(backup);
    return financialJson(bundle);
  } catch (error) {
    return safeRouteError(error, "Failed to restore backup");
  }
}
