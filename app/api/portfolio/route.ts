import { NextResponse } from "next/server";
import { loadPortfolioBundle, savePortfolioBundle } from "@/lib/portfolio-store";
import type { ActivitySnapshot, PortfolioState } from "@/lib/types";

export async function GET() {
  try {
    const bundle = await loadPortfolioBundle();
    return NextResponse.json(bundle);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load portfolio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      portfolio: PortfolioState;
      source: ActivitySnapshot["source"];
      label?: string;
      filename?: string;
    };

    const bundle = await savePortfolioBundle({
      portfolio: body.portfolio,
      source: body.source,
      label: body.label,
      filename: body.filename,
    });

    return NextResponse.json(bundle);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save portfolio";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
