import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Coffee, Compass, Crown, Hourglass, Sparkles, Zap, ArrowRight, Mail } from "lucide-react";
import { api, fmt } from "../lib/api";
import Countdown from "../components/Countdown";
import { useAuth } from "../lib/auth";

const HERO_IMG = "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";
const TEX = "https://images.unsplash.com/photo-1604079628040-94301bb21b91?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";
const CLOCK = "https://images.unsplash.com/photo-1518281361980-b26bfd556770?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";

export default function Landing() {
  const [state, setState] = useState(null);
  const [blog, setBlog] = useState({ articles: [], vault_peek: [] });
  const [optinEmail, setOptinEmail] = useState("");
  const [params] = useSearchParams();
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get("/public/state").then((r) => setState(r.data));
    api.get("/public/articles").then((r) => setBlog(r.data));
    const ref = params.get("ref");
    if (ref) localStorage.setItem("nowcommand_ref", ref);
  }, [params]);

  const submitOptin = async (e) => {
    e.preventDefault();
    if (!optinEmail) return;
    try { await api.post("/public/lead", { email: optinEmail, source: "landing_optin" });
      setOptinEmail("");
      const { toast } = await import("sonner");
      toast.success("You're on the list. Watch your inbox.");
    } catch {}
  };

  const headlinePrice = state ? fmt.money(state.current_full_monthly_cents) : "$44";

  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/85 to-void" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-32 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8 animate-fade-up">
            <div className="overline mb-6" data-testid="hero-overline">// CODEX 001 / ACTIVATION</div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-cream">
              Cast out <span className="bg-gold-grad">Mammon</span>.<br/>
              Rule over the <span className="italic">Increase</span>.<br/>
              Operate in <span className="bg-gold-grad">Kairos</span>.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-textMuted max-w-2xl leading-relaxed">
              NOWCOMMAND is the private membership where Robin Angel transmits the codes that evict the spirit of delay,
              dethrone the spirit of money, and seat you in divine timing. <span className="text-cream">You are not subscribing. You are crossing a threshold.</span>
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                data-testid="hero-cta-claim"
                onClick={() => nav("/pricing")}
                className="btn-gold"
              >
                Claim a seat &mdash; {headlinePrice}/mo <ArrowUpRight className="w-4 h-4" />
              </button>
              <Link to="/about" data-testid="hero-cta-manifesto" className="btn-ghost">Read the Manifesto</Link>
            </div>
            {state?.launched && state?.promo_remaining_seconds > 0 && (
              <div className="mt-10 inline-flex flex-col gap-3 p-5 border border-borderGold bg-surface/70">
                <div className="overline">// FOUNDER PRICING WINDOW CLOSES</div>
                <Countdown seconds={state.promo_remaining_seconds} />
                <div className="text-xs font-mono text-textMuted">After this window: {fmt.money(state.after_promo_monthly_cents)}/month.</div>
              </div>
            )}
            <div className="mt-10 flex items-center gap-6 text-xs font-mono uppercase tracking-[0.25em] text-textDim">
              <span data-testid="seats-counter">{state?.active_members ?? 0} / {state?.cap ?? 300} seats taken</span>
              <span>&middot;</span>
              <span>Saturday drops</span>
              <span>&middot;</span>
              <span>Auto-renew</span>
            </div>
          </div>
          <div className="lg:col-span-4 hidden lg:block animate-fade-up">
            <div className="relative panel p-8">
              <div className="overline mb-4">// THE WAGER</div>
              <Coffee className="w-8 h-8 text-gold mb-4" />
              <p className="font-display text-2xl text-cream leading-snug">
                "Your morning latte is a routine luxury. This membership is your financial destiny."
              </p>
              <div className="gold-line my-6" />
              <p className="text-sm text-textMuted leading-relaxed">
                Priced like a minor daily habit. Yields a lifetime legacy. $44 to command your own economic atmosphere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG HERO */}
      <section className="py-24 md:py-32 border-t border-borderGold">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div>
              <div className="overline mb-3">// THE NOWCOMMAND BLOG</div>
              <h2 className="font-display text-4xl md:text-6xl text-cream leading-[1.0]">Read freely. Get warmed up. <br/>Then cross the threshold.</h2>
              <p className="text-textMuted text-lg mt-5 max-w-2xl">Short, sharp essays on money, time, and divine timing. New pieces every week. Subscribe and the next one lands in your inbox.</p>
            </div>
            <Link to="/blog" data-testid="landing-blog-link" className="btn-ghost">See all <ArrowRight className="w-4 h-4"/></Link>
          </div>
          {blog.articles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-borderGold">
              {blog.articles.slice(0, 6).map((a) => (
                <Link key={a.id} to={`/blog/${a.slug}`} data-testid={`landing-article-${a.slug}`} className="bg-void p-7 group hover:bg-surface transition-colors">
                  {a.cover_image_url && (
                    <div className="h-44 -mx-7 -mt-7 mb-5 overflow-hidden">
                      <img src={a.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                    </div>
                  )}
                  <div className="overline mb-3">{a.tags?.[0] || "ESSAY"} &middot; {fmt.date(a.published_at)}</div>
                  <h3 className="font-display text-2xl text-cream group-hover:text-gold transition-colors leading-tight">{a.title}</h3>
                  <p className="text-textMuted text-sm mt-3 line-clamp-3">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="panel p-10 text-center">
              <Coffee className="w-8 h-8 text-gold mx-auto mb-3"/>
              <p className="text-textMuted">Robin is sharpening the first essays. Subscribe below to get the first one when it drops.</p>
            </div>
          )}

          <form onSubmit={submitOptin} className="mt-12 panel p-6 md:p-8 max-w-2xl mx-auto" data-testid="landing-optin">
            <div className="overline mb-2 flex items-center gap-2"><Mail className="w-3 h-3"/>// TUESDAY TRANSMISSION</div>
            <h3 className="font-display text-2xl md:text-3xl text-cream mb-3">One short, sharp piece every Tuesday.</h3>
            <p className="text-textMuted mb-4 text-sm">Money. Time. Dominion. Free. Unsubscribe in one click.</p>
            <div className="flex flex-wrap gap-3">
              <input data-testid="landing-optin-email" type="email" required value={optinEmail} onChange={(e) => setOptinEmail(e.target.value)} placeholder="you@dominion.com" className="flex-1 min-w-[220px]"/>
              <button data-testid="landing-optin-submit" type="submit" className="btn-gold">Subscribe</button>
            </div>
          </form>
        </div>
      </section>

      {/* WAGER GRID */}
      <section className="relative py-24 md:py-32 border-t border-borderGold" style={{ backgroundImage: `linear-gradient(rgba(10,10,10,0.85), rgba(10,10,10,0.95)), url(${TEX})`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="overline mb-4">// WHY {headlinePrice}</div>
          <h2 className="font-display text-4xl md:text-6xl text-cream leading-[1.05] max-w-4xl">
            If your budget allows for daily coffee, it already accommodates your <span className="bg-gold-grad">highest calling.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-px bg-borderGold mt-16">
            {[
              { h: "A book and a warm drink.", p: "For the same exact cost, you get pure momentum and infinite ROI. Priced like a minor daily habit, but yields a lifetime legacy." },
              { h: "You already buy study tools.", p: "Tools to stretch your mind. This stretches your entire reality. The same dollars, repurposed for dominion." },
              { h: "$44 to command your atmosphere.", p: "Live from dominion and sovereign rest. Step into the confidence that money must obey you." },
              { h: "Compress the years.", p: "Watch years of stagnation compress into sudden acceleration. The codes shorten the road." },
              { h: "Charge up. Claim territory.", p: "Step into your breakthrough season — not next year, this week. The drop is already scheduled." },
              { h: "Rewrite the bloodline.", p: "Actively rewrite your family's future history. The atmosphere you carry becomes the ceiling they inherit." },
            ].map((c, i) => (
              <div key={i} className="bg-void p-8 md:p-10">
                <div className="overline mb-4">// 0{i + 1}</div>
                <h3 className="font-display text-2xl text-cream mb-3 leading-tight">{c.h}</h3>
                <p className="text-textMuted leading-relaxed">{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONCEPT TRIPTYCH */}
      <section className="py-24 md:py-32 border-t border-borderGold">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="overline mb-4">// THE FOUR ACTIVATIONS</div>
            <h2 className="font-display text-4xl md:text-6xl text-cream leading-[1.05]">Money, taught to obey. Time, restored to Kairos.</h2>
            <p className="mt-6 text-textMuted text-lg leading-relaxed max-w-xl">
              Inside, four operations run in parallel. Each one dismantles a stronghold. Each one re-trains the field you walk through.
            </p>
          </div>
          <div className="lg:col-span-6">
            <img src={CLOCK} alt="" className="w-full h-[440px] object-cover grayscale brightness-90 contrast-110" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-borderGold">
          {[
            { icon: Crown, h: "Cast out Mammon", p: "Evict the spirit of money. Restore your throne posture." },
            { icon: Hourglass, h: "Evict Chronos", p: "Break agreement with delay. Reclaim your timeline." },
            { icon: Sparkles, h: "Operate in Kairos", p: "Move on divine signal. Strike inside the window." },
            { icon: Zap, h: "Get activated", p: "Codes from Robin Angel. Begin your own rule over the increase." },
          ].map((c, i) => (
            <div key={i} className="bg-void p-8">
              <c.icon className="w-7 h-7 text-gold mb-5" />
              <h3 className="font-display text-2xl text-cream mb-2">{c.h}</h3>
              <p className="text-textMuted text-sm leading-relaxed">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-24 md:py-32 border-t border-borderGold bg-surface/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="overline mb-4">// WHAT LANDS IN YOUR DASHBOARD</div>
          <h2 className="font-display text-4xl md:text-6xl text-cream max-w-3xl leading-[1.05]">The vault. The drops. The community. The codes.</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {[
              ["Saturday Drops", "A new transmission every Saturday, scheduled and pre-loaded. You see what's coming before it lands."],
              ["The Activation Codes PDF", "Instant download the moment you cross the threshold. Read once tonight. Read again tomorrow."],
              ["Personalized Dashboard", "Saved progress, private metrics, custom learning paths, your own atmosphere."],
              ["Quizzes & Notes", "Notes per drop, bookmarks, quiz attempts — a real archive of your dominion work."],
              ["Sovereign Community", "Posts, comments, the Weekly Biggest Win thread, the One Page Manifesto pinned at the top."],
              ["Quick-Win Assets", "A monthly asset under 15 minutes. Designed to ship a result before you finish your coffee."],
              ["Monthly Executive Summary", "Three bullets of what matters. Three of what to ignore. One resource to use."],
              ["A-la-carte Drops", "Single high-value assets, priced individually. Members and non-members alike can purchase."],
              ["Sovereign Billing", "Pause instead of cancel. Downgrade to foundational. Card auto-update. Smart retry on failure."],
            ].map(([h, p], i) => (
              <div key={i} className="panel p-7">
                <div className="overline mb-3">// 0{i + 1}</div>
                <h3 className="font-display text-2xl text-cream mb-2">{h}</h3>
                <p className="text-textMuted text-sm leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 border-t border-borderGold relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 text-center">
          <div className="overline mb-6">// 300 SEATS &middot; THEN DOORS CLOSE</div>
          <h2 className="font-display text-5xl md:text-7xl text-cream leading-[1.0]">
            $44 to <span className="bg-gold-grad">tap into</span> your breakthrough season.
          </h2>
          <p className="mt-8 text-lg text-textMuted max-w-2xl mx-auto">
            Charge up and claim your territory. Actively rewrite your family's future history. The codes are already moving.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button data-testid="footer-cta" onClick={() => nav("/pricing")} className="btn-gold">Cross the threshold</button>
            <Link data-testid="footer-cta-waitlist" to="/pricing" className="btn-ghost">See all options</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
