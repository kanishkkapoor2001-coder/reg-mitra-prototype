import { getGatewayConfig, safeModelName } from "@/lib/ai/gateway";
import {
  MAX_NOTICE_BYTES,
  NOTICE_MIME_TYPES,
  extractNotice,
} from "@/lib/notices/extraction";
import { UPLOAD_HOURLY, callerKey, checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * Reads an uploaded notice into structured fields for professional confirmation.
 * The file is held in memory for the duration of the request only — nothing is
 * written to disk or to the database.
 */
export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production"
    && process.env.REGMITRA_ENABLE_LIVE_AI !== "true"
  ) {
    return Response.json(
      { error: "Document reading is disabled in the public template demo." },
      { status: 503 },
    );
  }

  const uploadVerdict = checkRateLimit(callerKey(request, "notice-upload"), UPLOAD_HOURLY);
  if (!uploadVerdict.allowed) {
    return Response.json(
      { error: "You have reached the document limit for now. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(uploadVerdict.retryAfterSeconds) } },
    );
  }

  const gatewayConfig = getGatewayConfig();
  if (!gatewayConfig) {
    return Response.json(
      { error: "Document reading is not configured for this workspace." },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return Response.json({ error: "The upload could not be read." }, { status: 400 });
  }

  if (!file) {
    return Response.json({ error: "Attach a notice to read." }, { status: 400 });
  }
  if (!NOTICE_MIME_TYPES.has(file.type)) {
    return Response.json(
      { error: "Only PDF notices can be read at the moment." },
      { status: 415 },
    );
  }
  if (file.size > MAX_NOTICE_BYTES) {
    return Response.json(
      { error: `That file is larger than ${Math.round(MAX_NOTICE_BYTES / (1024 * 1024))} MB. Upload the notice pages only.` },
      { status: 413 },
    );
  }
  if (file.size < 100) {
    return Response.json({ error: "That file appears to be empty." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 4).toString() !== "%PDF") {
    return Response.json(
      { error: "That file is not a readable PDF." },
      { status: 415 },
    );
  }

  const model = safeModelName(process.env.REGMITRA_LLM_MODEL);
  try {
    const notice = await extractNotice(
      gatewayConfig,
      model,
      bytes.toString("base64"),
      file.type,
    );
    console.info("[notices] extracted", {
      model,
      bytes: bytes.length,
      noticeType: notice.noticeType,
      hasDueDate: Boolean(notice.replyDueDate),
      missing: notice.missingFields.length,
    });
    return Response.json({ notice });
  } catch (error) {
    console.error("[notices] extraction failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "The notice could not be read. Try a clearer scan, or enter the details manually." },
      { status: 502 },
    );
  }
}
