import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, CheckSquare, Square, Send, Users, Hourglass, Mail, FileText, MessageSquare, Bell, Plus, Rocket, BookOpen, UserCog, ChevronRight, ExternalLink, AtSign, Edit3, ArrowRight, Eye, Award, Palette, DollarSign, Megaphone, HandHeart, Copy } from "lucide-react";
import { api, fmt, BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import { MyProfile } from "./Profile";

import HealthDashboard from "./HealthDashboard";
import StewardIdentity from "./StewardIdentity";

const TABS = [
  { id: "health", label: "Health", icon: Award },
  { id: "wizard", label: "Launch Wizard", icon: Rocket },
  { id: "identity", label: "Steward Identity", icon: HandHeart },
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "drops", label: "Drops", icon: Sparkles },
  { id: "articles", label: "Articles", icon: BookOpen },
  { id: "testimonials", label: "Testimonials", icon: Award },
  { id: "ad-copy", label: "Ad Copy", icon: Megaphone },
  { id: "steward-stewards", label: "Steward of Stewards", icon: HandHeart },
  { id: "members", label: "Members", icon: Users },
  { id: "leads", label: "Leads", icon: AtSign },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "email-log", label: "Email Log", icon: Mail },
  { id: "brand", label: "Brand & Visuals", icon: Palette },
  { id: "pricing", label: "Pricing & Offers", icon: DollarSign },
  { id: "notif-prefs", label: "My Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: UserCog },
  { id: "launch", label: "Launch", icon: Rocket },
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("tab") || "health";
  const [tab, setTab] = useState(initial);
  const switchTab = (id) => { setTab(id); params.set("tab", id); setParams(params); };
  useEffect(() => { if (params.get("tab")) setTab(params.get("tab")); }, [params]);

  return (
    <div className="min-h-screen px-6 lg:px-10 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="overline mb-3">// ROBIN'S PORTAL</div>
        <h1 className="font-display text-5xl text-cream">Creator Control Room</h1>
        <p className="text-textMuted mt-2">Every operation. Every drop. Every member. One pane.</p>

        <div className="flex flex-wrap gap-px bg-borderGold mt-10 mb-10">
          {TABS.map((t) => (
            <button key={t.id} data-testid={`admin-tab-${t.id}`} onClick={() => switchTab(t.id)}
              className={`bg-void px-5 py-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] transition-colors ${tab === t.id ? "text-gold" : "text-textMuted hover:text-cream"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "health" && <HealthDashboard />}
        {tab === "identity" && <StewardIdentity />}
        {tab === "wizard" && <LaunchWizard onJump={switchTab}/>}
        {tab === "checklist" && <Checklist />}
        {tab === "drops" && <Drops />}
        {tab === "articles" && <Articles />}
        {tab === "testimonials" && <TestimonialsAdmin />}
        {tab === "ad-copy" && <AdCopyTab />}
        {tab === "steward-stewards" && <StewardOfStewards />}
        {tab === "members" && <Members />}
        {tab === "leads" && <Leads />}
        {tab === "summary" && <Summary />}
        {tab === "community" && <CommunityAdmin />}
        {tab === "reminders" && <Reminders />}
        {tab === "emails" && <EmailTemplates />}
        {tab === "email-log" && <Outbox />}
        {tab === "brand" && <BrandTab />}
        {tab === "pricing" && <PricingTab />}
        {tab === "notif-prefs" && <NotifPrefsTab />}
        {tab === "profile" && <MyProfile />}
        {tab === "launch" && <LaunchPanel />}
      </div>
    </div>
  );
}

/* ----------------- LAUNCH WIZARD ----------------- */
function LaunchWizard({ onJump }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState(null);
  const [stats, setStats] = useState(null);
  const load = async () => {
    const c = await api.get("/admin/checklist"); setItems(c.data.items);
    const s = await api.get("/admin/settings/launch"); setState(s.data.value || {});
    const st = await api.get("/admin/stats"); setStats(st.data);
  };
  useEffect(() => { load(); }, []);
  const toggle = async (id, done) => { await api.patch(`/admin/checklist/${id}`, { done: !done }); load(); };
  const launch = async () => {
    if (!window.confirm("Launch NOWCOMMAND now? This starts the 21-day $44 founder window.")) return;
    try { await api.post("/admin/launch"); toast.success("LAUNCHED."); load(); }
    catch { toast.error("Launch failed"); }
  };
  if (!items || !state || !stats) return null;
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <div className="space-y-8">
      <div className="panel p-8">
        <div className="overline mb-3">// LAUNCH WIZARD</div>
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div>
            <h2 className="font-display text-4xl text-cream">{state.launched ? "Launched" : `You're ${pct}% ready.`}</h2>
            <p className="text-textMuted mt-2">{state.launched ? `Promo window ends ${fmt.date(new Date(new Date(state.launch_date).getTime() + state.promo_days * 86400000).toISOString())}.` : "Complete each step. When all checks are green, press LAUNCH."}</p>
          </div>
          <div className="font-display text-6xl text-gold">{done}/{items.length}</div>
        </div>
        <div className="h-2 bg-borderGold mt-6 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-gold transition-all duration-700" style={{ width: `${pct}%` }}></div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-borderGold">
        {[
          { l: "Active members", v: stats.members_active, sub: `${stats.members_full} sovereign / ${stats.members_foundational} foundational` },
          { l: "Drops published", v: stats.drops_published, sub: `${stats.drops} total` },
          { l: "Articles published", v: stats.articles_published, sub: `${stats.vault_articles} vault / ${stats.articles - stats.articles_published} drafts` },
          { l: "Leads + Waitlist", v: stats.leads + stats.waitlist, sub: `${stats.leads} optins / ${stats.waitlist} waitlist` },
        ].map((s, i) => (
          <div key={i} className="bg-void p-6">
            <div className="overline mb-2">{s.l}</div>
            <div className="font-display text-4xl text-cream">{s.v}</div>
            <div className="text-xs font-mono text-textDim mt-2">{s.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-display text-2xl text-cream mb-4">Step-by-step</h3>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className={`panel p-5 flex items-start gap-4 ${it.done ? "opacity-60" : ""}`}>
              <button data-testid={`wiz-check-${it.id}`} onClick={() => toggle(it.id, it.done)} className="shrink-0 mt-1">
                {it.done ? <CheckSquare className="w-6 h-6 text-gold"/> : <Square className="w-6 h-6 text-textMuted hover:text-gold"/>}
              </button>
              <div className="flex-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className={`font-display text-xl ${it.done ? "line-through text-textMuted" : "text-cream"}`}>{idx + 1}. {it.title}</div>
                </div>
                {it.description && <div className="text-sm text-textMuted mt-1">{it.description}</div>}
                {it.link && (() => {
                  const m = it.link.match(/tab=(.+)/);
                  const tabId = m ? m[1] : null;
                  return tabId ? (
                    <button data-testid={`wiz-jump-${it.id}`} onClick={() => onJump(tabId)} className="overline text-gold hover:text-goldHi mt-3 flex items-center gap-1">Open this section <ChevronRight className="w-3 h-3"/></button>
                  ) : null;
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!state.launched && (
        <div className="panel p-8 border-gold">
          <h3 className="font-display text-3xl text-cream">Ready to flip the switch?</h3>
          <p className="text-textMuted mt-2">{done < items.length ? `Recommended: finish all ${items.length} steps first. You have ${items.length - done} left.` : "All checks green. Press launch."}</p>
          <button data-testid="wizard-launch-button" onClick={launch} className="btn-gold mt-6"><Rocket className="w-4 h-4"/> PRESS LAUNCH</button>
        </div>
      )}
    </div>
  );
}

/* ----------------- CHECKLIST ----------------- */
function Checklist() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const load = () => api.get("/admin/checklist").then((r) => setItems(r.data.items));
  useEffect(() => { load(); }, []);
  const toggle = async (id, done) => { await api.patch(`/admin/checklist/${id}`, { done: !done }); load(); };
  const add = async (e) => { e.preventDefault(); if (!title.trim()) return; await api.post("/admin/checklist", { title, description: desc }); setTitle(""); setDesc(""); load(); };
  const done = items.filter((i) => i.done).length;
  return (
    <div>
      <div className="overline mb-3">// DELIVERABLE CHECKLIST &middot; {done}/{items.length} complete</div>
      <div className="space-y-2 mb-8">
        {items.map((it) => (
          <button key={it.id} data-testid={`check-${it.id}`} onClick={() => toggle(it.id, it.done)} className={`w-full text-left panel p-4 flex gap-4 items-start ${it.done ? "opacity-50" : ""}`}>
            {it.done ? <CheckSquare className="w-5 h-5 text-gold mt-0.5"/> : <Square className="w-5 h-5 text-textMuted mt-0.5"/>}
            <div>
              <div className={`font-display text-xl ${it.done ? "line-through text-textMuted" : "text-cream"}`}>{it.title}</div>
              <div className="text-sm text-textMuted">{it.description}</div>
              {it.link && <div className="overline mt-1">{it.link}</div>}
            </div>
          </button>
        ))}
      </div>
      <form onSubmit={add} className="panel p-5">
        <div className="overline mb-3">// ADD ITEM</div>
        <input data-testid="checklist-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <input data-testid="checklist-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" />
        <button data-testid="checklist-add" type="submit" className="btn-gold mt-4"><Plus className="w-4 h-4"/> Add item</button>
      </form>
    </div>
  );
}

/* ----------------- DROPS ----------------- */
function DropForm({ initial, onSaved, onCancel }) {
  const [d, setD] = useState(initial || { title: "", body_md: "", media_url: "", foundational: false, scheduled_for: "", insight_preview: "", quick_win: false, alacarte_price_cents: "", tags: [], youtube_url: "", transcript_md: "", related_links: [], community_announcement: "" });
  const save = async (e) => {
    e.preventDefault();
    const payload = { ...d };
    if (payload.alacarte_price_cents === "" || payload.alacarte_price_cents == null) payload.alacarte_price_cents = null;
    else payload.alacarte_price_cents = Number(payload.alacarte_price_cents);
    if (!payload.scheduled_for) payload.scheduled_for = null;
    try {
      if (initial?.id) await api.patch(`/admin/drops/${initial.id}`, payload);
      else await api.post("/admin/drops", payload);
      toast.success(initial?.id ? "Updated" : "Created");
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  const addLink = () => setD({ ...d, related_links: [...(d.related_links || []), { title: "", url: "" }] });
  const updLink = (i, k, v) => { const arr = [...(d.related_links || [])]; arr[i] = { ...arr[i], [k]: v }; setD({ ...d, related_links: arr }); };
  const delLink = (i) => { const arr = [...(d.related_links || [])]; arr.splice(i, 1); setD({ ...d, related_links: arr }); };
  return (
    <form onSubmit={save} className="panel p-6 space-y-4">
      <div><label className="overline">// TITLE</label><input data-testid="drop-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required /></div>
      <div><label className="overline">// INSIGHT PREVIEW</label><input value={d.insight_preview} onChange={(e) => setD({ ...d, insight_preview: e.target.value })} placeholder="Teaser members see while it's upcoming" /></div>
      <div><label className="overline">// YOUTUBE URL (unlisted is fine — embeds with full controls)</label><input data-testid="drop-youtube" value={d.youtube_url || ""} onChange={(e) => setD({ ...d, youtube_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></div>
      <div><label className="overline">// COVER IMAGE URL (used if no YouTube)</label><input value={d.media_url || ""} onChange={(e) => setD({ ...d, media_url: e.target.value })} placeholder="https://..." /></div>
      <div><label className="overline">// BODY (markdown — full body shown on the drop page)</label><textarea rows={10} value={d.body_md} onChange={(e) => setD({ ...d, body_md: e.target.value })} required/></div>
      <div><label className="overline">// TRANSCRIPT (optional — collapsible on drop page)</label><textarea rows={5} value={d.transcript_md || ""} onChange={(e) => setD({ ...d, transcript_md: e.target.value })} placeholder="Paste the YouTube transcript here"/></div>
      <div>
        <label className="overline">// RELATED LINKS</label>
        <div className="space-y-2 mt-2">
          {(d.related_links || []).map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.title || ""} onChange={(e) => updLink(i, "title", e.target.value)} placeholder="Title" className="flex-1"/>
              <input value={l.url || ""} onChange={(e) => updLink(i, "url", e.target.value)} placeholder="https://..." className="flex-1"/>
              <button type="button" onClick={() => delLink(i)} className="btn-ghost text-xs !border-ruby !text-ruby">×</button>
            </div>
          ))}
          <button type="button" onClick={addLink} className="btn-ghost text-xs"><Plus className="w-3 h-3"/>Add link</button>
        </div>
      </div>
      <div>
        <label className="overline">// COMMUNITY ANNOUNCEMENT (becomes a pinned gold-banner post when this drop publishes)</label>
        <textarea data-testid="drop-announcement" rows={3} value={d.community_announcement || ""} onChange={(e) => setD({ ...d, community_announcement: e.target.value })} placeholder="A short message that lands in the community feed with a gold banner the moment this drop publishes."/>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="overline">// SCHEDULED FOR</label><input type="datetime-local" value={d.scheduled_for ? d.scheduled_for.slice(0, 16) : ""} onChange={(e) => setD({ ...d, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : "" })}/></div>
        <div><label className="overline">// A-LA-CARTE CENTS</label><input type="number" value={d.alacarte_price_cents ?? ""} onChange={(e) => setD({ ...d, alacarte_price_cents: e.target.value })} placeholder="2700 = $27"/></div>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={d.foundational} onChange={(e) => setD({ ...d, foundational: e.target.checked })} style={{width:16,height:16}}/> Foundational</label>
        <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={d.quick_win} onChange={(e) => setD({ ...d, quick_win: e.target.checked })} style={{width:16,height:16}}/> Quick Win</label>
      </div>
      <div className="flex gap-3 pt-3">
        <button type="submit" className="btn-gold">{initial?.id ? "Update drop" : "Create drop"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>}
      </div>
    </form>
  );
}

function Drops() {
  const [drops, setDrops] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const load = () => api.get("/admin/drops").then((r) => setDrops(r.data.drops));
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (!window.confirm("Delete drop?")) return; await api.delete(`/admin/drops/${id}`); load(); };
  const publishNow = async (id) => { await api.patch(`/admin/drops/${id}`, { published: true, scheduled_for: null }); load(); };
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="overline">// {drops.length} drops total</div>
        {!creating && !editing && <button data-testid="new-drop" onClick={() => setCreating(true)} className="btn-gold"><Plus className="w-4 h-4"/> New drop</button>}
      </div>
      {creating && <div className="mb-6"><DropForm onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} /></div>}
      {editing && <div className="mb-6"><DropForm initial={editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} /></div>}
      <div className="space-y-3">
        {drops.map((d) => (
          <div key={d.id} className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="overline mb-1">{d.published ? "PUBLISHED" : d.scheduled_for ? "SCHEDULED" : "DRAFT"} {d.foundational && "// FOUNDATIONAL"} {d.quick_win && "// QUICK WIN"} {d.alacarte_price_cents && `// A-LA-CARTE ${fmt.money(d.alacarte_price_cents)}`}</div>
                <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                <div className="text-xs font-mono text-textDim mt-1">{d.published_at ? `Pub: ${fmt.datetime(d.published_at)}` : d.scheduled_for ? `Sched: ${fmt.datetime(d.scheduled_for)}` : ""}</div>
              </div>
              <div className="flex gap-2">
                {!d.published && <button onClick={() => publishNow(d.id)} className="btn-ghost text-xs !py-2 !px-3">Publish now</button>}
                <button onClick={() => setEditing(d)} className="btn-ghost text-xs !py-2 !px-3">Edit</button>
                <button onClick={() => del(d.id)} className="btn-ghost text-xs !py-2 !px-3 !border-ruby !text-ruby">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------- ARTICLES ----------------- */
function ArticleForm({ initial, onSaved, onCancel }) {
  const [a, setA] = useState(initial || {
    title: "", slug: "", subtitle: "", excerpt: "", body_md: "", cover_image_url: "",
    tags: [], seo_title: "", seo_description: "", og_image_url: "", vault: false,
    scheduled_for: "", sales_copy_md: "", optin_headline: "", optin_cta: "",
  });
  const [tagInput, setTagInput] = useState((a.tags || []).join(", "));
  const save = async (e) => {
    e.preventDefault();
    const payload = { ...a, tags: tagInput.split(",").map((s) => s.trim()).filter(Boolean) };
    if (!payload.scheduled_for) payload.scheduled_for = null;
    try {
      if (initial?.id) await api.patch(`/admin/articles/${initial.id}`, payload);
      else await api.post("/admin/articles", payload);
      toast.success(initial?.id ? "Updated" : "Created");
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };
  return (
    <form onSubmit={save} className="panel p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="overline">// TITLE</label><input data-testid="article-title" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} required/></div>
        <div><label className="overline">// SLUG (auto if blank)</label><input value={a.slug} onChange={(e) => setA({ ...a, slug: e.target.value })} placeholder="auto-from-title"/></div>
      </div>
      <div><label className="overline">// SUBTITLE</label><input value={a.subtitle} onChange={(e) => setA({ ...a, subtitle: e.target.value })}/></div>
      <div><label className="overline">// EXCERPT (1-2 sentences shown on cards/SEO)</label><textarea rows={2} value={a.excerpt} onChange={(e) => setA({ ...a, excerpt: e.target.value })}/></div>
      <div><label className="overline">// COVER IMAGE URL</label><input value={a.cover_image_url} onChange={(e) => setA({ ...a, cover_image_url: e.target.value })} placeholder="https://..."/></div>
      <div><label className="overline">// BODY (markdown)</label><textarea data-testid="article-body" rows={14} value={a.body_md} onChange={(e) => setA({ ...a, body_md: e.target.value })} required/></div>
      <div><label className="overline">// TAGS (comma-separated)</label><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="money, kairos, dominion"/></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="overline">// SEO TITLE</label><input value={a.seo_title} onChange={(e) => setA({ ...a, seo_title: e.target.value })} placeholder="Defaults to title"/></div>
        <div><label className="overline">// OG IMAGE URL</label><input value={a.og_image_url} onChange={(e) => setA({ ...a, og_image_url: e.target.value })} placeholder="Defaults to cover"/></div>
      </div>
      <div><label className="overline">// SEO DESCRIPTION</label><textarea rows={2} value={a.seo_description} onChange={(e) => setA({ ...a, seo_description: e.target.value })}/></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="overline">// SCHEDULED FOR</label><input type="datetime-local" value={a.scheduled_for ? a.scheduled_for.slice(0,16) : ""} onChange={(e) => setA({ ...a, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : "" })}/></div>
        <div className="flex items-end gap-3"><label className="flex items-center gap-2 text-sm text-textMuted"><input data-testid="article-vault" type="checkbox" checked={a.vault} onChange={(e) => setA({ ...a, vault: e.target.checked })} style={{width:16,height:16}}/> Vault (members only)</label></div>
      </div>
      <div className="pt-4 border-t border-borderGold">
        <div className="overline mb-3">// SALES BLOCK (shown at bottom of FREE articles only)</div>
        <div><label className="overline">// CUSTOM SALES COPY</label><textarea rows={4} value={a.sales_copy_md} onChange={(e) => setA({ ...a, sales_copy_md: e.target.value })} placeholder="Custom pitch shown to readers of this article. Speak directly from this article's topic to the offer."/></div>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div><label className="overline">// OPTIN HEADLINE</label><input value={a.optin_headline} onChange={(e) => setA({ ...a, optin_headline: e.target.value })} placeholder="STAY ON THE LIST"/></div>
          <div><label className="overline">// OPTIN CTA</label><input value={a.optin_cta} onChange={(e) => setA({ ...a, optin_cta: e.target.value })} placeholder="Get the Tuesday transmission"/></div>
        </div>
      </div>
      <div className="flex gap-3 pt-3">
        <button data-testid="article-save" type="submit" className="btn-gold">{initial?.id ? "Update article" : "Create article"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>}
      </div>
    </form>
  );
}

function Articles() {
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const load = () => api.get("/admin/articles").then((r) => setArticles(r.data.articles));
  useEffect(() => { load(); }, []);
  const del = async (id) => { if (!window.confirm("Delete article?")) return; await api.delete(`/admin/articles/${id}`); load(); };
  const publishNow = async (id) => { await api.patch(`/admin/articles/${id}`, { published: true, scheduled_for: null }); load(); };
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="overline">// {articles.length} articles &middot; {articles.filter(a => a.vault).length} vault</div>
        {!creating && !editing && <button data-testid="new-article" onClick={() => setCreating(true)} className="btn-gold"><Plus className="w-4 h-4"/> New article</button>}
      </div>
      {creating && <div className="mb-6"><ArticleForm onSaved={() => { setCreating(false); load(); }} onCancel={() => setCreating(false)} /></div>}
      {editing && <div className="mb-6"><ArticleForm initial={editing} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} /></div>}
      <div className="space-y-3">
        {articles.map((a) => (
          <div key={a.id} className="panel p-5" data-testid={`admin-article-${a.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="overline mb-1">{a.published ? "PUBLISHED" : a.scheduled_for ? "SCHEDULED" : "DRAFT"} {a.vault && "// VAULT"} {a.tags?.length ? `// ${a.tags.join(" / ")}` : ""}</div>
                <h3 className="font-display text-2xl text-cream truncate">{a.title}</h3>
                <div className="text-xs font-mono text-textDim mt-1 flex flex-wrap gap-3">
                  <span>/{a.slug}</span>
                  {a.published_at && <span>Pub: {fmt.datetime(a.published_at)}</span>}
                  {a.scheduled_for && !a.published && <span>Sched: {fmt.datetime(a.scheduled_for)}</span>}
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{a.views || 0}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {!a.published && <button onClick={() => publishNow(a.id)} className="btn-ghost text-xs !py-2 !px-3">Publish now</button>}
                <a href={a.vault ? `/vault/${a.slug}` : `/blog/${a.slug}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs !py-2 !px-3"><ExternalLink className="w-3 h-3"/></a>
                <button onClick={() => setEditing(a)} className="btn-ghost text-xs !py-2 !px-3"><Edit3 className="w-3 h-3"/></button>
                <button onClick={() => del(a.id)} className="btn-ghost text-xs !py-2 !px-3 !border-ruby !text-ruby">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {articles.length === 0 && <p className="text-textMuted">No articles yet. Write the first one.</p>}
      </div>
    </div>
  );
}

/* ----------------- MEMBERS / LEADS ----------------- */
function Members() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/members").then((r) => setData(r.data)); }, []);
  if (!data) return null;
  return (
    <div>
      <div className="overline mb-3">// {data.count_active} active &middot; {data.members.length} total</div>
      <div className="overflow-x-auto panel">
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b border-borderGold"><th className="p-3 overline">Email</th><th className="p-3 overline">Name</th><th className="p-3 overline">Tier</th><th className="p-3 overline">Joined</th><th className="p-3 overline">Last login</th></tr></thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} className="border-b border-borderGold/50">
                <td className="p-3 text-cream">{m.email}</td>
                <td className="p-3 text-textMuted">{m.name}</td>
                <td className="p-3"><span className="overline">{m.tier}</span></td>
                <td className="p-3 text-xs font-mono text-textDim">{fmt.date(m.created_at)}</td>
                <td className="p-3 text-xs font-mono text-textDim">{fmt.date(m.last_login)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Leads() {
  const [data, setData] = useState(null);
  const [wl, setWl] = useState(null);
  useEffect(() => {
    api.get("/admin/leads").then((r) => setData(r.data));
    api.get("/admin/waitlist").then((r) => setWl(r.data));
  }, []);
  if (!data || !wl) return null;
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-px bg-borderGold mb-8">
        <div className="bg-void p-6">
          <div className="overline mb-2">// LEADS &middot; BLOG OPTINS</div>
          <div className="font-display text-5xl text-cream">{data.count}</div>
        </div>
        <div className="bg-void p-6">
          <div className="overline mb-2">// WAITLIST</div>
          <div className="font-display text-5xl text-cream">{wl.count}</div>
        </div>
      </div>
      <h3 className="font-display text-xl text-cream mb-3">Recent leads</h3>
      <div className="overflow-x-auto panel"><table className="w-full text-sm"><thead><tr className="text-left border-b border-borderGold"><th className="p-3 overline">Email</th><th className="p-3 overline">Source</th><th className="p-3 overline">When</th></tr></thead><tbody>
        {data.leads.map((l) => (
          <tr key={l.id} className="border-b border-borderGold/50"><td className="p-3 text-cream">{l.email}</td><td className="p-3 text-textMuted">{l.source}</td><td className="p-3 text-xs font-mono text-textDim">{fmt.datetime(l.created_at)}</td></tr>
        ))}
      </tbody></table></div>
    </div>
  );
}

/* ----------------- SUMMARY / COMMUNITY / REMINDERS (unchanged from MVP) ----------------- */
function Summary() {
  const [m1, setM1] = useState(""); const [m2, setM2] = useState(""); const [m3, setM3] = useState("");
  const [i1, setI1] = useState(""); const [i2, setI2] = useState(""); const [i3, setI3] = useState("");
  const [resource, setResource] = useState("");
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/monthly-summary").then((r) => setList(r.data.summaries));
  useEffect(() => { load(); }, []);
  const submit = async (sendNow) => {
    const matters = [m1, m2, m3].filter((s) => s.trim()); const ignore = [i1, i2, i3].filter((s) => s.trim());
    if (matters.length === 0 || !resource.trim()) { toast.error("Need at least 1 bullet and 1 resource"); return; }
    await api.post("/admin/monthly-summary", { matters, ignore, one_resource: resource, send_now: sendNow });
    toast.success(sendNow ? "Sent to all members" : "Saved");
    setM1(""); setM2(""); setM3(""); setI1(""); setI2(""); setI3(""); setResource("");
    load();
  };
  return (
    <div>
      <div className="overline mb-3">// MONTHLY EXECUTIVE SUMMARY</div>
      <div className="panel p-6 space-y-4">
        <div><label className="overline">// 3 BULLETS &middot; WHAT MATTERS</label>
          <input value={m1} onChange={(e) => setM1(e.target.value)} placeholder="Bullet 1" />
          <input value={m2} onChange={(e) => setM2(e.target.value)} placeholder="Bullet 2" />
          <input value={m3} onChange={(e) => setM3(e.target.value)} placeholder="Bullet 3" /></div>
        <div><label className="overline">// WHAT TO IGNORE</label>
          <input value={i1} onChange={(e) => setI1(e.target.value)} placeholder="Ignore 1" />
          <input value={i2} onChange={(e) => setI2(e.target.value)} placeholder="Ignore 2" />
          <input value={i3} onChange={(e) => setI3(e.target.value)} placeholder="Ignore 3" /></div>
        <div><label className="overline">// THE ONE RESOURCE</label><input value={resource} onChange={(e) => setResource(e.target.value)} placeholder="The one resource they need this month" /></div>
        <div className="flex gap-3">
          <button onClick={() => submit(true)} className="btn-gold"><Send className="w-4 h-4"/> Send to all members</button>
          <button onClick={() => submit(false)} className="btn-ghost">Save as draft</button>
        </div>
      </div>
      <h3 className="font-display text-2xl text-cream mt-10 mb-4">Sent / scheduled</h3>
      <div className="space-y-2">{list.map((s) => (<div key={s.id} className="panel p-4"><div className="overline">{s.sent ? `SENT ${fmt.datetime(s.sent_at)}` : "DRAFT"}</div><div className="text-cream mt-2">{s.matters.join(" · ")}</div></div>))}</div>
    </div>
  );
}

function CommunityAdmin() {
  const [manifesto, setManifesto] = useState("");
  const [rules, setRules] = useState("");
  useEffect(() => {
    api.get("/admin/settings/manifesto").then((r) => setManifesto(r.data.value?.body_md || ""));
    api.get("/admin/settings/community_rules").then((r) => setRules(r.data.value?.body_md || ""));
  }, []);
  return (
    <div className="space-y-8">
      <div className="panel p-6">
        <div className="overline mb-3">// ONE PAGE MANIFESTO</div>
        <textarea rows={10} value={manifesto} onChange={(e) => setManifesto(e.target.value)} />
        <button onClick={async () => { await api.post("/admin/manifesto", { body_md: manifesto }); toast.success("Manifesto saved"); }} className="btn-gold mt-4">Save manifesto</button>
      </div>
      <div className="panel p-6">
        <div className="overline mb-3">// HOUSE RULES</div>
        <textarea rows={8} value={rules} onChange={(e) => setRules(e.target.value)} />
        <button onClick={async () => { await api.post("/admin/community-rules", { body_md: rules }); toast.success("Rules saved"); }} className="btn-gold mt-4">Save rules</button>
      </div>
    </div>
  );
}

function Reminders() {
  const [data, setData] = useState(null);
  const [title, setTitle] = useState(""); const [when, setWhen] = useState("");
  const load = () => api.get("/admin/reminders").then((r) => setData(r.data));
  useEffect(() => { load(); }, []);
  if (!data) return null;
  const logPost = async (kind) => { await api.post("/admin/reminders/log-post", { kind }); load(); };
  const add = async (e) => { e.preventDefault(); await api.post("/admin/reminders", { title, when: when ? new Date(when).toISOString() : null }); setTitle(""); setWhen(""); load(); };
  const toggle = async (id, done) => { await api.patch(`/admin/reminders/${id}`, { completed: !done }); load(); };
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-px bg-borderGold mb-8">
        <div className="bg-void p-6">
          <div className="overline mb-3">// TODAY'S SALES POSTS</div>
          <div className="font-display text-5xl text-cream">{data.today.sales_posts_done} / {data.today.sales_posts_target}</div>
          <p className="text-textMuted text-sm mt-2">Post 2 sales angles per day. Tap below each time.</p>
          <button onClick={() => logPost("sales")} className="btn-gold mt-4"><Plus className="w-4 h-4"/> Log sales post</button>
        </div>
        <div className="bg-void p-6">
          <div className="overline mb-3">// TODAY'S NURTURE POSTS</div>
          <div className="font-display text-5xl text-cream">{data.today.nurture_posts_done} / {data.today.nurture_posts_target}</div>
          <p className="text-textMuted text-sm mt-2">2 free nurturing posts into the funnel group per day.</p>
          <button onClick={() => logPost("nurture")} className="btn-ghost mt-4"><Plus className="w-4 h-4"/> Log nurture post</button>
        </div>
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-3 mb-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" className="flex-1 min-w-[260px]"/>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="max-w-[220px]"/>
        <button type="submit" className="btn-gold"><Plus className="w-4 h-4"/> Add</button>
      </form>
      <div className="space-y-2">
        {data.items.map((r) => (
          <button key={r.id} onClick={() => toggle(r.id, r.completed)} className={`block w-full text-left panel p-4 ${r.completed ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">{r.completed ? <CheckSquare className="w-5 h-5 text-gold"/> : <Square className="w-5 h-5 text-textMuted"/>}
              <div><div className={`${r.completed ? "line-through text-textMuted" : "text-cream"}`}>{r.title}</div>{r.when && <div className="text-xs font-mono text-textDim">{fmt.datetime(r.when)}</div>}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----------------- EMAIL TEMPLATES (preview + test send) ----------------- */
function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const load = () => api.get("/admin/email-templates").then((r) => { setTemplates(r.data.templates); if (!selected && r.data.templates.length) setSelected(r.data.templates[0]); });
  useEffect(() => { load(); }, []);
  const sendTest = async (key) => {
    const r = await api.post(`/admin/email-templates/${key}/send-test`);
    toast.success(`Test email ${r.data.status}`);
    load();
  };
  return (
    <div className="grid lg:grid-cols-3 gap-px bg-borderGold">
      <div className="bg-void p-4 lg:col-span-1">
        <div className="overline mb-3">// {templates.length} PRE-WRITTEN TEMPLATES</div>
        <div className="space-y-1">
          {templates.map((t) => (
            <button key={t.key} data-testid={`email-tpl-${t.key}`} onClick={() => setSelected(t)} className={`w-full text-left p-3 border-l-2 ${selected?.key === t.key ? "border-gold bg-surface" : "border-transparent hover:border-borderGoldHi"}`}>
              <div className="text-cream text-sm">{t.label}</div>
              <div className="text-xs font-mono text-textDim mt-1">{t.key}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-void p-6 lg:col-span-2">
        {selected ? (
          <>
            <div className="overline mb-2">// {selected.key}</div>
            <h3 className="font-display text-3xl text-cream">{selected.label}</h3>
            <p className="text-textMuted text-sm mt-2">{selected.trigger}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button data-testid={`email-test-${selected.key}`} onClick={() => sendTest(selected.key)} className="btn-gold"><Send className="w-4 h-4"/> Send test to me</button>
              {selected.variables?.length > 0 && <div className="overline self-center">VARS: {selected.variables.join(", ")}</div>}
            </div>
            <div className="overline mt-8 mb-2">// SUBJECT PREVIEW</div>
            <div className="panel p-3 text-cream">{selected.preview_subject}</div>
            <div className="overline mt-6 mb-2">// HTML PREVIEW</div>
            <iframe srcDoc={selected.preview_html} title="preview" className="w-full h-[600px] bg-cream"/>
          </>
        ) : <p className="text-textMuted">Pick a template.</p>}
      </div>
    </div>
  );
}

/* ----------------- OUTBOX / LAUNCH (legacy) ----------------- */
function Outbox() {
  const [emails, setEmails] = useState([]);
  useEffect(() => { api.get("/admin/outbox").then((r) => setEmails(r.data.emails)); }, []);
  return (
    <div>
      <div className="overline mb-3">// EMAIL LOG &middot; everything queued or sent</div>
      <div className="space-y-2">
        {emails.map((e) => (
          <div key={e.id} className="panel p-4">
            <div className="flex items-center justify-between"><div><div className="text-cream">{e.subject}</div><div className="text-xs font-mono text-textDim">{e.to} &middot; {e.kind}</div></div><span className="overline">{e.status}</span></div>
          </div>
        ))}
        {emails.length === 0 && <p className="text-textMuted">No emails yet.</p>}
      </div>
    </div>
  );
}

function LaunchPanel() {
  const [state, setState] = useState(null);
  const load = async () => { const s = await api.get("/admin/settings/launch"); setState(s.data.value || {}); };
  useEffect(() => { load(); }, []);
  const launch = async () => {
    if (!window.confirm("Launch NOWCOMMAND now? Starts the 21-day $44 founder window.")) return;
    try { const r = await api.post("/admin/launch"); toast.success("Launched"); setState({ launched: true, launch_date: r.data.launch_date, promo_days: r.data.promo_days }); } catch { toast.error("Launch failed"); }
  };
  const triggerWB = async () => { await api.post("/admin/trigger-winback"); toast.success("Win-back swept"); };
  const triggerDrops = async () => { await api.post("/admin/trigger-drops"); toast.success("Drops swept"); };
  const regen = async () => { await api.post("/admin/regenerate-pdf"); toast.success("Activation Codes PDF regenerated"); };
  const regenBook = async () => { await api.post("/admin/regenerate-welcome-book"); toast.success("Welcome book PDF regenerated"); };
  if (!state) return null;
  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <div className="overline mb-3">// LAUNCH STATUS</div>
        {state.launched ? (
          <><h2 className="font-display text-3xl text-cream">Launched on {fmt.date(state.launch_date)}</h2><p className="text-textMuted mt-2">$44 founder window for {state.promo_days} days. Auto-switches to $77/mo after.</p></>
        ) : (
          <><h2 className="font-display text-3xl text-cream">Not launched yet</h2><button onClick={launch} className="btn-gold mt-6"><Rocket className="w-4 h-4"/> Press LAUNCH</button></>
        )}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5"><h3 className="font-display text-xl text-cream mb-2">Sweep scheduled drops & articles</h3><button onClick={triggerDrops} className="btn-ghost mt-3 text-xs">Run now</button></div>
        <div className="panel p-5"><h3 className="font-display text-xl text-cream mb-2">Trigger win-back</h3><button onClick={triggerWB} className="btn-ghost mt-3 text-xs">Run now</button></div>
        <div className="panel p-5"><h3 className="font-display text-xl text-cream mb-2">Regenerate Activation Codes PDF</h3><button onClick={regen} className="btn-ghost mt-3 text-xs">Regenerate</button></div>
        <div className="panel p-5"><h3 className="font-display text-xl text-cream mb-2">Regenerate Welcome Book PDF</h3><p className="text-textMuted text-xs">"Dominion Over Mammon & The Spirit of Delay"</p><button onClick={regenBook} className="btn-ghost mt-3 text-xs">Regenerate</button></div>
      </div>
      <DominionManager />
    </div>
  );
}

/* ----------------- DOMINION LIBRARY MANAGER ----------------- */
function DominionManager() {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState("");
  const load = () => api.get("/admin/dominion").then((r) => setD(r.data.dominion));
  useEffect(() => { load(); }, []);
  if (!d) return null;
  const save = async (patch) => {
    const next = { ...d, ...patch }; setD(next);
    await api.post("/admin/dominion", patch); toast.success("Dominion library updated");
  };
  const uploadFile = async (e, field, purpose) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 60 * 1024 * 1024) { toast.error("Max 60MB. For large audiobooks, paste a hosted URL instead."); return; }
    setBusy(field);
    try {
      const data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
      const resp = await api.post("/upload/file", { data, purpose });
      await save({ [field]: resp.data.url });
      toast.success("Uploaded & unlocked for members");
    } catch (err) { toast.error(err?.response?.data?.detail || "Upload failed"); } finally { setBusy(""); }
  };
  return (
    <div className="panel p-6" data-testid="dominion-manager">
      <div className="overline mb-1">// DOMINION LIBRARY</div>
      <p className="text-textMuted text-sm mb-5">Upload the book PDF and the audiobook. Until you upload, members see "Forthcoming". The moment a file (or URL) is set, it unlocks automatically on every member dashboard.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Book */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xl text-cream">The Book (PDF)</h4>
            <span className="overline">{d.book_status === "available" ? "AVAILABLE" : "FORTHCOMING"}</span>
          </div>
          <p className="text-xs text-textDim">Leave blank to ship the auto-generated welcome book. Upload to replace it.</p>
          <label className="btn-ghost text-xs cursor-pointer inline-flex"><input type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadFile(e, "book_url", "dominion_book")}/>{busy === "book_url" ? "Uploading…" : "Upload book PDF"}</label>
          <input value={d.book_url || ""} onChange={(e) => setD({ ...d, book_url: e.target.value })} onBlur={() => save({ book_url: d.book_url })} placeholder="…or paste a hosted PDF URL"/>
          <select value={d.book_status} onChange={(e) => save({ book_status: e.target.value })}>
            <option value="available">Available (members can read)</option>
            <option value="forthcoming">Forthcoming (hidden)</option>
          </select>
        </div>

        {/* Audiobook */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xl text-cream">The Audiobook</h4>
            <span className="overline">{(d.audiobook_status === "available" && d.audiobook_url) ? "AVAILABLE" : "FORTHCOMING"}</span>
          </div>
          <p className="text-xs text-textDim">For large files, hosting elsewhere and pasting the URL is most reliable.</p>
          <label className="btn-ghost text-xs cursor-pointer inline-flex"><input type="file" accept="audio/*" className="hidden" onChange={(e) => uploadFile(e, "audiobook_url", "dominion_audio")}/>{busy === "audiobook_url" ? "Uploading…" : "Upload audio file"}</label>
          <input value={d.audiobook_url || ""} onChange={(e) => setD({ ...d, audiobook_url: e.target.value })} onBlur={() => save({ audiobook_url: d.audiobook_url })} placeholder="…or paste a hosted audio URL (mp3/m4a)"/>
          <select value={d.audiobook_status} onChange={(e) => save({ audiobook_status: e.target.value })}>
            <option value="available">Available (members can listen)</option>
            <option value="forthcoming">Forthcoming (shows as coming soon)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

/* ----------------- TESTIMONIALS ADMIN ----------------- */
function TestimonialsAdmin() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/admin/testimonials").then((r) => setItems(r.data.testimonials));
  useEffect(() => { load(); }, []);
  const moderate = async (id, status) => { await api.patch(`/admin/testimonials/${id}`, { status }); toast.success(status); load(); };
  return (
    <div>
      <div className="overline mb-3">// {items.length} testimonials · {items.filter(t => t.status === "pending").length} pending</div>
      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} data-testid={`adm-test-${t.id}`} className="panel p-5">
            <div className="overline mb-2">{t.status?.toUpperCase()} · {fmt.datetime(t.created_at)}</div>
            {t.headline && <div className="font-display text-xl text-gold">"{t.headline}"</div>}
            {t.image_url && <img src={t.image_url.startsWith("http") ? t.image_url : `${BACKEND_URL}${t.image_url}`} alt="" className="max-h-48 object-cover border border-borderGold mt-2"/>}
            <p className="text-cream/90 whitespace-pre-wrap mt-2">{t.body}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => moderate(t.id, "approved")} className="btn-ghost text-xs">Approve</button>
              <button onClick={() => moderate(t.id, "featured")} className="btn-gold text-xs">Feature</button>
              <button onClick={() => moderate(t.id, "rejected")} className="btn-ghost text-xs !border-ruby !text-ruby">Reject</button>
              <a href={`/u/${t.user_id}`} target="_blank" rel="noreferrer" className="overline self-center ml-2">from {t.user_name} →</a>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-textMuted">No testimonials yet.</p>}
      </div>
    </div>
  );
}

/* ----------------- AD COPY GENERATOR ----------------- */
function AdCopyTab() {
  const [type, setType] = useState("drop");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [variants, setVariants] = useState([]);
  const [publicFlag, setPublicFlag] = useState(true);
  useEffect(() => {
    const ep = type === "drop" ? "/admin/drops" : "/admin/articles";
    api.get(ep).then((r) => setItems(type === "drop" ? r.data.drops : r.data.articles));
    setSelected(null); setVariants([]);
  }, [type]);
  const generate = async () => {
    if (!selected) return;
    const ep = type === "drop" ? `/admin/ad-copy/drop/${selected.id}` : `/admin/ad-copy/article/${selected.id}`;
    const { data } = await api.post(ep, { public: publicFlag });
    setVariants(data.variants);
  };
  const copy = (t) => { navigator.clipboard.writeText(t); toast.success("Copied"); };
  return (
    <div>
      <div className="overline mb-3">// AD COPY GENERATOR · FB / IG / X / EMAIL READY</div>
      <p className="text-textMuted text-sm mb-6">Pick any drop or article. We'll surface 5 high-converting copy variants you can paste straight into your group, socials, or DMs.</p>
      <div className="flex gap-3 mb-4">
        <button onClick={() => setType("drop")} className={type === "drop" ? "btn-gold" : "btn-ghost"}>Drops</button>
        <button onClick={() => setType("article")} className={type === "article" ? "btn-gold" : "btn-ghost"}>Articles</button>
        <label className="flex items-center gap-2 text-sm text-textMuted ml-auto"><input type="checkbox" checked={publicFlag} onChange={(e) => setPublicFlag(e.target.checked)} style={{width:16,height:16}}/>Public funnel angle</label>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2 md:col-span-1">
          {items.map((d) => (
            <button key={d.id} data-testid={`adcopy-pick-${d.id}`} onClick={() => setSelected(d)} className={`block w-full text-left panel p-3 ${selected?.id === d.id ? "border-gold" : ""}`}>
              <div className="text-cream">{d.title}</div>
              <div className="overline mt-1">{d.published ? "PUBLISHED" : "DRAFT"}</div>
            </button>
          ))}
        </div>
        <div className="md:col-span-2 space-y-3">
          {selected ? (
            <>
              <button onClick={generate} className="btn-gold">Generate 5 variants</button>
              {variants.map((v, i) => (
                <div key={i} className="panel p-4">
                  <div className="overline mb-2">{v.platform}</div>
                  <pre className="whitespace-pre-wrap text-cream/95 text-sm font-body">{v.copy}</pre>
                  <button onClick={() => copy(v.copy)} className="btn-ghost text-xs mt-3"><Copy className="w-3 h-3"/>Copy</button>
                </div>
              ))}
            </>
          ) : <p className="text-textMuted text-sm">Pick a {type} on the left.</p>}
        </div>
      </div>
    </div>
  );
}

/* ----------------- STEWARD OF STEWARDS ----------------- */
function StewardOfStewards() {
  const [data, setData] = useState({ leaders: [], total: 0, total_payout_cents: 0 });
  useEffect(() => { api.get("/admin/members").then((r) => {
    const list = (r.data.members || []).filter((m) => (m.affiliate_earnings_cents || 0) > 0)
      .sort((a, b) => (b.affiliate_earnings_cents||0) - (a.affiliate_earnings_cents||0));
    setData({ leaders: list, total: list.length, total_payout_cents: list.reduce((s, m) => s + (m.affiliate_earnings_cents||0), 0) });
  }); }, []);
  return (
    <div>
      <div className="overline mb-3">// STEWARD OF STEWARDS · SUPPORT THE STEWARDS WHO SOW</div>
      <h2 className="font-display text-3xl text-cream">Lead the multipliers.</h2>
      <p className="text-textMuted mt-2 max-w-3xl">These are the members already bringing others through. Reach out personally — a one-line DM to your top stewards each week compounds faster than any ad spend.</p>
      <div className="grid sm:grid-cols-3 gap-px bg-borderGold mt-6">
        <div className="bg-void p-5"><div className="overline">// ACTIVE STEWARDS</div><div className="font-display text-4xl text-cream">{data.total}</div></div>
        <div className="bg-void p-5"><div className="overline">// TOTAL PAID OUT</div><div className="font-display text-4xl text-cream">{fmt.money(data.total_payout_cents)}</div></div>
        <div className="bg-void p-5"><div className="overline">// THIS WEEK'S ACTION</div><div className="text-cream mt-2">Send the top 3 stewards a personal voice note. Ask: "What's the next piece you wish you had to share?" Then build it.</div></div>
      </div>
      <h3 className="font-display text-2xl text-cream mt-10 mb-4">Leaderboard</h3>
      <div className="space-y-2">
        {data.leaders.map((m, i) => (
          <div key={m.id} className="panel p-4 flex items-center gap-4">
            <div className="font-display text-3xl text-gold w-10">#{i+1}</div>
            <div className="w-10 h-10 border border-borderGold bg-surface overflow-hidden">
              {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-gold">{(m.name||"?")[0]}</div>}
            </div>
            <div className="flex-1">
              <div className="text-cream font-medium">{m.name}</div>
              <div className="text-xs font-mono text-textDim">{m.email}</div>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-gold">{fmt.money(m.affiliate_earnings_cents||0)}</div>
              <a href={`/dm/${m.id}`} className="overline hover:text-gold">Send DM →</a>
            </div>
          </div>
        ))}
        {data.leaders.length === 0 && <p className="text-textMuted">No stewardships have generated payouts yet.</p>}
      </div>
      <div className="panel p-6 mt-10">
        <div className="overline mb-3">// WEEKLY PLAYBOOK</div>
        <ol className="space-y-2 text-cream/90">
          <li>1. DM your top 3 stewards. Thank them by name.</li>
          <li>2. Send them ONE ad-copy variant they can post today (from the Ad Copy tab).</li>
          <li>3. Tell them the next drop / article coming so they can pre-warm their list.</li>
          <li>4. Feature one steward's testimony as social proof this week.</li>
          <li>5. If a steward is near a milestone ($100, $500, $1k), call them.</li>
        </ol>
      </div>
    </div>
  );
}

/* ----------------- BRAND ----------------- */
function BrandTab() {
  const [b, setB] = useState(null);
  useEffect(() => { api.get("/public/brand").then((r) => setB(r.data)); }, []);
  if (!b) return null;
  const save = async () => {
    await api.post("/admin/brand", b);
    // apply live without reload
    const root = document.documentElement;
    if (b.primary_hex) root.style.setProperty("--brand-gold", b.primary_hex);
    if (b.primary_hi_hex) root.style.setProperty("--brand-gold-hi", b.primary_hi_hex);
    if (b.ink_hex) root.style.setProperty("--brand-cream", b.ink_hex);
    if (b.bg_hex) root.style.setProperty("--brand-void", b.bg_hex);
    if (b.surface_hex) root.style.setProperty("--brand-surface", b.surface_hex);
    if (b.border_hex) root.style.setProperty("--brand-border", b.border_hex);
    toast.success("Brand saved · applied live");
  };
  // Auto-derive harmonious ombre when primary changes
  const lighten = (hex, amt) => {
    const n = parseInt(hex.replace("#",""), 16);
    const r = Math.min(255, ((n >> 16) & 255) + amt);
    const g = Math.min(255, ((n >> 8) & 255) + amt);
    const bl = Math.min(255, (n & 255) + amt);
    return "#" + [r,g,bl].map(x => x.toString(16).padStart(2,"0")).join("");
  };
  const setPrimary = (hex) => setB({ ...b, primary_hex: hex, primary_hi_hex: lighten(hex, 18) });
  const colorField = (k, label, onChange) => (
    <div>
      <label className="overline">{label}</label>
      <div className="flex items-center gap-3 mt-2">
        <input type="color" value={b[k] || "#000000"} onChange={(e) => (onChange ? onChange(e.target.value) : setB({ ...b, [k]: e.target.value }))} style={{width:56,height:40,padding:0,border:"1px solid #332D21"}}/>
        <input value={b[k] || ""} onChange={(e) => (onChange ? onChange(e.target.value) : setB({ ...b, [k]: e.target.value }))} className="font-mono" style={{maxWidth:140}}/>
      </div>
    </div>
  );
  const fontOptions = ["Cormorant Garamond","Outfit","Inter","Playfair Display","Lora","DM Serif Display","Manrope","JetBrains Mono","Space Mono","Crimson Pro"];
  const fontField = (k, label) => (
    <div>
      <label className="overline">{label}</label>
      <select value={b[k] || ""} onChange={(e) => setB({ ...b, [k]: e.target.value })}>
        {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>
    </div>
  );
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="overline">// BRAND · APPLIED SITE-WIDE</div>
      <div><label className="overline">// SITE NAME</label><input value={b.site_name || ""} onChange={(e) => setB({ ...b, site_name: e.target.value })}/></div>
      <div><label className="overline">// TAGLINE</label><input value={b.tagline || ""} onChange={(e) => setB({ ...b, tagline: e.target.value })}/></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {colorField("primary_hex", "// PRIMARY (auto-derives hover)", setPrimary)}
        {colorField("primary_hi_hex", "// PRIMARY HOVER")}
        {colorField("ink_hex", "// TEXT")}
        {colorField("bg_hex", "// BACKGROUND")}
        {colorField("surface_hex", "// SURFACE")}
        {colorField("border_hex", "// BORDER")}
      </div>
      <div className="panel p-5">
        <div className="overline mb-3">// LIVE PREVIEW</div>
        <div style={{background:b.bg_hex,color:b.ink_hex,padding:24,borderRadius:0,border:`1px solid ${b.border_hex}`}}>
          <div style={{color:b.primary_hex,fontFamily:"JetBrains Mono",letterSpacing:"0.3em",fontSize:11,marginBottom:8}}>// {b.site_name?.toUpperCase()}</div>
          <div style={{fontFamily:b.display_font || "Cormorant Garamond",fontSize:32,lineHeight:1.1}}>The increase obeys the steward.</div>
          <button style={{background:b.primary_hex,color:b.bg_hex,padding:"12px 24px",marginTop:16,letterSpacing:"0.12em",textTransform:"uppercase",fontSize:12,fontFamily:b.body_font || "Outfit",border:0}}>Sample button</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-5">
        {fontField("display_font", "// DISPLAY FONT")}
        {fontField("body_font", "// BODY FONT")}
        {fontField("mono_font", "// MONO FONT")}
      </div>
      <div><label className="overline">// LOGO URL (optional)</label><input value={b.logo_url || ""} onChange={(e) => setB({ ...b, logo_url: e.target.value })}/></div>
      <button data-testid="brand-save" onClick={save} className="btn-gold">Save brand & apply live</button>
    </div>
  );
}

/* ----------------- PRICING ----------------- */
function PricingTab() {
  const [p, setP] = useState(null);
  useEffect(() => { api.get("/admin/pricing").then((r) => setP(r.data)); }, []);
  if (!p) return null;
  const save = async () => { await api.post("/admin/pricing", p); toast.success("Pricing saved (applies on next /pricing visit)"); };
  const dollarInput = (k, label) => (
    <div>
      <label className="overline">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-gold text-xl">$</span>
        <input type="number" step="0.01" value={(p[k] || 0) / 100} onChange={(e) => setP({ ...p, [k]: Math.round(Number(e.target.value) * 100) })}/>
      </div>
    </div>
  );
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="overline">// PRICING & OFFER VISIBILITY</div>
      <p className="text-textMuted text-sm">Enter dollar amounts. We auto-convert to cents for Stripe. <strong className="text-cream">Important:</strong> changes here only apply to NEW subscriptions. Existing members keep their original Stripe price until they cancel/re-subscribe. To update existing members in bulk, use the Stripe Dashboard.</p>
      {dollarInput("full_monthly_cents", "// FOUNDER MONTHLY PRICE")}
      {dollarInput("full_after_promo_monthly_cents", "// POST-PROMO MONTHLY PRICE")}
      {dollarInput("full_annual_cents", "// ANNUAL PRICE")}
      {dollarInput("foundational_monthly_cents", "// FOUNDATIONAL (DOWNGRADE) PRICE")}
      <div><label className="overline">// PROMO WINDOW (days)</label><input type="number" value={p.promo_days} onChange={(e) => setP({ ...p, promo_days: Number(e.target.value) })}/></div>
      <div><label className="overline">// MEMBERSHIP CAP</label><input type="number" value={p.cap} onChange={(e) => setP({ ...p, cap: Number(e.target.value) })}/></div>
      <label className="flex items-center gap-2 text-sm text-textMuted"><input type="checkbox" checked={!!p.show_foundational_publicly} onChange={(e) => setP({ ...p, show_foundational_publicly: e.target.checked })} style={{width:16,height:16}}/>Show $11 Foundational publicly on /pricing</label>
      <button data-testid="pricing-save" onClick={save} className="btn-gold">Save pricing</button>
    </div>
  );
}

/* ----------------- NOTIF PREFS ----------------- */
function NotifPrefsTab() {
  const [p, setP] = useState(null);
  useEffect(() => { api.get("/me/notif-prefs").then((r) => setP(r.data.prefs)); }, []);
  if (!p) return null;
  const save = async () => { await api.patch("/me/notif-prefs", p); toast.success("Saved"); };
  const tog = (k, label, desc) => (
    <label className="block panel p-4 cursor-pointer">
      <div className="flex items-center justify-between gap-4">
        <div><div className="text-cream">{label}</div><div className="text-xs font-mono text-textDim mt-1">{desc}</div></div>
        <input type="checkbox" checked={!!p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} style={{width:20,height:20}}/>
      </div>
    </label>
  );
  return (
    <div className="space-y-3 max-w-2xl">
      <div className="overline">// EMAIL ME WHEN…</div>
      {tog("admin_on_signup", "A new person signs up", "Catches them at the warmest moment. Send a personal welcome.")}
      {tog("admin_on_purchase", "Someone joins (paid)", "Money just hit. Celebrate it and send them a personal note.")}
      {tog("admin_on_cancel", "Someone cancels", "Reach out personally — sometimes it's just a season.")}
      {tog("admin_on_testimonial", "A testimonial is submitted", "Approve and feature within 24 hours.")}
      {tog("admin_on_payment_failed", "A payment fails", "You may want to DM them while Stripe auto-retries.")}
      {tog("admin_on_lead", "A blog lead opts in", "Useful when running ads. Off by default.")}
      {tog("admin_on_post", "A community post is made", "Useful at launch, off as it grows.")}
      <div className="overline mt-6">// DIGEST FREQUENCY</div>
      <select value={p.admin_digest_frequency} onChange={(e) => setP({ ...p, admin_digest_frequency: e.target.value })}>
        <option value="instant">Instant (every event)</option>
        <option value="hourly">Hourly rollup</option>
        <option value="daily">Daily digest (recommended)</option>
        <option value="off">Off — no emails to me</option>
      </select>
      <button data-testid="notif-save" onClick={save} className="btn-gold">Save preferences</button>
    </div>
  );
}

