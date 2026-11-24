import { handleIngestionRequest } from "@/lib/api/ingestion-handler";

export async function POST(request: Request) {
  return handleIngestionRequest(request);
}
