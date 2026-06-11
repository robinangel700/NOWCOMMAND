import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, fmt } from "../lib/api";
import { Hourglass, ChevronLeft, Lock, Eye } from "lucide-react";

export function VaultIndex() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/vault/articles").then((r) => { setArticles(r.data.articles); setLoading(false); }).catch(() => setLoading(false));
    document.title = "NOWCOMMAND Vault";
  }, []);
  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="overline mb-4 flex items-center gap-2"><Lock className="w-3 h-3"/>// THE VAULT &middot; SOVEREIGN-ONLY</div>
        <h1 className="font-display text-5xl md:text-7xl text-cream leading-[1.0]">Inside the threshold.</h1>
        <p className="text-textMuted text-lg max-w-2xl mt-6">The deeper transmissions live here. Long-form, no fluff, no algorithms. Read once. Then read again next week.</p>

        {loading ? <Hourglass className="w-6 h-6 text-gold animate-glow mt-16"/> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-borderGold mt-16">
            {articles.map((a) => (
              <Link key={a.id} to={`/vault/${a.slug}`} data-testid={`vault-${a.slug}`} className="bg-void p-7 group hover:bg-surface">
                {a.cover_image_url && (
                  <div className="-m-7 mb-5 h-44 overflow-hidden">
                    <img src={a.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                  </div>
                )}
                <div className="overline mb-3">{a.tags?.[0] || "VAULT"}</div>
                <h3 className="font-display text-2xl text-cream group-hover:text-gold transition-colors leading-tight">{a.title}</h3>
                <p className="text-textMuted text-sm mt-3 line-clamp-3">{a.excerpt}</p>
                <div className="mt-5 flex items-center justify-between text-xs font-mono text-textDim">
                  <span>{fmt.date(a.published_at)}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{a.views || 0}</span>
                </div>
              </Link>
            ))}
            {articles.length === 0 && <div className="bg-void p-10 col-span-full text-textMuted">No vault articles yet. Robin is loading them in.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export function VaultArticle() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api.get(`/vault/articles/${slug}`).then((r) => {
      setA(r.data.article);
      document.title = r.data.article.seo_title || r.data.article.title;
    }).catch((e) => setErr(e?.response?.status || "error"));
  }, [slug]);
  if (err === 403) return <div className="min-h-screen flex items-center justify-center px-6 text-center"><div><div className="overline mb-3">// LOCKED</div><h1 className="font-display text-4xl text-cream">This is a vault piece</h1><p className="text-textMuted mt-3">Claim a seat to enter.</p><Link to="/pricing" className="btn-gold mt-6 inline-flex">Claim a seat</Link></div></div>;
  if (err) return <div className="min-h-screen flex items-center justify-center"><h1 className="font-display text-3xl text-cream">Not found</h1></div>;
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
        <button onClick={() => nav("/vault")} className="overline flex items-center gap-2 mb-6"><ChevronLeft className="w-4 h-4"/>Back to vault</button>
        <div className="overline mb-4 flex items-center gap-2"><Lock className="w-3 h-3"/>VAULT &middot; {fmt.date(a.published_at)}</div>
        <h1 className="font-display text-5xl md:text-7xl text-cream leading-[1.0]">{a.title}</h1>
        {a.subtitle && <p className="text-textMuted text-xl mt-4 leading-relaxed">{a.subtitle}</p>}
        <div className="gold-line my-10"/>
        <div className="whitespace-pre-wrap font-body text-lg leading-[1.8] text-cream/90">{a.body_md}</div>
      </div>
      <div className="h-32"/>
    </article>
  );
}
