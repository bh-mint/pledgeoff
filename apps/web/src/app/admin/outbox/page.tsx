import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import Link from "next/link";
import { OutboxTable } from "./OutboxTable";

export default async function OutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdminServer();
  const { filter } = await searchParams;
  const supabase = createSupabaseServiceClient();

  let query = supabase
    .from("outbox")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter === "pending") query = query.eq("processed", false).eq("attempts", 0);
  else if (filter === "failed") query = query.eq("processed", false).gt("attempts", 0);
  else if (filter === "done") query = query.eq("processed", true);

  const { data: events } = await query;

  const pending = (events ?? []).filter((e) => !e.processed && e.attempts === 0).length;
  const failed = (events ?? []).filter((e) => !e.processed && e.attempts > 0).length;
  const done = (events ?? []).filter((e) => e.processed).length;

  return (
    <div>
      {/* Summary stats */}
      <div className="adm-stat-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="sc">
          <div className="sc-k">Total (last 200)</div>
          <div className="sc-v">{(events ?? []).length}</div>
        </div>
        <div className="sc">
          <div className="sc-k">Pending</div>
          <div className={`sc-v ${pending > 0 ? "piv" : ""}`}>{pending}</div>
          <div className="sc-d">awaiting processing</div>
        </div>
        <div className="sc">
          <div className="sc-k">Failed</div>
          <div className={`sc-v ${failed > 0 ? "kll" : ""}`}>{failed}</div>
          <div className={`sc-d ${failed > 0 ? "dn" : ""}`}>{failed > 0 ? "needs retry" : "all good"}</div>
        </div>
        <div className="sc">
          <div className="sc-k">Delivered</div>
          <div className="sc-v go">{done}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="adm-search">
        {[
          { label: "All", href: "/admin/outbox" },
          { label: "Pending", href: "/admin/outbox?filter=pending" },
          { label: "Failed", href: "/admin/outbox?filter=failed" },
          { label: "Delivered", href: "/admin/outbox?filter=done" },
        ].map(({ label, href }) => {
          const isActive =
            href === "/admin/outbox"
              ? !filter
              : href.includes(filter ?? "__none__");
          return (
            <Link key={href} href={href} className={`btn-xs ${isActive ? "p" : ""}`}>
              {label}
            </Link>
          );
        })}
      </div>

      <div className="acard">
        <div className="acard-hd">
          Event queue
          <span className="r">
            {failed > 0 ? `${failed} failed · ` : ""}
            {pending > 0 ? `${pending} pending` : ""}
            {!failed && !pending ? "all clear" : ""}
          </span>
        </div>
        <div className="acard-bd" style={{ padding: 0 }}>
          <OutboxTable events={events ?? []} />
        </div>
      </div>
    </div>
  );
}
