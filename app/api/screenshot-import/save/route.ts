import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { savePortfolioBundle } from "@/lib/portfolio-store";
import type { PortfolioState, ScreenshotImportExtraction } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const portfolioRaw = formData.get("portfolio");
    const extractionRaw = formData.get("extraction");
    const label = formData.get("label");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a screenshot image." }, { status: 400 });
    }
    if (typeof portfolioRaw !== "string" || typeof extractionRaw !== "string") {
      return NextResponse.json(
        { error: "Screenshot save is missing portfolio or extraction data." },
        { status: 400 },
      );
    }

    const imageData = new Uint8Array(await file.arrayBuffer()) as Prisma.Bytes;
    const bundle = await savePortfolioBundle({
      portfolio: JSON.parse(portfolioRaw) as PortfolioState,
      source: "screenshot_import",
      filename: file.name,
      label: typeof label === "string" && label.trim() ? label : "Screenshot import",
      screenshotArtifact: {
        fileName: file.name,
        mimeType: file.type || "image/png",
        imageData,
        extractedText: String(formData.get("extractedText") ?? ""),
        extraction: JSON.parse(extractionRaw) as ScreenshotImportExtraction,
      },
    });

    return NextResponse.json(bundle);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save screenshot import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
