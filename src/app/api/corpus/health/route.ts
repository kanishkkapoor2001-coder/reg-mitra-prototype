import { getCorpusHealth } from "@/lib/rag/corpus";

export const runtime = "nodejs";

export function GET() {
  const health = getCorpusHealth();
  return Response.json({
    status: health.sourceCount > 0 && health.embeddedChunkCount > 0 ? "ready" : "degraded",
    ...health,
  });
}
