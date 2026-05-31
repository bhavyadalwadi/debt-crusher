import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactId: string }> },
) {
  const { artifactId } = await context.params;
  const artifact = await prisma.screenshotImportArtifact.findUnique({
    where: { id: artifactId },
    select: {
      fileName: true,
      mimeType: true,
      imageData: true,
    },
  });

  if (!artifact) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(artifact.imageData, {
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Disposition": `inline; filename="${artifact.fileName}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
