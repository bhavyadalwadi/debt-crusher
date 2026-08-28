import { NextResponse } from "next/server";
import { z } from "zod";
import { completeReview, getReviewState, saveReviewItem, saveReviewStep, startOrResumeReview } from "@/lib/review-store";
import { assertSameOrigin, readBoundedJson, requireOwnerContext, safeRouteError } from "@/lib/security";

export const runtime = "nodejs";

const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), type: z.enum(["SETUP", "MONTHLY"]) }).strict(),
  z.object({ action: z.literal("step"), reviewId: z.string().min(1), currentStep: z.number().int().min(1).max(6) }).strict(),
  z.object({ action: z.literal("item"), reviewId: z.string().min(1), entityType: z.string().min(1), entityId: z.string().min(1), status: z.enum(["PENDING", "CONFIRMED", "UPDATED", "SKIPPED", "UNKNOWN"]), asOfDate: z.string().date().nullable().optional(), after: z.unknown().optional(), warnings: z.array(z.string()).optional() }).strict(),
  z.object({ action: z.literal("complete"), reviewId: z.string().min(1) }).strict(),
]);

export async function GET(request: Request) {
  await requireOwnerContext();
  const reviewId = new URL(request.url).searchParams.get("reviewId") ?? undefined;
  return NextResponse.json(await getReviewState(reviewId));
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireOwnerContext();
    const input = command.parse(await readBoundedJson(request, 131_072));
    if (input.action === "start") return NextResponse.json(await startOrResumeReview(input.type));
    if (input.action === "step") await saveReviewStep(input.reviewId, input.currentStep);
    if (input.action === "item") await saveReviewItem(input);
    if (input.action === "complete") await completeReview(input.reviewId);
    return NextResponse.json(await getReviewState("reviewId" in input ? input.reviewId : undefined));
  } catch (error) {
    return safeRouteError(error, "Review command failed");
  }
}
