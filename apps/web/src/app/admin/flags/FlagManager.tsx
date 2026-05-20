"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Flag = {
  id: string;
  key: string;
  description: string;
  enabled_globally: boolean;
  enabled_user_ids: string[];
};

async function adminFetch(path: string, method: string, body?: object) {
  const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: 9,
        background: checked ? '#000' : 'var(--t3)',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

export function FlagManager({ flags }: { flags: Flag[] }) {
  const router = useRouter();
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [userIdInput, setUserIdInput] = useState<Record<string, string>>({});

  async function toggleGlobal(flag: Flag) {
    await adminFetch(`/api/v1/admin/flags/${flag.id}`, 'PATCH', { enabled_globally: !flag.enabled_globally });
    router.refresh();
  }

  async function addUser(flag: Flag) {
    const uid = (userIdInput[flag.id] ?? '').trim();
    if (!uid) return;
    const ids = [...new Set([...flag.enabled_user_ids, uid])];
    await adminFetch(`/api/v1/admin/flags/${flag.id}`, 'PATCH', { enabled_user_ids: ids });
    setUserIdInput((prev) => ({ ...prev, [flag.id]: '' }));
    router.refresh();
  }

  async function removeUser(flag: Flag, uid: string) {
    const ids = flag.enabled_user_ids.filter((id) => id !== uid);
    await adminFetch(`/api/v1/admin/flags/${flag.id}`, 'PATCH', { enabled_user_ids: ids });
    router.refresh();
  }

  async function deleteFlag(id: string) {
    if (!confirm('Delete this flag?')) return;
    await adminFetch(`/api/v1/admin/flags/${id}`, 'DELETE');
    router.refresh();
  }

  async function createFlag(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setCreating(true);
    await adminFetch('/api/v1/admin/flags', 'POST', { key: newKey.trim(), description: newDesc.trim() });
    setNewKey(''); setNewDesc('');
    setCreating(false);
    router.refresh();
  }

  return (
    <div>
      {/* Create */}
      <form onSubmit={(e) => void createFlag(e)} style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace', textTransform: 'uppercase' }}>Key (snake_case)</label>
          <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="new_feature" pattern="[a-z0-9_]+" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', fontSize: 13, color: 'var(--t1)', width: 200, fontFamily: 'monospace' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <label style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace', textTransform: 'uppercase' }}>Description</label>
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What does this flag do?" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', fontSize: 13, color: 'var(--t1)' }} />
        </div>
        <button type="submit" disabled={creating || !newKey.trim()} style={{ padding: '8px 16px', borderRadius: 6, background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: creating || !newKey.trim() ? 0.5 : 1 }}>
          {creating ? '…' : 'Create flag'}
        </button>
      </form>

      {/* Flags list */}
      {flags.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>No flags yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flags.map((flag) => (
            <div key={flag.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <code style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: flag.enabled_globally ? 'var(--accent)' : 'var(--t1)' }}>{flag.key}</code>
                <span style={{ fontSize: 12, color: 'var(--t3)', flex: 1 }}>{flag.description}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>Global</span>
                  <Toggle checked={flag.enabled_globally} onChange={() => void toggleGlobal(flag)} />
                </div>
                <button onClick={() => void deleteFlag(flag.id)} style={{ fontSize: 11, color: 'var(--kill)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>✕</button>
              </div>

              {/* Per-user */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 8 }}>
                  Enabled for {flag.enabled_user_ids.length} specific user{flag.enabled_user_ids.length !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {flag.enabled_user_ids.map((uid) => (
                    <span key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontFamily: 'monospace', color: 'var(--t2)' }}>
                      {uid.slice(0, 8)}…
                      <button onClick={() => void removeUser(flag, uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--kill)', fontSize: 11, padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    placeholder="User UUID"
                    value={userIdInput[flag.id] ?? ''}
                    onChange={(e) => setUserIdInput((prev) => ({ ...prev, [flag.id]: e.target.value }))}
                    style={{ background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 10px', fontSize: 12, color: 'var(--t1)', fontFamily: 'monospace', width: 300 }}
                  />
                  <button onClick={() => void addUser(flag)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 4, background: 'transparent', border: '1px solid var(--border)', color: 'var(--t2)', cursor: 'pointer' }}>Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
