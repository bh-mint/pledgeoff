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
    const token = data.session?.access_token ?? '';
    await fetch(`/api/v1/admin/outbox/${eventId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={() => void retry()}
      disabled={loading}
      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
    >
      {loading ? '…' : 'Retry'}
    </button>
  );
}
