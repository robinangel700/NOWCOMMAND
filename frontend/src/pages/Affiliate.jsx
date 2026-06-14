import { useEffect, useState } from "react";
import { Copy, ExternalLink, Share2, Target, MessageCircle, Megaphone, ShieldQuestion, Repeat, Flame, ChevronRight } from "lucide-react";
import { api, fmt } from "../lib/api";
import { toast } from "sonner";

export default function Affiliate() {
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  useEffect(() => { api.get("/affiliate/me").then((r) => setData(r.data)); }, []);
  if (!data) return null;
  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  const link = data.link;

  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="overline mb-3">// AFFILIATE &middot; 50% SHARE</div>
        <h1 className="font-display text-5xl text-cream">Multiply by referral.</h1>
        <p className="text-textMuted mt-3 max-w-2xl">Share your link. When someone crosses the threshold through you, you keep <span className="text-gold">50% of their payment</span> &mdash; for life.</p>

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
            <div className="text-cream text-sm break-all" data-testid="affiliate-link">{link}</div>
            <button data-testid="copy-affiliate" onClick={() => copy(link)} className="btn-ghost mt-4 text-xs"><Copy className="w-3 h-3"/> Copy</button>
          </div>
        </div>

        {/* ---------------- SALES WIZARD ---------------- */}
        <SalesWizard link={link} step={step} setStep={setStep} copy={copy} earnings={data.earnings_cents} />

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
          {data.referrals.length === 0 && <p className="text-textMuted">No referrals yet. Run the wizard above.</p>}
        </div>
      </div>
    </div>
  );
}

