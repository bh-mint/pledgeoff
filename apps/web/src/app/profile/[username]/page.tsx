import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { PublicNav } from "@/components/PublicNav";

interface Props {
  params: Promise<{ username: string }>;
}

function verdictChipClass(verdict: string): string {
  if (verdict === "GO") return "go";
  if (verdict === "KILL") return "kill";
  return "piv";
}

function formatJoined(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, first_name, last_name, is_profile_public")
    .eq("username", username.toLowerCase())
    .single();

  if (!profile || !profile.is_profile_public) {
    return { title: "Profile — PledgeOFF", robots: { index: false } };
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || `@${username}`;
  const title = `${displayName} (@${username}) — PledgeOFF`;
  const description = `Signal verdicts by @${username} on PledgeOFF. Decision intelligence for founders.`;

  return {
    title,
    description,
    alternates: { canonical: `https://pledgeoff.com/profile/${username}` },
    openGraph: {
      title,
      description,
      url: `https://pledgeoff.com/profile/${username}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, first_name, last_name, avatar_url, created_at, is_profile_public")
    .eq("username", username.toLowerCase())
    .single();

  if (!profile || !profile.is_profile_public) notFound();

  const { data: rows } = await supabase
    .from("ideas")
    .select("id, text, created_at, decisions(verdict, score, created_at)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  type DecisionRow = { verdict: string; score: number | null; created_at: string };
  type Row = NonNullable<typeof rows>[number];

  const verdicts = (rows ?? []).flatMap((row: Row) => {
    const decisions = (row.decisions ?? []) as DecisionRow[];
    if (!decisions.length) return [];
    const d = decisions[0];
    return [{ ideaId: row.id, text: row.text, verdict: d.verdict, score: d.score, createdAt: row.created_at }];
  });

  const publicVerdicts = verdicts; // all ideas with decisions shown publicly
  const counts = publicVerdicts.reduce(
    (acc, v) => { acc[v.verdict] = (acc[v.verdict] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || `@${username}`;
  const initials = [profile.first_name?.[0], profile.last_name?.[0]].filter(Boolean).join("").toUpperCase() || username[0].toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <PublicNav />

      <div className="pub-pw" style={{ paddingBottom: 80 }}>

        {/* Profile header */}
        <div className="p-hd">
          <div className="p-av">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initials
            )}
          </div>
          <div className="p-nm">{displayName}</div>
          <div className="p-handle">
            @{username}
            {profile.created_at && (
              <> &middot; Joined {formatJoined(profile.created_at as string)}</>
            )}
          </div>
          <div className="p-stats">
            <div className="pst">
              <span className="pst-n">{publicVerdicts.length}</span>
              <span className="pst-k">Ideas validated</span>
            </div>
            {(counts["GO"] ?? 0) > 0 && (
              <div className="pst">
                <span className="pst-n go">{counts["GO"]}</span>
                <span className="pst-k">GO</span>
              </div>
            )}
            {(counts["PIVOT"] ?? 0) > 0 && (
              <div className="pst">
                <span className="pst-n piv">{counts["PIVOT"]}</span>
                <span className="pst-k">PIVOT</span>
              </div>
            )}
            {(counts["KILL"] ?? 0) > 0 && (
              <div className="pst">
                <span className="pst-n kill">{counts["KILL"]}</span>
                <span className="pst-k">KILL</span>
              </div>
            )}
          </div>
        </div>

        {/* Ideas grid */}
        {publicVerdicts.length === 0 ? (
          <div className="empty-card">
            <div className="empty-ttl">No public verdicts yet.</div>
            <p className="empty-desc">{displayName} hasn&rsquo;t validated any ideas yet.</p>
          </div>
        ) : (
          <div className="ig">
            {publicVerdicts.map((v) => {
              const chip = verdictChipClass(v.verdict);
              const title = v.text.split("\n\n")[0].slice(0, 80);
              return (
                <Link href={`/v/${v.ideaId}`} className="ic" key={v.ideaId}>
                  <div className="ic-hd">
                    <span>{formatDate(v.createdAt)}</span>
                  </div>
                  <div className="ic-body">
                    <div className="ic-nm">{title}</div>
                    <div className="ic-foot">
                      {v.score !== null && (
                        <span className={`ic-score ${chip}`}>{v.score}</span>
                      )}
                      <span className={`vt ${chip}`}>{v.verdict}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>

      {/* CTA band */}
      <div className="cta-band">
        <div className="cta-inner">
          <span className="cta-eyebrow">PledgeOFF &middot; Decision intelligence for founders</span>
          <h2 className="cta-h">Validate your own idea.</h2>
          <p className="cta-sub">Real signals, traceable sources, a verdict in ~15 seconds. First validation free, no card required.</p>
          <div className="cta-btns">
            <Link href="/login?mode=signup&next=/ideas/new" className="btn-inv">Validate free &rarr;</Link>
            <Link href="/pricing" className="btn-inv-g">See what&rsquo;s included</Link>
          </div>
          <p className="cta-note">1 free validation per month &middot; No credit card &middot; No hype</p>
        </div>
      </div>
    </div>
  );
}
