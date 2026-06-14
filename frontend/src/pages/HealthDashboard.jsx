import { useEffect, useState } from "react";
import { api, fmt } from "../lib/api";
import { TrendingUp, Users, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function HealthDashboard() {
  const [h, setH] = useState(null);
  useEffect(() => { api.get("/admin/health").then((r) => setH(r.data)); }, []);
  if (!h) return null;
  const icon = (lvl) => lvl === "warn" ? <AlertTriangle className="w-4 h-4 text-gold"/> : lvl === "good" ? <CheckCircle2 className="w-4 h-4 text-gold"/> : <Info className="w-4 h-4 text-textMuted"/>;
  return (
    <div>
      <div className="overline mb-3">// SYSTEM HEALTH · LIVE</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-borderGold mb-8">
        <div className="bg-void p-6"><div className="overline">// MRR</div><div className="font-display text-4xl text-gold">{fmt.money(h.mrr_cents)}</div><div className="text-xs font-mono text-textDim mt-1">ARR ≈ {fmt.money(h.arr_cents)}</div></div>
        <div className="bg-void p-6"><div className="overline">// ACTIVE MEMBERS</div><div className="font-display text-4xl text-cream">{h.active_full + h.active_foundational}</div><div className="text-xs font-mono text-textDim mt-1">{h.active_full} sovereign · {h.active_foundational} foundational</div></div>
        <div className="bg-void p-6"><div className="overline">// CHURN (30d)</div><div className="font-display text-4xl text-cream">{h.churn_pct_30d}%</div><div className="text-xs font-mono text-textDim mt-1">{h.canceled_30d} canceled · {h.new_30d} new</div></div>
        <div className="bg-void p-6"><div className="overline">// SEATS LEFT</div><div className="font-display text-4xl text-cream">{h.seats_left}</div><div className="text-xs font-mono text-textDim mt-1">of {h.cap}</div></div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-borderGold mb-8">
        <div className="bg-void p-5"><div className="overline">// INACTIVE 14D</div><div className="font-display text-3xl text-cream">{h.inactive_14d}</div></div>
        <div className="bg-void p-5"><div className="overline">// COMMUNITY POSTS 7D</div><div className="font-display text-3xl text-cream">{h.posts_7d}</div></div>
        <div className="bg-void p-5"><div className="overline">// FAILED PAYMENTS</div><div className="font-display text-3xl text-cream">{h.failed_payments}</div></div>
        <div className="bg-void p-5"><div className="overline">// SCHEDULED</div><div className="font-display text-3xl text-cream">{h.drops_scheduled + h.articles_scheduled}</div></div>
      </div>
      <h3 className="font-display text-2xl text-cream mb-4">What to do, in plain language</h3>
      <div className="space-y-2">
        {h.alerts.map((a) => (
          <div key={a.msg} className="panel p-4 flex items-start gap-3">{icon(a.level)}<p className="text-cream/90">{a.msg}</p></div>
        ))}
      </div>
    </div>
  );
}
