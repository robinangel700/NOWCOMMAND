import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, CreditCard, PauseCircle, ArrowDownCircle, X, Crown, Copy,
  ArrowRight, ChevronRight, Shield, Sparkles, Heart, MessageCircle, Check, Send,
} from "lucide-react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

/* ----------------- Cancel Funnel order (research-best):
   1. Pause first (least friction, retains)
   2. Feedback collection (reason)
   3. Win-back: surface unfinished progress + upcoming drops
   4. Downgrade (softer landing)
   5. Visual loss list
   6. Final cancel
*/

const LOST_LIST = [
  "Every Wednesday drop you've collected and the ones still scheduled",
  "Your saved notes per drop",
  "Your bookmarks and private progress metrics",
  "Your seat in the Sovereign Community Vault",
  "The One Page Manifesto and the Weekly Biggest Win thread",
  "Quizzes, learning paths, and the archive of what you've completed",
  "Future quick-win assets and monthly executive summaries",
  "Your Activation Codes downloads will be revoked",
  "The founder $44/mo lock if you ever return — you'll re-enter at the new tier",
];

const CANCEL_REASONS = [
  "Money is tight this month",
  "Not enough time to engage right now",
  "I got what I needed",
  "Content isn't what I expected",
  "I'm overwhelmed with notifications",
  "Other",
];

