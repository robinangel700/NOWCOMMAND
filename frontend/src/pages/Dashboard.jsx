import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, Sparkles, Users, BookOpen, Clock, TrendingUp, Hourglass, Lock } from "lucide-react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import SetupWizard from "../components/SetupWizard";

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [progress, setProgress] = useState(null);
  const [drops, setDrops] = useState([]);
  const [upsell, setUpsell] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    api.get("/progress").then((r) => setProgress(r.data));
    api.get("/drops").then((r) => setDrops(r.data.drops || []));
    api.get("/public/state").then(() => {});
    const params = new URLSearchParams(location.search);
    if (params.get("wizard") === "1") {
      setShowWizard(true);
    } else if (user && user.tier === "full" && !user.setup_completed) {
      setShowWizard(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const closeWizard = () => setShowWizard(false);

  const downloadPDF = async () => {
    try {
      const resp = await api.get("/downloads/mammon_breaker", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = "Mammon_Breaker_Activation_Codes.pdf";
      a.click(); window.URL.revokeObjectURL(url);
      toast.success("Codes downloaded");
    } catch { toast.error("Unable to download"); }
  };

  const published = drops.filter((d) => d.published && !d.locked);
  const upcoming = drops.filter((d) => d.preview);
  const locked = drops.filter((d) => d.locked);
  const quickWins = published.filter((d) => d.quick_win);

  const tierLabel = {
    full: "SOVEREIGN", foundational: "FOUNDATIONAL", admin: "ADMIN",
    canceled: "CANCELED", none: "NOT ACTIVE", paused: "PAUSED",
  }[user?.tier] || "MEMBER";

  if (user?.tier === "none" || user?.tier === "canceled") {
    return (
      <div className="min-h-screen px-6 lg:px-10 py-24">
        <div className="max-w-3xl">
          <div className="overline mb-4">// SEAT INACTIVE</div>
          <h1 className="font-display text-5xl text-cream">Your seat isn't active.</h1>
          <p className="text-textMuted mt-4">Cross the threshold to unlock the dashboard.</p>
          <Link to="/pricing" data-testid="upgrade-cta" className="btn-gold mt-8 inline-flex">Claim a seat</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 lg:px-10 py-12 lg:py-16">
      {showWizard && <SetupWizard onClose={closeWizard} />}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <div className="overline mb-3">// DASHBOARD &middot; {tierLabel}</div>
            <h1 className="font-display text-5xl md:text-6xl text-cream leading-none">Welcome back, {user?.name?.split(" ")[0] || "Sovereign"}.</h1>
            <p className="text-textMuted mt-3">The codes are still moving. Pick up where you left off.</p>
          </div>
          <button data-testid="dashboard-download" onClick={downloadPDF} className="btn-gold">
            <Download className="w-4 h-4" /> Activation Codes
          </button>
          <button data-testid="dashboard-book" onClick={async () => {
            try {
              const resp = await api.get("/downloads/welcome_book", { responseType: "blob" });
              const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
              const a = document.createElement("a"); a.href = url; a.download = "Dominion_Over_Mammon.pdf"; a.click(); window.URL.revokeObjectURL(url);
              toast.success("Book downloaded");
            } catch { toast.error("Could not download"); }
          }} className="btn-ghost">
            <Download className="w-4 h-4" /> Welcome Book
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-borderGold mb-12">
          {[
            { icon: Sparkles, label: "Drops live", v: progress?.total_drops ?? 0 },
            { icon: BookOpen, label: "Notes saved", v: progress?.notes_count ?? 0 },
            { icon: TrendingUp, label: "Quizzes taken", v: progress?.quizzes_taken ?? 0 },
            { icon: Clock, label: "Days since last login", v: progress?.days_since_last_login ?? 0 },
          ].map((s, i) => (
            <div key={i} className="bg-void p-6 md:p-8">
              <s.icon className="w-5 h-5 text-gold mb-3" />
              <div className="font-display text-4xl text-cream">{s.v}</div>
              <div className="overline mt-2 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Drops feed */}
          <div className="lg:col-span-2">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-display text-3xl text-cream">Latest Drops</h2>
              <Link to="/drops" data-testid="view-all-drops" className="overline hover:text-goldHi">View all &rarr;</Link>
            </div>
            <div className="space-y-4">
              {published.slice(0, 5).map((d) => (
                <Link key={d.id} to={`/drops/${d.id}`} data-testid={`drop-card-${d.id}`} className="block panel p-6 hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="overline">{d.foundational ? "FOUNDATIONAL" : "FULL"}</span>
                    {d.quick_win && <span className="overline text-cream">QUICK WIN &middot; UNDER 15 MIN</span>}
                  </div>
                  <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                  <p className="text-textMuted text-sm mt-2 line-clamp-2">{d.insight_preview || (d.body_md || "").slice(0, 160)}</p>
                  <div className="text-xs font-mono text-textDim mt-3">{fmt.datetime(d.published_at || d.scheduled_for)}</div>
                </Link>
              ))}
              {published.length === 0 && (
                <div className="panel p-8 text-center">
                  <p className="text-textMuted">No drops have landed yet. Wednesday is coming.</p>
                </div>
              )}
            </div>

            {quickWins.length > 0 && (
              <div className="mt-12">
                <h2 className="font-display text-3xl text-cream mb-6">This month's Quick Wins</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {quickWins.slice(0, 4).map((d) => (
                    <Link key={d.id} to={`/drops/${d.id}`} className="panel p-5">
                      <span className="overline">UNDER 15 MIN</span>
                      <h4 className="font-display text-xl text-cream mt-2">{d.title}</h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="panel p-6">
              <div className="overline mb-3">// COMING NEXT</div>
              {upcoming.length === 0 && <p className="text-textMuted text-sm">Nothing on the schedule yet.</p>}
              <div className="space-y-3">
                {upcoming.slice(0, 4).map((d) => (
                  <div key={d.id} data-testid={`upcoming-${d.id}`} className="border-l border-gold pl-4 py-1">
                    <div className="text-xs font-mono text-gold uppercase tracking-[0.2em]">{fmt.date(d.scheduled_for)}</div>
                    <div className="font-display text-xl text-cream">{d.title}</div>
                    {d.insight_preview && <p className="text-textMuted text-xs mt-1 line-clamp-2">{d.insight_preview}</p>}
                  </div>
                ))}
              </div>
            </div>

            {locked.length > 0 && (
              <div className="panel p-6">
                <div className="overline mb-3">// A-LA-CARTE AVAILABLE</div>
                <div className="space-y-4">
                  {locked.slice(0, 3).map((d) => (
                    <div key={d.id} className="flex gap-3">
                      <Lock className="w-4 h-4 text-gold shrink-0 mt-1" />
                      <div>
                        <Link to={`/drops/${d.id}`} className="font-display text-lg text-cream hover:text-gold">{d.title}</Link>
                        <div className="text-xs font-mono text-textMuted">{fmt.money(d.alacarte_price_cents)} — single asset</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="panel p-6">
              <div className="overline mb-3">// THE NEXT STEP</div>
              <h3 className="font-display text-2xl text-cream mb-2">KingdomTitleDeed.com</h3>
              <p className="text-textMuted text-sm mb-4">Once the codes activate, the Title Deed is the next territory. Read it slowly.</p>
              <a href="https://KingdomTitleDeed.com" target="_blank" rel="noreferrer" className="btn-ghost text-xs">Visit →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
