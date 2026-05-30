import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { resolveUserIdFromRequest } from "@/lib/api-auth";
import { container } from "@/lib/container";
import { logger } from "@pledgeoff/observability";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  // Only team owner can upload logo
  const teamResult = await container.teamRepo.findByOwnerId(userId);
  if (teamResult.isErr() || !teamResult.value) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No team found" } }, { status: 404 });
  }
  const team = teamResult.value;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: { code: "INVALID_FORM" } }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: { code: "NO_FILE" } }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: { code: "INVALID_TYPE", message: "Only JPEG, PNG or WebP accepted" } },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: { code: "FILE_TOO_LARGE", message: "File must be under 2 MB" } },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer)
      .resize(128, 128, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (e) {
    logger.error({ traceId, userId, err: e }, "team logo sharp processing failed");
    return NextResponse.json({ error: { code: "PROCESSING_FAILED" } }, { status: 400 });
  }

  const storagePath = `${userId}/logo.webp`;
  const supabase = createSupabaseServiceClient();

  const t0 = Date.now();
  const { error: uploadError } = await supabase.storage
    .from("team-logos")
    .upload(storagePath, webpBuffer, { contentType: "image/webp", upsert: true });

  if (uploadError) {
    logger.error(
      { traceId, userId, target: "supabase-storage", latencyMs: Date.now() - t0, success: false, errorCode: uploadError.message },
      "team logo upload failed",
    );
    return NextResponse.json({ error: { code: "UPLOAD_FAILED" } }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("team-logos").getPublicUrl(storagePath);
  const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const updatedTeam = { ...team, logoUrl, updatedAt: new Date().toISOString() };
  const updateResult = await container.teamRepo.updateTeam(updatedTeam);
  if (updateResult.isErr()) {
    logger.error({ traceId, userId, err: updateResult.error }, "team logo DB update failed");
    return NextResponse.json({ error: { code: "DB_UPDATE_FAILED" } }, { status: 500 });
  }

  logger.info(
    { traceId, userId, teamId: team.id, target: "supabase-storage", latencyMs: Date.now() - t0, success: true },
    "team logo uploaded",
  );

  return NextResponse.json({ data: { logoUrl } });
}
