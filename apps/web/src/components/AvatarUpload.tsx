"use client";

import { useRef, useState } from "react";

interface AvatarUploadProps {
  initials: string;
  currentAvatarUrl: string | null;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({
  initials,
  currentAvatarUrl,
  onUploaded,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setStatus("uploading");
    setErrorMsg(null);

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/v1/profile/avatar", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Upload failed");
      }

      const { avatarUrl } = (await res.json()) as { avatarUrl: string };
      // Cache-bust: append timestamp so old CDN URL doesn't show stale image
      setPreview(`${avatarUrl}?t=${Date.now()}`);
      setStatus("idle");
      onUploaded(avatarUrl);
    } catch (err) {
      setPreview(currentAvatarUrl);
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }

    // Reset input so re-selecting same file triggers change event
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="relative w-14 h-14 rounded-full border overflow-hidden shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 disabled:opacity-60 transition-opacity"
        style={{ borderColor: "var(--border)" }}
        aria-label="Upload avatar photo"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Your avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center display text-[18px] font-semibold"
            style={{ background: "var(--surface)", color: "var(--t1)" }}
          >
            {initials}
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.45)" }}
          aria-hidden="true"
        >
          {status === "uploading" ? (
            <span className="mono text-[10px] text-white">…</span>
          ) : (
            <span className="mono text-[10px] text-white">edit</span>
          )}
        </div>
      </button>

      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="mono text-[11px] h-8 px-3 rounded-md border transition-colors hover:border-(--t2) disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--t2)" }}
        >
          {status === "uploading" ? "Uploading…" : "Change photo"}
        </button>
        <p className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
          JPEG, PNG or WebP · max 5 MB · resized to 256×256
        </p>
        {errorMsg && (
          <p className="mono text-[10px] mt-1" style={{ color: "var(--caution)" }}>
            {errorMsg}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
