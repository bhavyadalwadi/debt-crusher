import { NextResponse } from "next/server";
import { analyzeScreenshotImport } from "@/lib/screenshot-import";
import { assertSameOrigin, requireOwnerContext, safeRouteError, SecurityError } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    if (Number(request.headers.get("content-length") ?? "0") > 10_000_000) {
      throw new SecurityError(413, "BODY_TOO_LARGE", "Screenshot upload is too large.");
    }
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a screenshot image." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
    }
    if (file.size > 8_000_000) throw new SecurityError(413, "FILE_TOO_LARGE", "Screenshot upload is too large.");

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
    return safeRouteError(error, "Failed to analyze screenshot");
  }
}
