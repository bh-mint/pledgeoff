import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { logger } from "@pledgeoff/observability";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB input limit
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();

  const supabaseAuth = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG or WebP files are accepted" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be under 5 MB" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(buffer)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch (e) {
    logger.error({ traceId, userId: user.id, err: e }, "sharp processing failed");
    return NextResponse.json({ error: "Image processing failed" }, { status: 400 });
  }

  const storagePath = `${user.id}/avatar.webp`;
  const supabase = createSupabaseServiceClient();

  const t0 = Date.now();
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    logger.error(
      { traceId, userId: user.id, target: "supabase-storage", latencyMs: Date.now() - t0, success: false, errorCode: uploadError.message },
      "avatar upload failed",
    );
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(storagePath);

  const avatarUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    logger.error(
      { traceId, userId: user.id, err: updateError },
      "avatar profile update failed",
    );
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }

  logger.info(
    { traceId, userId: user.id, target: "supabase-storage", latencyMs: Date.now() - t0, success: true },
    "avatar uploaded",
  );

  return NextResponse.json({ avatarUrl });
}
