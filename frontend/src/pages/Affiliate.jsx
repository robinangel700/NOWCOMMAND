import { useEffect, useState } from "react";
import { Copy, ExternalLink, Share2 } from "lucide-react";
import { api, fmt } from "../lib/api";
import { toast } from "sonner";

export default function Affiliate() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/affiliate/me").then((r) => setData(r.data)); }, []);
  if (!data) return null;
  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="overline mb-3">// AFFILIATE &middot; 50% SHARE</div>
        <h1 className="font-display text-5xl text-cream">Multiply by referral.</h1>
        <p className="text-textMuted mt-3 max-w-2xl">Share your link. When someone crosses the threshold through you, you keep <span className="text-gold">50% of their first payment</span> &mdash; for life.</p>

        <div className="grid md:grid-cols-3 gap-px bg-borderGold mt-12">
          <div className="bg-void p-8">
            <div className="overline mb-3">// YOUR CODE</div>
            <div className="font-display text-4xl text-gold">{data.code}</div>
          </div>
          <div className="bg-void p-8">
            <div className="overline mb-3">// EARNINGS</div>
            <div className="font-display text-4xl text-cream">{fmt.money(data.earnings_cents)}</div>
            <div className="text-xs font-mono text-textMuted mt-1">{data.referrals.length} referrals</div>
          </div>
          <div className="bg-void p-8">
            <div className="overline mb-3">// SHARE LINK</div>
            <div className="text-cream text-sm break-all" data-testid="affiliate-link">{data.link}</div>
            <button data-testid="copy-affiliate" onClick={() => copy(data.link)} className="btn-ghost mt-4 text-xs"><Copy className="w-3 h-3"/> Copy</button>
          </div>
        </div>

        <h2 className="font-display text-2xl text-cream mt-16 mb-4">Recent referrals</h2>
        <div className="space-y-2">
          {data.referrals.map((r) => (
            <div key={r.id} className="panel p-4 flex items-center justify-between">
              <div>
                <div className="text-cream">{r.referred_email}</div>
                <div className="text-xs font-mono text-textDim">{fmt.datetime(r.created_at)}</div>
              </div>
              <div className="font-display text-2xl text-gold">{fmt.money(r.payout_cents)}</div>
            </div>
          ))}
          {data.referrals.length === 0 && <p className="text-textMuted">No referrals yet. Share the link.</p>}
        </div>
      </div>
    </div>
  );
}
