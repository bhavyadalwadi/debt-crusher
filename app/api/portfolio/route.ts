import { NextResponse } from "next/server";
import {
  loadPortfolioBundle,
  saveCurrentPortfolio,
  savePortfolioBundle,
} from "@/lib/portfolio-store";
import { autosaveRequestSchema, checkpointRequestSchema } from "./validation";
import { assertSameOrigin, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

export async function GET() {
  try {
    await requireOwnerContext();
    const bundle = await loadPortfolioBundle();
    return NextResponse.json(bundle);
  } catch (error) {
    return safeRouteError(error, "Failed to load portfolio");
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const body = checkpointRequestSchema.parse(await readBoundedJson(request, 1_000_000));

    const bundle = await savePortfolioBundle({
      portfolio: body.portfolio,
      source: body.source,
      label: body.label,
      filename: body.filename,
    });

    return NextResponse.json(bundle);
  } catch (error) {
    return safeRouteError(error, "Failed to save portfolio");
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const body = autosaveRequestSchema.parse(await readBoundedJson(request, 1_000_000));
    const result = await saveCurrentPortfolio(body);
    return NextResponse.json(result.bundle, { status: result.ok ? 200 : 409 });
  } catch (error) {
    return safeRouteError(error, "Failed to autosave portfolio");
  }
}
