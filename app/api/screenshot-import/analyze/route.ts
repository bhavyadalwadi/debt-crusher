import { NextResponse } from "next/server";
import { analyzeScreenshotImport } from "@/lib/screenshot-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a screenshot image." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const analysis = await analyzeScreenshotImport(buffer);

    return NextResponse.json({
      fileName: file.name,
      mimeType: file.type,
      extractedText: analysis.extractedText,
      extraction: analysis.extraction,
      candidates: analysis.candidates,
      warnings: analysis.warnings,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze screenshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
