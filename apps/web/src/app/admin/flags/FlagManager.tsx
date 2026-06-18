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
  const token = data.session?.access_token ?? "";
  return fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button className="adm-tog" onClick={onChange} aria-pressed={checked}>
      <span className={`adm-tog-t ${checked ? "on" : ""}`}>
        <span className="adm-tog-th" />
      </span>
    </button>
  );
}

export function FlagManager({ flags }: { flags: Flag[] }) {
  const router = useRouter();
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [userIdInput, setUserIdInput] = useState<Record<string, string>>({});

  async function toggleGlobal(flag: Flag) {
    await adminFetch(`/api/v1/admin/flags/${flag.id}`, "PATCH", {
      enabled_globally: !flag.enabled_globally,
    });
    router.refresh();
  }

  async function addUser(flag: Flag) {
    const uid = (userIdInput[flag.id] ?? "").trim();
    if (!uid) return;
    const ids = [...new Set([...flag.enabled_user_ids, uid])];
    await adminFetch(`/api/v1/admin/flags/${flag.id}`, "PATCH", { enabled_user_ids: ids });
    setUserIdInput((prev) => ({ ...prev, [flag.id]: "" }));
    router.refresh();
  }

  async function removeUser(flag: Flag, uid: string) {
    const ids = flag.enabled_user_ids.filter((id) => id !== uid);
    await adminFetch(`/api/v1/admin/flags/${flag.id}`, "PATCH", { enabled_user_ids: ids });
    router.refresh();
  }

  async function deleteFlag(id: string) {
    if (!confirm("Delete this flag?")) return;
    await adminFetch(`/api/v1/admin/flags/${id}`, "DELETE");
    router.refresh();
  }

  async function createFlag(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setCreating(true);
    await adminFetch("/api/v1/admin/flags", "POST", {
      key: newKey.trim(),
      description: newDesc.trim(),
    });
    setNewKey("");
    setNewDesc("");
    setCreating(false);
    router.refresh();
  }

  return (
    <div>
      {/* Create form */}
      <div className="acard" style={{ marginBottom: 20 }}>
        <div className="acard-hd">New flag</div>
        <div className="acard-bd">
          <form onSubmit={(e) => void createFlag(e)} className="finp-row">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label className="sc-k">Key (snake_case)</label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="new_feature"
                pattern="[a-z0-9_]+"
                className="finp adm-search-inp"
                style={{ width: 200, fontFamily: "var(--font-chivo-mono), monospace" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              <label className="sc-k">Description</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What does this flag do?"
                className="finp adm-search-inp"
              />
            </div>
            <div style={{ paddingTop: 16 }}>
              <button
                type="submit"
                disabled={creating || !newKey.trim()}
                className="btn-xs p"
              >
                {creating ? "…" : "Create flag"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Flags list */}
      {flags.length === 0 ? (
        <div
          className="acard"
          style={{ padding: 24, textAlign: "center", color: "var(--faint)", fontSize: 13 }}
        >
          No flags yet.
        </div>
      ) : (
        <div className="acard">
          <div className="acard-hd">
            Feature flags
            <span className="r">{flags.length} total</span>
          </div>
          <div className="acard-bd" style={{ padding: 0 }}>
            {flags.map((flag) => (
              <div
                key={flag.id}
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--line-soft)",
                }}
              >
                {/* Flag header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <code
                    className="td-main"
                    style={{
                      fontFamily: "var(--font-chivo-mono), monospace",
                      fontSize: 12,
                      color: flag.enabled_globally ? "var(--go)" : "var(--ink)",
                    }}
                  >
                    {flag.key}
                  </code>
                  <span className="td-sub" style={{ flex: 1 }}>{flag.description}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="sc-k" style={{ marginBottom: 0 }}>Global</span>
                    <Toggle
                      checked={flag.enabled_globally}
                      onChange={() => void toggleGlobal(flag)}
                    />
                  </div>
                  <button
                    onClick={() => void deleteFlag(flag.id)}
                    className="btn-xs d"
                    style={{ fontSize: 10 }}
                  >
                    Delete
                  </button>
                </div>

                {/* Per-user section */}
                <div style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10 }}>
                  <div className="sc-k" style={{ marginBottom: 8 }}>
                    Enabled for {flag.enabled_user_ids.length} specific user
                    {flag.enabled_user_ids.length !== 1 ? "s" : ""}
                  </div>
                  {flag.enabled_user_ids.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {flag.enabled_user_ids.map((uid) => (
                        <span
                          key={uid}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background: "var(--surface-2)",
                            border: "1px solid var(--line)",
                            padding: "2px 8px",
                            fontSize: 10,
                            fontFamily: "var(--font-chivo-mono), monospace",
                            color: "var(--faint)",
                          }}
                        >
                          {uid.slice(0, 8)}…
                          <button
                            onClick={() => void removeUser(flag, uid)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--kill)",
                              fontSize: 10,
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      placeholder="User UUID"
                      value={userIdInput[flag.id] ?? ""}
                      onChange={(e) =>
                        setUserIdInput((prev) => ({ ...prev, [flag.id]: e.target.value }))
                      }
                      className="adm-search-inp"
                      style={{
                        fontFamily: "var(--font-chivo-mono), monospace",
                        fontSize: 11,
                        width: 300,
                      }}
                    />
                    <button onClick={() => void addUser(flag)} className="btn-xs">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
