import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  loadPortfolioHistory,
  savePortfolioBundle,
  type PortfolioHistoryRange,
} from "@/lib/portfolio-store";
import { checkpointRequestSchema } from "../validation";

const historyRanges = new Set<PortfolioHistoryRange>(["30d", "90d", "1y", "all"]);

export async function GET(request: Request) {
  try {
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
    const message = error instanceof Error ? error.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = checkpointRequestSchema.parse(await request.json());
    const bundle = await savePortfolioBundle(body);
    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record checkpoint";
    return NextResponse.json(
      { error: message },
      { status: error instanceof ZodError ? 400 : 500 },
    );
  }
}