export default function Stewardship() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("billing");
  const [affiliate, setAffiliate] = useState(null);
  const [progress, setProgress] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [stage, setStage] = useState("idle"); // idle | funnel
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/affiliate/me").then((r) => setAffiliate(r.data));
    api.get("/progress").then((r) => setProgress(r.data));
    api.get("/drops").then((r) => setUpcoming((r.data.drops || []).filter((d) => d.preview).slice(0, 4)));
  }, []);

  const pause = async () => {
    setBusy(true);
    try { await api.post("/billing/cancel", { action: "pause" }); await refresh(); toast.success("Paused. Resume anytime."); setStage("idle"); setStep(0); }
    catch { toast.error("Couldn't pause"); } finally { setBusy(false); }
  };
  const resume = async () => {
    setBusy(true);
    try { await api.post("/billing/resume"); await refresh(); toast.success("Resumed."); }
    catch { toast.error("Couldn't resume"); } finally { setBusy(false); }
  };
  const downgrade = async () => {
    setBusy(true);
    try { await api.post("/billing/cancel", { action: "downgrade" }); await refresh(); toast.success("Switched to Foundational ($11/mo)"); setStage("idle"); setStep(0); }
    catch { toast.error("Couldn't downgrade"); } finally { setBusy(false); }
  };
  const finalCancel = async () => {
    setBusy(true);
    const finalReason = reason === "Other" ? reasonOther : reason;
    try { await api.post("/billing/cancel", { action: "cancel", reason: finalReason }); await refresh(); toast.success("Membership released."); nav("/"); }
    catch { toast.error("Couldn't cancel"); } finally { setBusy(false); }
  };
  const openPortal = async () => {
    try {
      const { data } = await api.post("/billing/portal", { return_url: window.location.origin + "/stewardship" });
      if (data.url) window.location.href = data.url;
    } catch { toast.error("Portal unavailable (dev mode)"); }
  };

  const startFunnel = () => { setStage("funnel"); setStep(0); };
  const tier = user?.tier || "none";

  return (
    <div className="min-h-screen px-6 lg:px-10 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="overline mb-3">// STEWARDSHIP</div>
        <h1 className="font-display text-5xl md:text-6xl text-cream leading-tight">Steward your seat & sow your portion.</h1>
        <p className="text-textMuted mt-3 max-w-2xl">Billing, partnership, and the multiplication of what's flowing through you. All in one place.</p>

        <div className="flex flex-wrap gap-px bg-borderGold mt-10 mb-10">
          {[
            { id: "billing", label: "Billing", icon: CreditCard },
            { id: "affiliate", label: "Multiply (Affiliate)", icon: Crown },
            { id: "support", label: "Sales Wizard", icon: Sparkles },
          ].map((t) => (
            <button key={t.id} data-testid={`steward-tab-${t.id}`} onClick={() => setTab(t.id)}
              className={`bg-void px-5 py-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] ${tab === t.id ? "text-gold" : "text-textMuted hover:text-cream"}`}>
              <t.icon className="w-4 h-4"/>{t.label}
            </button>
          ))}
        </div>

        {tab === "billing" && (
          <div className="space-y-6">
            <div className="panel p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="overline mb-1">// CURRENT PLAN</div>
                <h3 className="font-display text-3xl text-cream">{tier.toUpperCase()}{user?.paused && <span className="overline ml-3">PAUSED</span>}</h3>
              </div>
              {user?.paused ? (
                <button data-testid="resume-btn" onClick={resume} disabled={busy} className="btn-gold">Resume membership</button>
              ) : (
                <button data-testid="portal-btn" onClick={openPortal} className="btn-ghost">Open Stripe Portal</button>
              )}
            </div>

            <div className="panel p-6">
              <CreditCard className="w-5 h-5 text-gold mb-3"/>
              <h3 className="font-display text-2xl text-cream">Manage card & invoices</h3>
              <p className="text-textMuted text-sm mt-2">One-click update for cards expiring or changed. Stripe handles smart-retry automatically.</p>
            </div>

            <div className="panel p-6">
              <div className="overline mb-2">// WHEN THE TIME COMES</div>
              <h3 className="font-display text-2xl text-cream">Need to step away?</h3>
              <p className="text-textMuted text-sm mt-2 max-w-xl">We've laid out a few steward-friendly options. Take a beat. You don't have to make a final decision today.</p>
              <button data-testid="begin-cancel-funnel" onClick={startFunnel} className="btn-ghost mt-4 !border-borderGold !text-textMuted hover:!text-cream">Review options</button>
            </div>
          </div>
        )}

        {tab === "affiliate" && <AffiliatePanel affiliate={affiliate}/>}
        {tab === "support" && <SalesWizard affiliate={affiliate}/>}

        {stage === "funnel" && (
          <CancelFunnel
            step={step} setStep={setStep}
            reason={reason} setReason={setReason}
            reasonOther={reasonOther} setReasonOther={setReasonOther}
            progress={progress} upcoming={upcoming}
            tier={tier} busy={busy}
            onPause={pause} onDowngrade={downgrade} onCancel={finalCancel}
            onClose={() => { setStage("idle"); setStep(0); }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------- Cancel Funnel ------------- */
function CancelFunnel({ step, setStep, reason, setReason, reasonOther, setReasonOther, progress, upcoming, tier, busy, onPause, onDowngrade, onCancel, onClose }) {
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const STEPS_FULL = ["breathe", "feedback", "winback", "pause", "downgrade", "loss", "final"];
  const STEPS_FOUND = ["breathe", "feedback", "winback", "pause", "loss", "final"];
  const STEPS = tier === "full" ? STEPS_FULL : STEPS_FOUND;
  const stage = STEPS[step] || "final";

  return (
    <div className="fixed inset-0 bg-void/95 z-[60] overflow-auto" data-testid="cancel-funnel">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="overline">// STEP {step + 1} / {STEPS.length}</div>
          <button data-testid="funnel-close" onClick={onClose} className="text-textMuted hover:text-cream"><X className="w-5 h-5"/></button>
        </div>
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => (<div key={i} className={`flex-1 h-1 ${i <= step ? "bg-gold" : "bg-borderGold"}`}/>))}
        </div>

        {stage === "breathe" && (
          <div className="animate-fade-up">
            <Heart className="w-8 h-8 text-gold mb-4"/>
            <h2 className="font-display text-5xl text-cream leading-tight">Take a breath first.</h2>
            <p className="text-textMuted mt-4 leading-relaxed">You don't have to decide anything in this moment. A steward doesn't make economic decisions from a flinch. Walk through these next steps with us. By the end, you'll know exactly the right move — and there are softer landings than you might expect.</p>
            <div className="flex gap-3 mt-8">
              <button data-testid="funnel-stay" onClick={onClose} className="btn-gold">I'll stay</button>
              <button data-testid="funnel-continue-breathe" onClick={next} className="btn-ghost">Continue<ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {stage === "feedback" && (
          <div className="animate-fade-up">
            <MessageCircle className="w-8 h-8 text-gold mb-4"/>
            <h2 className="font-display text-4xl text-cream">What's bringing you here?</h2>
            <p className="text-textMuted mt-3">Robin reads every answer. This shapes what gets built next.</p>
            <div className="mt-6 space-y-2">
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="block panel p-3 cursor-pointer hover:border-borderGoldHi">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} data-testid={`reason-${r.slice(0,8).replace(/\s/g,'')}`} style={{width:16,height:16}}/>
                    <span className="text-cream">{r}</span>
                  </div>
                </label>
              ))}
              {reason === "Other" && <textarea rows={3} value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="Tell Robin what changed"/>}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="funnel-continue-feedback" disabled={!reason} onClick={next} className="btn-gold disabled:opacity-40">Continue<ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {stage === "winback" && (
          <div className="animate-fade-up">
            <Sparkles className="w-8 h-8 text-gold mb-4"/>
            <h2 className="font-display text-4xl text-cream">Here's what you'd be leaving mid-stride.</h2>
            <div className="grid sm:grid-cols-3 gap-px bg-borderGold mt-6">
              <div className="bg-void p-5"><div className="overline mb-2">Drops you've engaged</div><div className="font-display text-4xl text-gold">{progress?.total_drops ?? 0}</div></div>
              <div className="bg-void p-5"><div className="overline mb-2">Notes saved</div><div className="font-display text-4xl text-gold">{progress?.notes_count ?? 0}</div></div>
              <div className="bg-void p-5"><div className="overline mb-2">Days a member</div><div className="font-display text-4xl text-gold">{progress?.days_a_member ?? 0}</div></div>
            </div>
            {upcoming.length > 0 && (
              <>
                <div className="overline mt-8 mb-3">// SCHEDULED, ALREADY YOURS IF YOU STAY</div>
                <div className="space-y-2">
                  {upcoming.map((d) => (<div key={d.id} className="panel p-4"><div className="font-display text-xl text-cream">{d.title}</div><div className="text-xs font-mono text-textDim">{fmt.date(d.scheduled_for)}</div></div>))}
                </div>
              </>
            )}
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="funnel-stay-winback" onClick={onClose} className="btn-gold">I'll stay</button>
              <button data-testid="funnel-continue-winback" onClick={next} className="btn-ghost">Keep going<ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {stage === "pause" && (
          <div className="animate-fade-up">
            <PauseCircle className="w-8 h-8 text-gold mb-4"/>
            <h2 className="font-display text-4xl text-cream">Pause instead. Keep everything intact.</h2>
            <p className="text-textMuted mt-3">Press pause and your seat is held. Billing stops. Your notes, progress, downloads, and community access wait for you. Resume in one click whenever.</p>
            <div className="flex gap-3 mt-8 flex-wrap">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="funnel-pause" onClick={onPause} disabled={busy} className="btn-gold">Pause membership</button>
              <button data-testid="funnel-continue-pause" onClick={next} className="btn-ghost">Show me other options<ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {stage === "downgrade" && tier === "full" && (
          <div className="animate-fade-up">
            <ArrowDownCircle className="w-8 h-8 text-gold mb-4"/>
            <h2 className="font-display text-4xl text-cream">A softer landing: $11 Foundational.</h2>
            <p className="text-textMuted mt-3">Keep the codes, the activation PDF, your notes, and the foundational drops. You'll step out of the community and premium drops, but you stay in the realm. You can always come back to Sovereign.</p>
            <div className="flex gap-3 mt-8 flex-wrap">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="funnel-downgrade" onClick={onDowngrade} disabled={busy} className="btn-gold">Switch to $11 Foundational</button>
              <button data-testid="funnel-continue-downgrade" onClick={next} className="btn-ghost">No, continue<ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {stage === "loss" && (
          <div className="animate-fade-up">
            <AlertTriangle className="w-8 h-8 text-ruby mb-4"/>
            <h2 className="font-display text-4xl text-cream">Before you go — what you lose</h2>
            <p className="text-textMuted mt-3">Cancellation is final. The following is permanently removed:</p>
            <ul className="mt-6 space-y-3">
              {LOST_LIST.map((s, i) => (
                <li key={i} data-testid={`loss-${i}`} className="flex gap-3 text-cream/85"><X className="w-4 h-4 text-ruby mt-0.5 shrink-0"/><span>{s}</span></li>
              ))}
            </ul>
            <div className="flex gap-3 mt-8 flex-wrap">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="funnel-stay-loss" onClick={onClose} className="btn-gold">Actually, I'll stay</button>
              <button data-testid="funnel-continue-loss" onClick={next} className="btn-ghost !border-ruby !text-ruby">Continue to cancel<ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}

        {stage === "final" && (
          <div className="animate-fade-up text-center">
            <Shield className="w-10 h-10 text-ruby mx-auto mb-4"/>
            <h2 className="font-display text-4xl text-cream">Final step</h2>
            <p className="text-textMuted mt-3">Press cancel below to release your seat. All data will be removed.</p>
            <div className="flex flex-col items-center gap-3 mt-8">
              <button data-testid="funnel-stay-final" onClick={onClose} className="btn-gold w-full max-w-sm">Keep my seat</button>
              <button data-testid="funnel-cancel-final" onClick={onCancel} disabled={busy} className="btn-ghost !border-ruby !text-ruby w-full max-w-sm">Cancel my membership</button>
              <button onClick={back} className="overline mt-4">Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------- Affiliate panel (high-value, stewardship-framed) ------------- */
function AffiliatePanel({ affiliate }) {
  if (!affiliate) return null;
  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  return (
    <div className="space-y-8">
      <div className="panel p-8 border-gold/50">
        <div className="overline mb-3">// MULTIPLICATION</div>
        <h2 className="font-display text-4xl md:text-5xl text-cream leading-tight">This is stewardship — not selling.</h2>
        <p className="text-textMuted mt-4 leading-relaxed max-w-3xl">When you bring someone into NOWREALM, you're not earning a commission. You're being trusted with the multiplication of a portion. Half of what they sow returns to you, for life. Steward it accordingly: tithe a slice, reinvest a slice, build a slice.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-px bg-borderGold">
        <div className="bg-void p-7"><div className="overline mb-2">// YOUR CODE</div><div className="font-display text-5xl text-gold">{affiliate.code}</div></div>
        <div className="bg-void p-7"><div className="overline mb-2">// EARNED, LIFETIME</div><div className="font-display text-5xl text-cream">{fmt.money(affiliate.earnings_cents)}</div><div className="text-xs font-mono text-textDim mt-1">{affiliate.referrals.length} stewarded</div></div>
        <div className="bg-void p-7">
          <div className="overline mb-2">// SHARE LINK</div>
          <div className="text-cream text-sm break-all" data-testid="affiliate-link">{affiliate.link}</div>
          <button data-testid="copy-affiliate" onClick={() => copy(affiliate.link)} className="btn-ghost mt-3 text-xs"><Copy className="w-3 h-3"/>Copy</button>
        </div>
      </div>

      <h3 className="font-display text-2xl text-cream">Recent stewardships</h3>
      <div className="space-y-2">
        {affiliate.referrals.map((r) => (
          <div key={r.id} className="panel p-4 flex items-center justify-between">
            <div><div className="text-cream">{r.referred_email}</div><div className="text-xs font-mono text-textDim">{fmt.datetime(r.created_at)}</div></div>
            <div className="font-display text-2xl text-gold">{fmt.money(r.payout_cents)}</div>
          </div>
        ))}
        {affiliate.referrals.length === 0 && <p className="text-textMuted">No stewardships yet. Use the Sales Wizard tab — Robin built it for you.</p>}
      </div>
    </div>
  );
}

/* ------------- Sales Wizard (multi-step, drives sales) ------------- */
const PROVEN_HOOKS = [
  "Your morning latte is a routine luxury. NOWREALM is your financial destiny.",
  "Years of stagnation are about to compress into sudden acceleration.",
  "Mammon obeys a steward. Stewards obey Kairos.",
  "$44 to command your own economic atmosphere.",
];
const PROVEN_DM_OPENERS = [
  "Hey — I saw you posting about [X]. Robin Angel just opened a private membership called NOWREALM that goes directly at the spirit behind that. Want the link?",
  "You've been showing up faithfully online. I just stepped into a membership that crystallized something I'd been circling for months. If you're open, here's the door.",
  "Quick thought: if money were a steward, what would change? That's the whole frame inside NOWREALM. Want me to send the link?",
];
const PROVEN_OBJECTIONS = [
  { o: "I can't afford it right now.", a: "That's exactly the spirit it dismantles. The membership is the same monthly cost as your weekday coffees. The codes you'll receive in week one have generated thousands for members already." },
  { o: "I'll think about it.", a: "Totally fair. Worth knowing: the founder $44 rate closes when the doors hit 300 seats. After that it's $77 or waitlist. So the only thing thinking longer costs you is the rate, not the value." },
  { o: "Is this faith-based?", a: "Yes — and unapologetically. It's a steward's table. Mammon and Chronos are spiritual realities. We treat them as such." },
];
function SalesWizard({ affiliate }) {
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState("");
  const STEPS = ["frame", "audience", "hook", "dm", "objections", "drop"];
  const stage = STEPS[step] || "drop";
  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  return (
    <div className="space-y-6" data-testid="sales-wizard">
      <div className="flex gap-1">
        {STEPS.map((_, i) => <div key={i} className={`flex-1 h-1 ${i <= step ? "bg-gold" : "bg-borderGold"}`}/>)}
      </div>
      {stage === "frame" && (
        <div className="panel p-8">
          <div className="overline mb-3">// FRAME · STEWARDSHIP, NOT SALES</div>
          <h3 className="font-display text-3xl text-cream">You are not selling. You are inviting.</h3>
          <p className="text-textMuted mt-3 leading-relaxed">Every person you bring is one you'd recommend the membership to anyway. The 50% share is a thank-you for the introduction. Walk through this wizard once a week — fresh angles, fresh hooks, fresh wins.</p>
          <button onClick={() => setStep(1)} className="btn-gold mt-6">Continue<ChevronRight className="w-4 h-4"/></button>
        </div>
      )}
      {stage === "audience" && (
        <div className="panel p-8">
          <div className="overline mb-3">// STEP 2 · WHO ARE YOU PICTURING?</div>
          <p className="text-textMuted mb-4">Type one specific person who needs this. Real name, real situation. We'll build outreach around them.</p>
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. My cousin Renee who keeps starting and stopping her business"/>
          <div className="flex gap-3 mt-6"><button onClick={() => setStep(0)} className="btn-ghost">Back</button><button onClick={() => setStep(2)} disabled={!audience.trim()} className="btn-gold disabled:opacity-40">Continue</button></div>
        </div>
      )}
      {stage === "hook" && (
        <div className="panel p-8">
          <div className="overline mb-3">// STEP 3 · PICK A HOOK</div>
          <p className="text-textMuted mb-4">Post one of these to your socials today. Add a personal line at the top.</p>
          <div className="space-y-2">
            {PROVEN_HOOKS.map((h, i) => (
              <div key={i} className="panel p-4 flex items-start justify-between gap-3">
                <p className="text-cream">{h}</p>
                <button data-testid={`copy-hook-${i}`} onClick={() => copy(`${h}\n\n${affiliate?.link || ""}`)} className="btn-ghost text-xs shrink-0"><Copy className="w-3 h-3"/></button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6"><button onClick={() => setStep(1)} className="btn-ghost">Back</button><button onClick={() => setStep(3)} className="btn-gold">Continue</button></div>
        </div>
      )}
      {stage === "dm" && (
        <div className="panel p-8">
          <div className="overline mb-3">// STEP 4 · DM SCRIPT FOR {audience.toUpperCase() || "YOUR PERSON"}</div>
          <div className="space-y-2">
            {PROVEN_DM_OPENERS.map((d, i) => (
              <div key={i} className="panel p-4">
                <p className="text-cream/90 leading-relaxed">{d.replace("[X]", "what you're moving through")}</p>
                <button onClick={() => copy(`${d.replace("[X]", "what you're moving through")}\n\n${affiliate?.link || ""}`)} className="btn-ghost text-xs mt-3"><Copy className="w-3 h-3"/>Copy</button>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6"><button onClick={() => setStep(2)} className="btn-ghost">Back</button><button onClick={() => setStep(4)} className="btn-gold">Continue</button></div>
        </div>
      )}
      {stage === "objections" && (
        <div className="panel p-8">
          <div className="overline mb-3">// STEP 5 · WHEN THEY HESITATE</div>
          <div className="space-y-3">
            {PROVEN_OBJECTIONS.map((o, i) => (
              <div key={i} className="panel p-4">
                <div className="overline mb-1">// "{o.o}"</div>
                <p className="text-cream/90">{o.a}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6"><button onClick={() => setStep(3)} className="btn-ghost">Back</button><button onClick={() => setStep(5)} className="btn-gold">Continue</button></div>
        </div>
      )}
      {stage === "drop" && (
        <div className="panel p-8">
          <Check className="w-10 h-10 text-gold mb-4 animate-glow"/>
          <h3 className="font-display text-3xl text-cream">You're armed.</h3>
          <p className="text-textMuted mt-3">Take ONE action right now. Send one DM. Post one hook. The wizard resets when you re-open it.</p>
          <button onClick={() => setStep(0)} className="btn-ghost mt-6">Start fresh</button>
        </div>
      )}
    </div>
  );
}
