import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  loadPortfolioBundle,
  saveCurrentPortfolio,
  savePortfolioBundle,
} from "@/lib/portfolio-store";
import { autosaveRequestSchema, checkpointRequestSchema } from "./validation";

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
    const body = checkpointRequestSchema.parse(await request.json());

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
    return NextResponse.json(
      { error: message },
      { status: error instanceof ZodError ? 400 : 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = autosaveRequestSchema.parse(await request.json());
    const result = await saveCurrentPortfolio(body);
    return NextResponse.json(result.bundle, { status: result.ok ? 200 : 409 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to autosave portfolio";
    return NextResponse.json(
      { error: message },
      { status: error instanceof ZodError ? 400 : 500 },
    );
  }
}
