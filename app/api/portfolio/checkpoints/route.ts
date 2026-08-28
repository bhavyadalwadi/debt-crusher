import { NextResponse } from "next/server";
import {
  loadPortfolioHistory,
  savePortfolioBundle,
  type PortfolioHistoryRange,
} from "@/lib/portfolio-store";
import { checkpointRequestSchema } from "../validation";
import { assertSameOrigin, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

const historyRanges = new Set<PortfolioHistoryRange>(["30d", "90d", "1y", "all"]);

export async function GET(request: Request) {
  try {
    await requireOwnerContext();
    const requestedRange = new URL(request.url).searchParams.get("range") ?? "90d";
    if (!historyRanges.has(requestedRange as PortfolioHistoryRange)) {
      return NextResponse.json(
        { error: "range must be one of 30d, 90d, 1y, or all" },
        { status: 400 },
      );
    }
    const snapshots = await loadPortfolioHistory(requestedRange as PortfolioHistoryRange);
    return NextResponse.json({ range: requestedRange, snapshots });
  } catch (error) {
    return safeRouteError(error, "Failed to load history");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const body = checkpointRequestSchema.parse(await readBoundedJson(request, 1_000_000));
    const bundle = await savePortfolioBundle(body);
    return NextResponse.json(bundle);
  } catch (error) {
    return safeRouteError(error, "Failed to record checkpoint");
  }
}
