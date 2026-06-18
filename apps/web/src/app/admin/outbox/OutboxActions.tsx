"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OutboxActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? "";
    await fetch(`/api/v1/admin/outbox/${eventId}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      className="btn-xs d"
      onClick={() => void retry()}
      disabled={loading}
    >
      {loading ? "…" : "Retry"}
    </button>
  );
}
