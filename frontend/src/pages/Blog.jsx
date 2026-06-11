import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Hourglass, Mail, ChevronLeft, Eye } from "lucide-react";
import { api, fmt } from "../lib/api";
import { toast } from "sonner";

export function BlogIndex() {
  const [data, setData] = useState({ articles: [], vault_peek: [] });
  const [email, setEmail] = useState("");
  useEffect(() => {
    api.get("/public/articles").then((r) => setData(r.data));
    document.title = "NOWCOMMAND — Blog: Money, Time & Divine Timing";
  }, []);
  const optin = async (e) => {
    e.preventDefault();
    if (!email) return;
    try { await api.post("/public/lead", { email, source: "blog_index" }); toast.success("You're on the list. Watch your inbox."); setEmail(""); }
    catch { toast.error("Could not subscribe"); }
  };
  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="overline mb-4">// THE NOWCOMMAND BLOG</div>
        <h1 className="font-display text-5xl md:text-7xl text-cream leading-[1.0]">
          Notes from the <span className="bg-gold-grad">dominion</span> table.
        </h1>
        <p className="text-textMuted text-lg max-w-2xl mt-6">
          Short, sharp pieces on money, Kairos, and the codes Robin transmits. Read these freely. The deeper material lives behind the threshold.
        </p>

        <form onSubmit={optin} className="mt-10 flex flex-wrap gap-3 max-w-xl panel p-5" data-testid="blog-optin">
          <div className="flex-1 min-w-[240px]">
            <div className="overline mb-2 flex items-center gap-2"><Mail className="w-3 h-3"/>GET THE TUESDAY TRANSMISSION</div>
            <input data-testid="blog-optin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dominion.com" />
          </div>
          <button data-testid="blog-optin-submit" type="submit" className="btn-gold self-end">Subscribe</button>
        </form>

        <h2 className="font-display text-3xl text-cream mt-20 mb-8">Free reads</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-borderGold">
          {data.articles.map((a) => (
            <Link key={a.id} to={`/blog/${a.slug}`} data-testid={`article-${a.slug}`} className="bg-void p-7 group hover:bg-surface transition-colors">
              {a.cover_image_url && (
                <div className="-m-7 mb-5 h-44 overflow-hidden">
                  <img src={a.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                </div>
              )}
              <div className="overline mb-3">{a.tags?.[0] || "ESSAY"}</div>
              <h3 className="font-display text-2xl text-cream leading-tight group-hover:text-gold transition-colors">{a.title}</h3>
              <p className="text-textMuted text-sm mt-3" style={{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.excerpt}</p>
              <div className="mt-5 flex items-center justify-between text-xs font-mono text-textDim">
                <span>{fmt.date(a.published_at)}</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> {a.views || 0}</span>
              </div>
            </Link>
          ))}
          {data.articles.length === 0 && (
            <div className="bg-void p-10 col-span-full text-textMuted">No articles yet. Robin is sharpening the next one.</div>
          )}
        </div>

        {data.vault_peek.length > 0 && (
          <div className="mt-24">
            <div className="overline mb-3">// THE VAULT &middot; MEMBERS ONLY</div>
            <div className="flex items-baseline justify-between flex-wrap gap-4 mb-8">
              <h2 className="font-display text-4xl md:text-5xl text-cream">What's behind the threshold.</h2>
              <Link to="/pricing" className="btn-gold">Claim a seat <ArrowRight className="w-4 h-4"/></Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-borderGold">
              {data.vault_peek.map((a) => (
                <div key={a.id} className="bg-void p-7 relative overflow-hidden" data-testid={`vault-peek-${a.slug}`}>
                  <div className="absolute top-4 right-4 flex items-center gap-1 overline"><Lock className="w-3 h-3"/>VAULT</div>
                  {a.cover_image_url && (
                    <div className="-m-7 mb-5 h-44 overflow-hidden">
                      <img src={a.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover opacity-60"/>
                    </div>
                  )}
                  <div className="overline mb-3">{a.tags?.[0] || "TRANSMISSION"}</div>
                  <h3 className="font-display text-2xl text-cream leading-tight">{a.title}</h3>
                  <p className="text-textMuted text-sm mt-3 line-clamp-3">{a.excerpt}</p>
                  <div className="mt-4">
                    <Link to="/pricing" className="overline text-gold hover:text-goldHi flex items-center gap-1">Unlock <ArrowRight className="w-3 h-3"/></Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ArticleDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [email, setEmail] = useState("");
  const [notFound, setNotFound] = useState(false);
  useEffect(() => {
    api.get(`/public/articles/${slug}`).then((r) => {
      setA(r.data.article);
      document.title = r.data.article.seo_title || r.data.article.title;
      const desc = r.data.article.seo_description || r.data.article.excerpt || "";
      let m = document.querySelector("meta[name=description]");
      if (!m) { m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); }
      m.setAttribute("content", desc);
      // OG
      const setOg = (p, c) => {
        let el = document.querySelector(`meta[property='${p}']`);
        if (!el) { el = document.createElement("meta"); el.setAttribute("property", p); document.head.appendChild(el); }
        el.setAttribute("content", c);
      };
      setOg("og:title", r.data.article.seo_title || r.data.article.title);
      setOg("og:description", desc);
      if (r.data.article.og_image_url) setOg("og:image", r.data.article.og_image_url);
      setOg("og:type", "article");
    }).catch(() => setNotFound(true));
  }, [slug]);
  const optin = async (e) => {
    e.preventDefault();
    try { await api.post("/public/lead", { email, source: slug }); toast.success("Subscribed."); setEmail(""); }
    catch { toast.error("Could not subscribe"); }
  };
  if (notFound) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="overline mb-2">// 404</div><h1 className="font-display text-4xl text-cream">Lost in transit</h1><button onClick={() => nav("/blog")} className="btn-gold mt-6">Back to blog</button></div></div>;
  if (!a) return <div className="min-h-screen flex items-center justify-center"><Hourglass className="w-6 h-6 text-gold animate-glow"/></div>;
  return (
    <article className="min-h-screen">
      {a.cover_image_url && (
        <div className="relative h-[60vh] min-h-[420px]">
          <img src={a.cover_image_url} alt="" className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/60 to-void"/>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-6 lg:px-10 -mt-32 relative">
        <button onClick={() => nav("/blog")} className="overline flex items-center gap-2 mb-6"><ChevronLeft className="w-4 h-4"/>Back to blog</button>
        <div className="overline mb-4">{(a.tags && a.tags[0]) || "ESSAY"} &middot; {fmt.date(a.published_at)}</div>
        <h1 className="font-display text-5xl md:text-7xl text-cream leading-[1.0]">{a.title}</h1>
        {a.subtitle && <p className="text-textMuted text-xl mt-4 leading-relaxed">{a.subtitle}</p>}
        <div className="flex items-center gap-4 mt-8 text-textDim text-sm font-mono">
          <span className="text-gold">{a.author_name || "Robin Angel"}</span>
          <span>&middot;</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{a.views || 0} reads</span>
        </div>
        <div className="gold-line my-10"/>
        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap font-body text-lg leading-[1.8] text-cream/90">{a.body_md}</div>
        </div>

        {a.sales_copy_md && (
          <div className="mt-16 panel p-8 md:p-10 border-gold/40" style={{ borderColor: "#5C4B24" }}>
            <div className="overline mb-3">// FROM ROBIN</div>
            <div className="whitespace-pre-wrap font-body text-cream/95 leading-relaxed text-lg">{a.sales_copy_md}</div>
            <Link to="/pricing" className="btn-gold mt-6">Claim a seat <ArrowRight className="w-4 h-4"/></Link>
          </div>
        )}

        <form onSubmit={optin} className="mt-12 panel p-6 md:p-8" data-testid="article-optin">
          <div className="overline mb-2">// {a.optin_headline || "STAY ON THE LIST"}</div>
          <h3 className="font-display text-3xl text-cream mb-3">{a.optin_cta || "Get the Tuesday transmission"}</h3>
          <p className="text-textMuted mb-4">One short, sharp piece every Tuesday. No spam. Unsubscribe in one click.</p>
          <div className="flex flex-wrap gap-3">
            <input data-testid="article-optin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dominion.com" className="flex-1 min-w-[220px]"/>
            <button data-testid="article-optin-submit" className="btn-gold">Subscribe</button>
          </div>
        </form>
      </div>
      <div className="h-32"/>
    </article>
  );
}
