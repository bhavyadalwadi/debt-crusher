import { NextResponse } from "next/server";
import { loadActionSummary } from "@/lib/operations-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const asOfDate = url.searchParams.get("asOfDate") ?? new Date().toISOString().slice(0, 10);
    const upcomingThrough = new Date(`${asOfDate}T00:00:00Z`);
    upcomingThrough.setUTCDate(upcomingThrough.getUTCDate() + 7);
    const forecastThrough = new Date(`${asOfDate}T00:00:00Z`);
    forecastThrough.setUTCDate(forecastThrough.getUTCDate() + 35);
    return NextResponse.json(await loadActionSummary(asOfDate, url.searchParams.get("endDate") ?? forecastThrough.toISOString().slice(0, 10), upcomingThrough.toISOString().slice(0, 10)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to build action summary" }, { status: 400 });
  }
}
