import { useEffect, useState } from "react";
import { Sparkles, CheckSquare, Square, Calendar, Send, Users, Hourglass, Mail, Flag, BookOpen, FileText, MessageSquare, Bell, Plus, Rocket } from "lucide-react";
import { api, fmt } from "../lib/api";
import { toast } from "sonner";

const TABS = [
  { id: "checklist", label: "Checklist", icon: CheckSquare },
  { id: "drops", label: "Drops", icon: Sparkles },
  { id: "members", label: "Members", icon: Users },
  { id: "summary", label: "Summary", icon: FileText },
  { id: "community", label: "Community", icon: MessageSquare },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "outbox", label: "Email Log", icon: Mail },
  { id: "launch", label: "Launch", icon: Rocket },
];

export default function Admin() {
  const [tab, setTab] = useState("checklist");
  return (
    <div className="min-h-screen px-6 lg:px-10 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="overline mb-3">// ROBIN'S PORTAL</div>
        <h1 className="font-display text-5xl text-cream">Creator Control Room</h1>
        <p className="text-textMuted mt-2">Every operation. Every drop. Every member. One pane.</p>

        <div className="flex flex-wrap gap-px bg-borderGold mt-10 mb-10">
          {TABS.map((t) => (
            <button
              key={t.id}
              data-testid={`admin-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`bg-void px-5 py-3 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] transition-colors ${
                tab === t.id ? "text-gold" : "text-textMuted hover:text-cream"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "checklist" && <Checklist />}
        {tab === "drops" && <Drops />}
        {tab === "members" && <Members />}
        {tab === "summary" && <Summary />}
        {tab === "community" && <CommunityAdmin />}
        {tab === "reminders" && <Reminders />}
        {tab === "outbox" && <Outbox />}
        {tab === "launch" && <LaunchPanel />}
      </div>
    </div>
  );
}

function Checklist() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const load = () => api.get("/admin/checklist").then((r) => setItems(r.data.items));
  useEffect(() => { load(); }, []);
  const toggle = async (id, done) => { await api.patch(`/admin/checklist/${id}`, { done: !done }); load(); };
  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post("/admin/checklist", { title, description: desc });
    setTitle(""); setDesc(""); load();
  };
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

function DropForm({ initial, onSaved, onCancel }) {
  const [d, setD] = useState(initial || {
    title: "", body_md: "", media_url: "", foundational: false, scheduled_for: "",
    insight_preview: "", quick_win: false, alacarte_price_cents: "", tags: [],
  });
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
  return (
    <form onSubmit={save} className="panel p-6 space-y-4" data-testid="drop-form">
      <div>
        <label className="overline">// TITLE</label>
        <input data-testid="drop-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} required />
      </div>
      <div>
        <label className="overline">// INSIGHT PREVIEW (shown for upcoming)</label>
        <input data-testid="drop-preview" value={d.insight_preview} onChange={(e) => setD({ ...d, insight_preview: e.target.value })} placeholder="A teaser members see before it drops" />
      </div>
      <div>
        <label className="overline">// MEDIA URL (optional image/video)</label>
        <input data-testid="drop-media" value={d.media_url || ""} onChange={(e) => setD({ ...d, media_url: e.target.value })} placeholder="https://..." />
      </div>
      <div>
        <label className="overline">// BODY (markdown)</label>
        <textarea data-testid="drop-body" rows={8} value={d.body_md} onChange={(e) => setD({ ...d, body_md: e.target.value })} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="overline">// SCHEDULED FOR (leave blank to publish immediately)</label>
          <input data-testid="drop-schedule" type="datetime-local" value={d.scheduled_for ? d.scheduled_for.slice(0, 16) : ""} onChange={(e) => setD({ ...d, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
        </div>
        <div>
          <label className="overline">// A-LA-CARTE PRICE (cents). Leave blank for free-to-members.</label>
          <input data-testid="drop-alacarte" type="number" value={d.alacarte_price_cents ?? ""} onChange={(e) => setD({ ...d, alacarte_price_cents: e.target.value })} placeholder="e.g. 2700" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <label className="flex items-center gap-2 text-sm text-textMuted">
          <input data-testid="drop-foundational" type="checkbox" checked={d.foundational} onChange={(e) => setD({ ...d, foundational: e.target.checked })} style={{width:16,height:16}}/> Foundational
        </label>
        <label className="flex items-center gap-2 text-sm text-textMuted">
          <input data-testid="drop-quickwin" type="checkbox" checked={d.quick_win} onChange={(e) => setD({ ...d, quick_win: e.target.checked })} style={{width:16,height:16}}/> Quick Win (under 15 min)
        </label>
      </div>
      <div className="flex gap-3 pt-3">
        <button type="submit" data-testid="drop-save" className="btn-gold">{initial?.id ? "Update drop" : "Create drop"}</button>
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
          <div key={d.id} className="panel p-5" data-testid={`admin-drop-${d.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="overline mb-1">{d.published ? "PUBLISHED" : d.scheduled_for ? "SCHEDULED" : "DRAFT"} {d.foundational && "// FOUNDATIONAL"} {d.quick_win && "// QUICK WIN"} {d.alacarte_price_cents && `// A-LA-CARTE ${fmt.money(d.alacarte_price_cents)}`}</div>
                <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                <div className="text-xs font-mono text-textDim mt-1">{d.published_at ? `Pub: ${fmt.datetime(d.published_at)}` : d.scheduled_for ? `Sched: ${fmt.datetime(d.scheduled_for)}` : ""}</div>
              </div>
              <div className="flex gap-2">
                {!d.published && <button onClick={() => publishNow(d.id)} className="btn-ghost text-xs !py-2 !px-3">Publish now</button>}
                <button data-testid={`edit-drop-${d.id}`} onClick={() => setEditing(d)} className="btn-ghost text-xs !py-2 !px-3">Edit</button>
                <button data-testid={`delete-drop-${d.id}`} onClick={() => del(d.id)} className="btn-ghost text-xs !py-2 !px-3 !border-ruby !text-ruby">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function Summary() {
  const [m1, setM1] = useState(""); const [m2, setM2] = useState(""); const [m3, setM3] = useState("");
  const [i1, setI1] = useState(""); const [i2, setI2] = useState(""); const [i3, setI3] = useState("");
  const [resource, setResource] = useState("");
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/monthly-summary").then((r) => setList(r.data.summaries));
  useEffect(() => { load(); }, []);
  const submit = async (sendNow) => {
    const matters = [m1, m2, m3].filter((s) => s.trim());
    const ignore = [i1, i2, i3].filter((s) => s.trim());
    if (matters.length === 0 || !resource.trim()) { toast.error("Need at least 1 bullet and 1 resource"); return; }
    await api.post("/admin/monthly-summary", { matters, ignore, one_resource: resource, send_now: sendNow });
    toast.success(sendNow ? "Sent to all members" : "Scheduled");
    setM1(""); setM2(""); setM3(""); setI1(""); setI2(""); setI3(""); setResource("");
    load();
  };
  return (
    <div>
      <div className="overline mb-3">// MONTHLY EXECUTIVE SUMMARY</div>
      <div className="panel p-6 space-y-4">
        <div>
          <label className="overline">// 3 BULLETS &middot; WHAT MATTERS</label>
          <input data-testid="sum-m1" value={m1} onChange={(e) => setM1(e.target.value)} placeholder="Bullet 1" />
          <input data-testid="sum-m2" value={m2} onChange={(e) => setM2(e.target.value)} placeholder="Bullet 2" />
          <input data-testid="sum-m3" value={m3} onChange={(e) => setM3(e.target.value)} placeholder="Bullet 3" />
        </div>
        <div>
          <label className="overline">// WHAT TO IGNORE</label>
          <input data-testid="sum-i1" value={i1} onChange={(e) => setI1(e.target.value)} placeholder="Ignore 1" />
          <input data-testid="sum-i2" value={i2} onChange={(e) => setI2(e.target.value)} placeholder="Ignore 2" />
          <input data-testid="sum-i3" value={i3} onChange={(e) => setI3(e.target.value)} placeholder="Ignore 3" />
        </div>
        <div>
          <label className="overline">// THE ONE RESOURCE</label>
          <input data-testid="sum-resource" value={resource} onChange={(e) => setResource(e.target.value)} placeholder="The one resource they need this month" />
        </div>
        <div className="flex gap-3">
          <button data-testid="sum-send" onClick={() => submit(true)} className="btn-gold"><Send className="w-4 h-4"/> Send to all members</button>
          <button data-testid="sum-save" onClick={() => submit(false)} className="btn-ghost">Save as draft</button>
        </div>
      </div>
      <h3 className="font-display text-2xl text-cream mt-10 mb-4">Sent / scheduled</h3>
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="panel p-4">
            <div className="overline">{s.sent ? `SENT ${fmt.datetime(s.sent_at)}` : "DRAFT"}</div>
            <div className="text-cream mt-2">{s.matters.join(" \u00b7 ")}</div>
          </div>
        ))}
      </div>
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
  const saveManifesto = async () => { await api.post("/admin/manifesto", { body_md: manifesto }); toast.success("Manifesto saved"); };
  const saveRules = async () => { await api.post("/admin/community-rules", { body_md: rules }); toast.success("Rules saved"); };
  return (
    <div className="space-y-8">
      <div className="panel p-6">
        <div className="overline mb-3">// ONE PAGE MANIFESTO</div>
        <textarea data-testid="manifesto-textarea" rows={10} value={manifesto} onChange={(e) => setManifesto(e.target.value)} />
        <button data-testid="manifesto-save" onClick={saveManifesto} className="btn-gold mt-4">Save manifesto</button>
      </div>
      <div className="panel p-6">
        <div className="overline mb-3">// HOUSE RULES</div>
        <textarea data-testid="rules-textarea" rows={8} value={rules} onChange={(e) => setRules(e.target.value)} />
        <button data-testid="rules-save" onClick={saveRules} className="btn-gold mt-4">Save rules</button>
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
  const add = async (e) => {
    e.preventDefault();
    await api.post("/admin/reminders", { title, when: when ? new Date(when).toISOString() : null });
    setTitle(""); setWhen(""); load();
  };
  const toggle = async (id, done) => { await api.patch(`/admin/reminders/${id}`, { completed: !done }); load(); };
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-px bg-borderGold mb-8">
        <div className="bg-void p-6">
          <div className="overline mb-3">// TODAY'S SALES POSTS &middot; FUNNEL & SOCIALS</div>
          <div className="font-display text-5xl text-cream">{data.today.sales_posts_done} / {data.today.sales_posts_target}</div>
          <p className="text-textMuted text-sm mt-2">Post 2 sales angles per day. Hit the button after each one to log it.</p>
          <button data-testid="log-sales" onClick={() => logPost("sales")} className="btn-gold mt-4"><Plus className="w-4 h-4"/> Log a sales post</button>
        </div>
        <div className="bg-void p-6">
          <div className="overline mb-3">// TODAY'S NURTURE POSTS &middot; FUNNEL</div>
          <div className="font-display text-5xl text-cream">{data.today.nurture_posts_done} / {data.today.nurture_posts_target}</div>
          <p className="text-textMuted text-sm mt-2">2 free nurturing posts into the free Facebook group per day.</p>
          <button data-testid="log-nurture" onClick={() => logPost("nurture")} className="btn-ghost mt-4"><Plus className="w-4 h-4"/> Log a nurture post</button>
        </div>
      </div>
      <h3 className="font-display text-2xl text-cream mb-4">Personal reminders</h3>
      <form onSubmit={add} className="flex flex-wrap gap-3 mb-6">
        <input data-testid="reminder-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" className="flex-1 min-w-[260px]"/>
        <input data-testid="reminder-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="max-w-[220px]"/>
        <button data-testid="reminder-add" type="submit" className="btn-gold"><Plus className="w-4 h-4"/> Add</button>
      </form>
      <div className="space-y-2">
        {data.items.map((r) => (
          <button key={r.id} onClick={() => toggle(r.id, r.completed)} className={`block w-full text-left panel p-4 ${r.completed ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              {r.completed ? <CheckSquare className="w-5 h-5 text-gold"/> : <Square className="w-5 h-5 text-textMuted"/>}
              <div>
                <div className={`${r.completed ? "line-through text-textMuted" : "text-cream"}`}>{r.title}</div>
                {r.when && <div className="text-xs font-mono text-textDim">{fmt.datetime(r.when)}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Outbox() {
  const [emails, setEmails] = useState([]);
  useEffect(() => { api.get("/admin/outbox").then((r) => setEmails(r.data.emails)); }, []);
  return (
    <div>
      <div className="overline mb-3">// EMAIL LOG &middot; everything queued or sent</div>
      <div className="space-y-2">
        {emails.map((e) => (
          <div key={e.id} className="panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-cream">{e.subject}</div>
                <div className="text-xs font-mono text-textDim">{e.to} &middot; {e.kind}</div>
              </div>
              <span className="overline">{e.status}</span>
            </div>
          </div>
        ))}
        {emails.length === 0 && <p className="text-textMuted">No emails yet.</p>}
      </div>
    </div>
  );
}

function LaunchPanel() {
  const [state, setState] = useState(null);
  const [checklist, setChecklist] = useState({ done: 0, total: 0 });
  const load = async () => {
    const s = await api.get("/admin/settings/launch");
    setState(s.data.value || {});
    const c = await api.get("/admin/checklist");
    const items = c.data.items; setChecklist({ done: items.filter((i) => i.done).length, total: items.length });
  };
  useEffect(() => { load(); }, []);
  const launch = async () => {
    if (!window.confirm("Launch NOWREALM now? This starts the 3-week $44 founder window and locks pricing globally.")) return;
    try { const r = await api.post("/admin/launch"); toast.success("Launched"); setState({ launched: true, launch_date: r.data.launch_date, promo_days: r.data.promo_days }); }
    catch { toast.error("Launch failed"); }
  };
  const triggerWB = async () => { await api.post("/admin/trigger-winback"); toast.success("Win-back swept"); };
  const triggerDrops = async () => { await api.post("/admin/trigger-drops"); toast.success("Scheduled drops swept"); };
  const regen = async () => { await api.post("/admin/regenerate-pdf"); toast.success("PDF regenerated"); };
  if (!state) return null;
  return (
    <div className="space-y-6">
      <div className="panel p-8">
        <div className="overline mb-3">// LAUNCH STATUS</div>
        {state.launched ? (
          <>
            <h2 className="font-display text-3xl text-cream">Launched on {fmt.date(state.launch_date)}</h2>
            <p className="text-textMuted mt-2">$44 founder window for {state.promo_days} days. Auto-switches to $77/mo after.</p>
          </>
        ) : (
          <>
            <h2 className="font-display text-3xl text-cream">Not launched yet</h2>
            <p className="text-textMuted mt-2">Checklist: <span className="text-gold">{checklist.done}/{checklist.total}</span> complete. Recommended to finish before pressing launch.</p>
            <button data-testid="launch-button" onClick={launch} className="btn-gold mt-6"><Rocket className="w-4 h-4"/> Press LAUNCH</button>
          </>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-5">
          <h3 className="font-display text-xl text-cream mb-2">Sweep scheduled drops</h3>
          <p className="text-textMuted text-sm">Force the scheduler to publish anything past due now.</p>
          <button data-testid="sweep-drops" onClick={triggerDrops} className="btn-ghost mt-3 text-xs">Run now</button>
        </div>
        <div className="panel p-5">
          <h3 className="font-display text-xl text-cream mb-2">Trigger win-back emails</h3>
          <p className="text-textMuted text-sm">Manually scan inactive members (14+ days).</p>
          <button data-testid="sweep-winback" onClick={triggerWB} className="btn-ghost mt-3 text-xs">Run now</button>
        </div>
        <div className="panel p-5">
          <h3 className="font-display text-xl text-cream mb-2">Regenerate Activation Codes PDF</h3>
          <p className="text-textMuted text-sm">Re-run after editing the source template.</p>
          <button data-testid="regen-pdf" onClick={regen} className="btn-ghost mt-3 text-xs">Regenerate</button>
        </div>
      </div>
    </div>
  );
}