/* The 6-step weekly playbook that turns a member into a confident multiplier. */
function SalesWizard({ link, step, setStep, copy, earnings }) {
  const milestones = [10000, 50000, 100000];
  const nextMilestone = milestones.find((m) => earnings < m) || null;

  const STEPS = [
    {
      icon: Target, title: "1 · Pick your one person",
      lead: "Multiplication is not a megaphone. It's a hand on a shoulder. Don't broadcast — choose ONE person this week who is tired of bowing to money and the clock.",
      points: [
        "Someone who already talks about money fear, stagnation, or 'not enough time.'",
        "Someone who trusts your taste — they'd try what you recommend.",
        "Write their name down. The whole week is about them.",
      ],
    },
    {
      icon: MessageCircle, title: "2 · Open the door (DM script)",
      lead: "No pitch. Open a conversation. Paste this, swap the bracket, send it.",
      scripts: [
        { label: "Warm opener", text: "Hey [name] — random, but you crossed my mind. I joined this thing called NOWCOMMAND a little while ago. It's reframed how I hold money and time more than anything I've touched in years. Not selling you — just thought of you. Want me to send you what it actually is?" },
        { label: "If they say 'tell me more'", text: "Short version: it's a membership built around casting out the spirit of Mammon (money-fear) and Chronos (the clock that keeps you 'behind'). Weekly drops, a real community, and a vault of teachings. Here's my link — I get credited if you join, but honestly I'd send it either way: " + link },
      ],
    },
    {
      icon: Megaphone, title: "3 · Post one honest hook",
      lead: "One post. Your real story, not ad copy. Pull a fresh angle from the Ad-Copy generator if you want variations — then make it yours.",
      scripts: [
        { label: "Story hook", text: "For years I thought the problem was that I needed more money. It wasn't. It was that money had me on a leash — and the clock kept telling me I was late. NOWCOMMAND broke both. If you feel that leash, this is the room: " + link },
        { label: "Curiosity hook", text: "Two words quietly run most people's finances: Mammon and Chronos. One says 'never enough.' The other says 'too late.' I evicted both inside NOWCOMMAND. DM me 'codes' or grab it here → " + link },
      ],
    },
    {
      icon: ShieldQuestion, title: "4 · Handle the 3 objections",
      lead: "When interest meets hesitation, don't push — answer cleanly. These are the only three you'll hear.",
      objections: [
        { q: "“Is it just hype / prosperity gospel?”", a: "No. It's stewardship, not greed. The whole frame is that money is a courier you send on assignment — not a master you serve. It's about rest and authority, not hustle." },
        { q: "“I don't have the money / time right now.”", a: "That's exactly the leash it loosens. There's also an $11 foundational tier if the full seat is too much this month. And every drop is built to fit a real life — the quick wins are under 15 minutes." },
        { q: "“What actually do I get?”", a: "Weekly Saturday drops, a private community, a growing vault, quizzes + notes that save your progress, the Activation Codes PDF and the Dominion Over Mammon book on day one. It auto-renews; you can pause or cancel anytime." },
      ],
    },
    {
      icon: Repeat, title: "5 · Follow up once (then let go)",
      lead: "Most yeses come on the gentle second touch — not the first. Wait ~48 hours, then send this. Once. Never chase.",
      scripts: [
        { label: "The soft follow-up", text: "No pressure at all [name] — just closing the loop. Doors cap at 300 seats and founder pricing won't last, so I didn't want you to miss the window if it's a yes. Either way, glad you're in my world. Link's here if/when: " + link },
      ],
    },
    {
      icon: Flame, title: "6 · Celebrate & compound",
      lead: "When someone joins through you, your 50% is credited for life. Now multiply the momentum.",
      points: [
        "Thank them by name the day they join — make them feel chosen, not converted.",
        "Welcome them in the community so they land soft.",
        nextMilestone ? `You're ${fmt.money(nextMilestone - earnings)} from your next payout milestone (${fmt.money(nextMilestone)}). One more conversation.` : "You've crossed every milestone — you're a Steward of Stewards now.",
        "Then go back to Step 1. One person a week compounds faster than any ad.",
      ],
    },
  ];

  const s = STEPS[step];
  const Icon = s.icon;
  return (
    <div className="mt-16 panel p-6 md:p-8" data-testid="sales-wizard">
      <div className="overline mb-2">// SALES WIZARD · YOUR 6-STEP WEEKLY PLAYBOOK</div>
      <h2 className="font-display text-3xl text-cream">Become a multiplier — without being salesy.</h2>
      <p className="text-textMuted mt-2 max-w-2xl">Run this loop once a week. It's built for one quiet conversion at a time. Every script already has your link baked in — copy, personalize the bracket, send.</p>

      {/* progress dots */}
      <div className="flex items-center gap-2 mt-6 flex-wrap">
        {STEPS.map((st, i) => (
          <button key={st.title} data-testid={`wizard-step-${i}`} onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all ${i === step ? "w-10 bg-gold" : "w-6 bg-borderGold hover:bg-goldHi"}`} aria-label={`Step ${i + 1}`} />
        ))}
        <span className="overline ml-2">{step + 1} / {STEPS.length}</span>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-6 h-6 text-gold" />
          <h3 className="font-display text-2xl text-cream">{s.title}</h3>
        </div>
        <p className="text-cream/90 leading-relaxed">{s.lead}</p>

        {s.points && (
          <ul className="mt-4 space-y-2">
            {s.points.map((p, i) => <li key={p} className="flex gap-3 text-textMuted"><ChevronRight className="w-4 h-4 text-gold shrink-0 mt-1"/><span>{p}</span></li>)}
          </ul>
        )}

        {s.scripts && (
          <div className="mt-5 space-y-4">
            {s.scripts.map((sc) => (
              <div key={sc.label} className="bg-void border border-borderGold p-4">
                <div className="overline mb-2">{sc.label}</div>
                <p className="text-cream/95 text-sm whitespace-pre-wrap leading-relaxed">{sc.text}</p>
                <button data-testid={`wizard-copy-${step}-${sc.label.slice(0,8)}`} onClick={() => copy(sc.text)} className="btn-ghost text-xs mt-3"><Copy className="w-3 h-3"/> Copy script</button>
              </div>
            ))}
          </div>
        )}

        {s.objections && (
          <div className="mt-5 space-y-3">
            {s.objections.map((o) => (
              <div key={o.q} className="bg-void border border-borderGold p-4">
                <div className="font-display text-lg text-gold">{o.q}</div>
                <p className="text-cream/90 text-sm mt-2 leading-relaxed">{o.a}</p>
                <button onClick={() => copy(o.a)} className="btn-ghost text-xs mt-3"><Copy className="w-3 h-3"/> Copy answer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t border-borderGold">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-ghost text-xs disabled:opacity-30">← Back</button>
        {step < STEPS.length - 1
          ? <button data-testid="wizard-next" onClick={() => setStep(step + 1)} className="btn-gold text-xs">Next step <ChevronRight className="w-3 h-3"/></button>
          : <button onClick={() => setStep(0)} className="btn-gold text-xs">Restart the loop <Repeat className="w-3 h-3"/></button>}
      </div>
    </div>
  );
}
