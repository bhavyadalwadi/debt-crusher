import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NO_STORE_HEADERS, requireOwnerContext } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactId: string }> },
) {
  const owner = await requireOwnerContext();
  const { artifactId } = await context.params;
  const artifact = await prisma.screenshotImportArtifact.findFirst({
    where: { id: artifactId, snapshot: { portfolioId: owner.portfolioId } },
    select: {
      fileName: true,
      mimeType: true,
      imageData: true,
    },
  });

  if (!artifact) {
    return new NextResponse("Not found", { status: 404 });
  }
  const safeFileName = artifact.fileName.replace(/["\\\r\n\u0000-\u001f]/g, "_").slice(0, 180) || "screenshot";

  return new NextResponse(Uint8Array.from(artifact.imageData).buffer, {
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Disposition": `inline; filename="${safeFileName}"`,
      ...NO_STORE_HEADERS,
    },
  });
}
