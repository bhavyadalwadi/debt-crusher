import { NextResponse } from "next/server";
import { loadForecast } from "@/lib/operations-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? new Date().toISOString().slice(0, 10);
    const defaultEnd = new Date(`${startDate}T00:00:00Z`);
    defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 35);
    const endDate = url.searchParams.get("endDate") ?? defaultEnd.toISOString().slice(0, 10);
    const accountId = url.searchParams.get("accountId") ?? undefined;
    return NextResponse.json({ startDate, endDate, forecasts: await loadForecast(startDate, endDate, accountId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to build forecast" }, { status: 400 });
  }
}
