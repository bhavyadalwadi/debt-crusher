import { NextResponse } from "next/server";
import { createPortfolioBackup, parsePortfolioBackup } from "@/lib/backup";
import {
  loadCompleteHistory,
  loadPortfolioBundle,
  restorePortfolioBackup,
} from "@/lib/portfolio-store";

export async function GET() {
  try {
    const [bundle, history] = await Promise.all([
      loadPortfolioBundle(),
      loadCompleteHistory(),
    ]);
    return NextResponse.json(
      createPortfolioBackup({
        portfolio: bundle.portfolio,
        snapshots: history.snapshots,
        events: history.events,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export backup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const backup = parsePortfolioBackup(await request.json());
    const bundle = await restorePortfolioBackup(backup);
    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore backup";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
