import { NextResponse } from "next/server";
import { loadActionSummary } from "@/lib/operations-store";
import { requireOwnerContext, safeRouteError } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireOwnerContext();
    const url = new URL(request.url);
    const asOfDate = url.searchParams.get("asOfDate") ?? new Date().toISOString().slice(0, 10);
    const upcomingThrough = new Date(`${asOfDate}T00:00:00Z`);
    upcomingThrough.setUTCDate(upcomingThrough.getUTCDate() + 7);
    const forecastThrough = new Date(`${asOfDate}T00:00:00Z`);
    forecastThrough.setUTCDate(forecastThrough.getUTCDate() + 35);
    return NextResponse.json(await loadActionSummary(asOfDate, url.searchParams.get("endDate") ?? forecastThrough.toISOString().slice(0, 10), upcomingThrough.toISOString().slice(0, 10)));
  } catch (error) {
    return safeRouteError(error, "Failed to build action summary");
  }
}
