import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CreditCard, PauseCircle, ArrowDownCircle, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

const LOST_LIST = [
  "Every Wednesday drop you've collected and the ones still scheduled",
  "Your saved notes per drop",
  "Your bookmarks and private progress metrics",
  "Your seat in the Sovereign Community Vault",
  "The One Page Manifesto and the Weekly Biggest Win thread",
  "Quizzes, learning paths, and the archive of what you've completed",
  "Future quick-win assets and monthly executive summaries",
  "Your Activation Codes downloads will be revoked",
  "The founder $44/mo lock if you ever come back \u2014 you'll re-enter at the new tier",
];

export default function Billing() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [stage, setStage] = useState("idle"); // idle | choose | confirm
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const pause = async () => {
    setBusy(true);
    try { await api.post("/billing/cancel", { action: "pause" }); await refresh(); toast.success("Paused. Resume anytime."); setStage("idle"); }
    catch { toast.error("Couldn't pause"); } finally { setBusy(false); }
  };
  const resume = async () => {
    setBusy(true);
    try { await api.post("/billing/resume"); await refresh(); toast.success("Resumed."); }
    catch { toast.error("Couldn't resume"); } finally { setBusy(false); }
  };
  const downgrade = async () => {
    setBusy(true);
    try { await api.post("/billing/cancel", { action: "downgrade" }); await refresh(); toast.success("Switched to Foundational"); setStage("idle"); }
    catch { toast.error("Couldn't downgrade"); } finally { setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true);
    try { await api.post("/billing/cancel", { action: "cancel", reason }); await refresh(); toast.success("Canceled. We hope you return."); nav("/"); }
    catch { toast.error("Couldn't cancel"); } finally { setBusy(false); }
  };
  const openPortal = async () => {
    try {
      const { data } = await api.post("/billing/portal", { return_url: window.location.origin + "/billing" });
      if (data.url) window.location.href = data.url;
    } catch { toast.error("Portal unavailable (dev mode)"); }
  };

  const tier = user?.tier || "none";

  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="overline mb-3">// BILLING</div>
        <h1 className="font-display text-5xl text-cream">Sovereign Billing</h1>
        <p className="text-textMuted mt-3">Plan: <span className="text-cream uppercase tracking-[0.2em] font-mono text-xs">{tier}</span> {user?.paused && <span className="overline ml-3">PAUSED</span>}</p>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="panel p-6">
            <CreditCard className="w-5 h-5 text-gold mb-3"/>
            <h3 className="font-display text-2xl text-cream">Manage card &amp; invoices</h3>
            <p className="text-textMuted text-sm mt-2">One-click update for cards expiring or changed. Stripe handles smart-retry automatically.</p>
            <button data-testid="portal-btn" onClick={openPortal} className="btn-ghost mt-4">Open Stripe Portal</button>
          </div>
          {!user?.paused ? (
            <div className="panel p-6">
              <PauseCircle className="w-5 h-5 text-gold mb-3"/>
              <h3 className="font-display text-2xl text-cream">Pause, don't cancel</h3>
              <p className="text-textMuted text-sm mt-2">Hit pause if you need a season of rest. Pick up exactly where you left off &mdash; your seat is held.</p>
              <button data-testid="pause-btn" onClick={pause} disabled={busy} className="btn-ghost mt-4">Pause membership</button>
            </div>
          ) : (
            <div className="panel p-6">
              <PauseCircle className="w-5 h-5 text-gold mb-3"/>
              <h3 className="font-display text-2xl text-cream">You're paused</h3>
              <button data-testid="resume-btn" onClick={resume} disabled={busy} className="btn-gold mt-4">Resume membership</button>
            </div>
          )}
          {tier === "full" && (
            <div className="panel p-6">
              <ArrowDownCircle className="w-5 h-5 text-gold mb-3"/>
              <h3 className="font-display text-2xl text-cream">Downgrade to Foundational</h3>
              <p className="text-textMuted text-sm mt-2">Keep the foundational content for $11/mo. You'll lose access to community and premium drops.</p>
              <button data-testid="downgrade-btn" onClick={downgrade} disabled={busy} className="btn-ghost mt-4">Switch to Foundational</button>
            </div>
          )}
          <div className="panel p-6 border-ruby/40">
            <X className="w-5 h-5 text-ruby mb-3"/>
            <h3 className="font-display text-2xl text-cream">Cancel membership</h3>
            <p className="text-textMuted text-sm mt-2">All custom data &mdash; notes, bookmarks, progress, downloads &mdash; disappears on cancel. There is no soft-delete.</p>
            <button data-testid="cancel-btn" onClick={() => setStage("confirm")} className="btn-ghost mt-4 !border-ruby !text-ruby hover:!bg-ruby/10">Begin cancellation</button>
          </div>
        </div>

        {stage === "confirm" && (
          <div className="fixed inset-0 bg-void/95 z-50 flex items-center justify-center p-6 overflow-auto">
            <div className="panel p-10 max-w-2xl w-full animate-fade-up">
              <AlertTriangle className="w-7 h-7 text-ruby mb-4"/>
              <h2 className="font-display text-4xl text-cream">Before you go &mdash; what you lose</h2>
              <p className="text-textMuted mt-3">Cancellation is final. The following is permanently removed from your account:</p>
              <ul className="mt-6 space-y-3">
                {LOST_LIST.map((s, i) => (
                  <li key={i} data-testid={`loss-${i}`} className="flex gap-3 text-cream/80">
                    <X className="w-4 h-4 text-ruby mt-0.5 shrink-0"/> <span>{s}</span>
                  </li>
                ))}
              </ul>
              <div className="gold-line my-8"/>
              <label className="overline">// REASON (optional, helps Robin)</label>
              <textarea data-testid="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What changed?"/>
              <div className="mt-6 flex flex-wrap gap-3">
                <button data-testid="cancel-stay" onClick={() => setStage("idle")} className="btn-gold">Keep my seat</button>
                <button data-testid="cancel-pause-instead" onClick={pause} disabled={busy} className="btn-ghost">Pause instead</button>
                {tier === "full" && <button data-testid="cancel-downgrade-instead" onClick={downgrade} disabled={busy} className="btn-ghost">Downgrade to $11</button>}
                <button data-testid="cancel-final" onClick={cancel} disabled={busy} className="btn-ghost !border-ruby !text-ruby">Cancel anyway</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
