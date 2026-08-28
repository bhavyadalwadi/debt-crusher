import { after } from "next/server";
import { financialJson } from "@/lib/security";
import { processPlaidWebhookJob, receivePlaidWebhook } from "@/lib/plaid-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > 65_536) return financialJson({ error: "Payload too large" }, { status: 413 });
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 65_536) {
      return financialJson({ error: "Payload too large" }, { status: 413 });
    }
    const received = await receivePlaidWebhook(rawBody, request.headers.get("plaid-verification"));
    if (!received.duplicate && received.jobId && received.connection) {
      after(() => processPlaidWebhookJob({
        receiptId: received.receiptId,
        jobId: received.jobId!,
        connection: received.connection!,
      }));
    }
    return financialJson({ ok: true });
  } catch {
    return financialJson({ error: "Invalid webhook" }, { status: 401 });
  }
}
