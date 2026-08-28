import { NextResponse } from "next/server";
import { loadForecast } from "@/lib/operations-store";
import { requireOwnerContext, safeRouteError } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireOwnerContext();
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? new Date().toISOString().slice(0, 10);
    const defaultEnd = new Date(`${startDate}T00:00:00Z`);
    defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 35);
    const endDate = url.searchParams.get("endDate") ?? defaultEnd.toISOString().slice(0, 10);
    const accountId = url.searchParams.get("accountId") ?? undefined;
    return NextResponse.json({ startDate, endDate, forecasts: await loadForecast(startDate, endDate, accountId) });
  } catch (error) {
    return safeRouteError(error, "Failed to build forecast");
  }
}
