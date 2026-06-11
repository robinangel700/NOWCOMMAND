import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Hourglass, Lock } from "lucide-react";
import { toast } from "sonner";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import Countdown from "../components/Countdown";

export default function Pricing() {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(null);
  const [waitEmail, setWaitEmail] = useState("");
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => { api.get("/public/state").then((r) => setState(r.data)); }, []);

  const startCheckout = async (plan) => {
    if (!user) { nav(`/signup?plan=${plan}`); return; }
    if (!state?.doors_open) { toast.error("Doors are closed. Join the waitlist."); return; }
    setBusy(plan);
    try {
      const { data } = await api.post("/checkout/subscription", { plan, origin_url: window.location.origin });
      if (data.dev_mode) toast.info("Dev mode: Stripe key not live. Simulating checkout.");
      window.location.href = data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start checkout");
      setBusy(null);
    }
  };

  const joinWaitlist = async (e) => {
    e.preventDefault();
    try {
      await api.post("/public/waitlist", { email: waitEmail });
      toast.success("You're on the waitlist. We'll reach out when a seat opens.");
      setWaitEmail("");
    } catch { toast.error("Could not join waitlist"); }
  };

  if (!state) return <div className="min-h-screen flex items-center justify-center"><Hourglass className="w-6 h-6 text-gold animate-glow" /></div>;

  const fullMonthly = state.current_full_monthly_cents;
  const promo = state.launched && state.promo_remaining_seconds > 0;

  const plans = [
    {
      key: "full_monthly",
      name: "Sovereign Monthly",
      price: fmt.money(fullMonthly),
      cadence: "/mo",
      tag: promo ? "FOUNDER PRICE" : "STANDARD",
      desc: "Full access. Community. All drops. The Activation Codes PDF.",
      features: ["All Saturday drops", "Sovereign Community access", "Notes, bookmarks, quizzes", "Activation Codes PDF instant download", "Monthly quick-win asset", "Monthly executive summary"],
      highlight: true,
    },
    {
      key: "full_annual",
      name: "Sovereign Annual",
      price: fmt.money(state.annual_cents),
      cadence: "/yr",
      tag: "BEST VALUE",
      desc: "12 months. Locked in. Auto-renew.",
      features: ["Everything in Monthly", "Annual = 2 months free vs $44/mo", "Locked at founder rate", "Priority on a-la-carte drops"],
    },
  ];
  // Foundational ($11) is intentionally NOT shown on the public sales page.
  // It only appears inside the cancel flow as a softer landing.

  return (
    <div className="min-h-screen py-24 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="overline mb-4">// PRICING &middot; 300 SEATS &middot; {state.active_members} taken</div>
        <h1 className="font-display text-5xl md:text-7xl text-cream leading-none">Cross the threshold.</h1>
        <p className="mt-6 text-textMuted text-lg max-w-2xl">
          For the cost of a good book and a warm drink, you get pure momentum and infinite ROI. Priced like a minor daily habit. Yields a lifetime legacy.
        </p>

        {promo && (
          <div className="mt-10 inline-flex flex-col gap-3 p-5 border border-borderGold bg-surface">
            <div className="overline">// FOUNDER PRICING CLOSES</div>
            <Countdown seconds={state.promo_remaining_seconds} />
            <div className="text-xs font-mono text-textMuted">After this window: {fmt.money(state.after_promo_monthly_cents)}/month.</div>
          </div>
        )}

        {!state.doors_open && (
          <div className="mt-10 p-6 border border-ruby/60 bg-ruby/10">
            <div className="overline text-cream mb-2">// DOORS ARE CLOSED</div>
            <p className="text-cream/80 mb-4">All 300 seats are taken. Join the waitlist and you'll be first when a seat opens.</p>
            <form onSubmit={joinWaitlist} className="flex flex-col md:flex-row gap-3 max-w-md">
              <input data-testid="waitlist-email" type="email" required placeholder="you@dominion.com" value={waitEmail} onChange={(e) => setWaitEmail(e.target.value)} />
              <button data-testid="waitlist-submit" type="submit" className="btn-gold">Join the waitlist</button>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-px bg-borderGold mt-16">
          {plans.map((p) => (
            <div key={p.key} className={`bg-void p-8 md:p-10 ${p.highlight ? "ring-1 ring-gold" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="overline">// {p.tag}</div>
                {p.highlight && <Hourglass className="w-4 h-4 text-gold animate-glow" />}
              </div>
              <h3 className="font-display text-3xl text-cream mt-4">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-6xl bg-gold-grad">{p.price}</span>
                <span className="text-textMuted text-sm">{p.cadence}</span>
              </div>
              <p className="text-textMuted text-sm mt-3 leading-relaxed">{p.desc}</p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-cream/90">
                    <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" /> <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                data-testid={`buy-${p.key}`}
                disabled={busy === p.key || !state.doors_open}
                onClick={() => startCheckout(p.key)}
                className={`mt-8 w-full ${p.highlight ? "btn-gold" : "btn-ghost"} justify-center disabled:opacity-50`}
              >
                {busy === p.key ? "Opening Stripe..." : !state.doors_open ? <><Lock className="w-4 h-4" /> Doors closed</> : "Claim this seat"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-xs font-mono uppercase tracking-[0.25em] text-textDim">
          Auto-renew. Cancel, pause, or downgrade anytime from your billing portal. {state.stripe_real ? "Live Stripe." : "Stripe in dev mode — use Robin's real key in .env to go live."}
        </div>
      </div>
    </div>
  );
}
