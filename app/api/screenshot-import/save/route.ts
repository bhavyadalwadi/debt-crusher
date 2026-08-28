import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { savePortfolioBundle } from "@/lib/portfolio-store";
import { assertSameOrigin, requireOwnerContext, safeRouteError, SecurityError } from "@/lib/security";
import { portfolioStateSchema } from "@/app/api/portfolio/validation";

export const runtime = "nodejs";

const extractionSchema = z.object({
  accountKind: z.enum(["cash", "credit"]),
  institution: z.string().max(160).nullable(),
  accountName: z.string().max(160).nullable(),
  currentBalance: z.number().finite(),
  availableBalance: z.number().finite().nullable(),
  capturedAt: z.string().max(100).nullable(),
  balanceCandidates: z.number().int().nonnegative().max(1000),
  lowConfidence: z.boolean(),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    if (Number(request.headers.get("content-length") ?? "0") > 12_000_000) {
      throw new SecurityError(413, "BODY_TOO_LARGE", "Screenshot upload is too large.");
    }
    const formData = await request.formData();
    const file = formData.get("file");
    const portfolioRaw = formData.get("portfolio");
    const extractionRaw = formData.get("extraction");
    const label = formData.get("label");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a screenshot image." }, { status: 400 });
    }
    if (file.size > 8_000_000) throw new SecurityError(413, "FILE_TOO_LARGE", "Screenshot upload is too large.");
    if (!file.type.startsWith("image/")) throw new SecurityError(415, "IMAGE_REQUIRED", "Only image uploads are supported.");
    if (typeof portfolioRaw === "string" && Buffer.byteLength(portfolioRaw, "utf8") > 1_000_000) throw new SecurityError(413, "BODY_TOO_LARGE", "Portfolio payload is too large.");
    if (typeof extractionRaw === "string" && Buffer.byteLength(extractionRaw, "utf8") > 1_000_000) throw new SecurityError(413, "BODY_TOO_LARGE", "Extraction payload is too large.");
    if (typeof portfolioRaw !== "string" || typeof extractionRaw !== "string") {
      return NextResponse.json(
        { error: "Screenshot save is missing portfolio or extraction data." },
        { status: 400 },
      );
    }

    const imageData = new Uint8Array(await file.arrayBuffer()) as Prisma.Bytes;
    const portfolio = portfolioStateSchema.parse(JSON.parse(portfolioRaw));
    const extraction = extractionSchema.parse(JSON.parse(extractionRaw));
    const bundle = await savePortfolioBundle({
      portfolio,
      source: "screenshot_import",
      filename: file.name,
      label: typeof label === "string" && label.trim() ? label.trim().slice(0, 160) : "Screenshot import",
      screenshotArtifact: {
        fileName: file.name,
        mimeType: file.type || "image/png",
        imageData,
        extractedText: String(formData.get("extractedText") ?? ""),
        extraction,
      },
    });

    return NextResponse.json(bundle);
  } catch (error) {
    return safeRouteError(error, "Failed to save screenshot import");
  }
}
