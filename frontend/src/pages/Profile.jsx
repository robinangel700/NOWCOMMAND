import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Camera, Save, MessageCircle } from "lucide-react";

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function uploadImage(file, purpose) {
  const data = await fileToDataUrl(file);
  const { data: r } = await api.post("/upload/image", { data, purpose });
  // server returns /static/uploads/xxx — make absolute via backend URL
  const base = process.env.REACT_APP_BACKEND_URL.replace(/\/$/, "");
  return r.url.startsWith("http") ? r.url : `${base}${r.url}`;
}

export function MyProfile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "", bio: user?.bio || "",
    avatar_url: user?.avatar_url || "", cover_image_url: user?.cover_image_url || "",
    cover_position_y: user?.cover_position_y ?? 50,
    location: user?.location || "", website: user?.website || "",
  });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const coverRef = useRef(null);
  const dragStart = useRef(null);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f,
      name: user.name || "", bio: user.bio || "",
      avatar_url: user.avatar_url || "", cover_image_url: user.cover_image_url || "",
      cover_position_y: user.cover_position_y ?? 50,
      location: user.location || "", website: user.website || "",
    }));
  }, [user]);

  const save = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try { await api.patch("/me/profile", form); await refresh(); toast.success("Profile saved"); }
    catch (e) { console.error("Profile save failed", e); toast.error("Save failed"); } finally { setBusy(false); }
  };

  const onAvatarFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { const url = await uploadImage(f, "avatar"); setForm({ ...form, avatar_url: url }); toast.success("Avatar uploaded"); }
    catch (e) { console.error("Avatar upload failed", e); toast.error("Upload failed"); } finally { setBusy(false); }
  };
  const onCoverFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { const url = await uploadImage(f, "cover"); setForm({ ...form, cover_image_url: url, cover_position_y: 50 }); toast.success("Cover uploaded"); }
    catch (e) { console.error("Cover upload failed", e); toast.error("Upload failed"); } finally { setBusy(false); }
  };

  // Drag to reposition cover (vertical only — keeps mobile + desktop simple)
  const startDrag = (e) => { if (!form.cover_image_url) return; setDragging(true); dragStart.current = { y: e.clientY ?? e.touches?.[0]?.clientY ?? 0, base: form.cover_position_y }; };
  const moveDrag = (e) => {
    if (!dragging || !coverRef.current) return;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const delta = clientY - dragStart.current.y;
    const h = coverRef.current.offsetHeight;
    let next = dragStart.current.base - (delta / h) * 100;
    next = Math.max(0, Math.min(100, next));
    setForm((f) => ({ ...f, cover_position_y: Math.round(next) }));
  };
  const endDrag = () => setDragging(false);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="overline mb-3">// PROFILE</div>
        <h1 className="font-display text-4xl sm:text-5xl text-cream">Your sovereign presence</h1>
        <p className="text-textMuted mt-2">Members see this on every post you make.</p>

        <div className="mt-10 panel select-none">
          <div
            ref={coverRef}
            className="relative h-40 sm:h-56 bg-surfaceUp overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={startDrag} onMouseMove={moveDrag} onMouseUp={endDrag} onMouseLeave={endDrag}
            onTouchStart={startDrag} onTouchMove={moveDrag} onTouchEnd={endDrag}
            data-testid="cover-drag-area"
          >
            {form.cover_image_url && (
              <img src={form.cover_image_url} alt="" className="w-full h-full object-cover pointer-events-none" style={{ objectPosition: `center ${form.cover_position_y}%` }}/>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void/70 pointer-events-none"/>
            <label className="absolute top-3 right-3 btn-ghost text-xs cursor-pointer">
              <Camera className="w-3 h-3"/>{form.cover_image_url ? "Replace cover" : "Upload cover"}
              <input data-testid="cover-upload" type="file" accept="image/*" onChange={onCoverFile} className="hidden" style={{ display: "none" }}/>
            </label>
            {form.cover_image_url && (
              <div className="absolute bottom-2 left-3 overline text-[10px] text-cream/70">DRAG TO REPOSITION · Y {form.cover_position_y}%</div>
            )}
          </div>
          <div className="px-6 pb-6 -mt-12 relative flex items-end gap-4">
            <div className="w-24 h-24 border-2 border-gold bg-surface overflow-hidden shrink-0">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-4xl text-gold">{(form.name || "?")[0]?.toUpperCase()}</div>
              )}
            </div>
            <label className="btn-ghost text-xs cursor-pointer mb-1">
              <Camera className="w-3 h-3"/>{form.avatar_url ? "Replace avatar" : "Upload avatar"}
              <input data-testid="avatar-upload" type="file" accept="image/*" onChange={onAvatarFile} className="hidden" style={{ display: "none" }}/>
            </label>
          </div>
        </div>

        <form onSubmit={save} className="mt-8 space-y-5">
          <div><label className="overline">// DISPLAY NAME</label><input data-testid="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></div>
          <div><label className="overline">// BIO</label><textarea data-testid="profile-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Who are you, and what are you stepping into?"/></div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div><label className="overline">// LOCATION</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}/></div>
            <div><label className="overline">// WEBSITE</label><input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..."/></div>
          </div>
          <button data-testid="profile-save" type="submit" disabled={busy} className="btn-gold"><Save className="w-4 h-4"/>{busy ? "Saving…" : "Save profile"}</button>
        </form>
      </div>
    </div>
  );
}

export function PublicProfile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/users/${id}/public`).then((r) => setData(r.data)); }, [id]);
  if (!data) return null;
  const { user, posts } = data;
  return (
    <div className="min-h-screen">
      <div className="relative h-44 sm:h-60 bg-surfaceUp">
        {user.cover_image_url && <img src={user.cover_image_url} alt="" className="w-full h-full object-cover" style={{ objectPosition: `center ${user.cover_position_y ?? 50}%` }}/>}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void/70"/>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 -mt-16 relative">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-gold bg-surface overflow-hidden shrink-0">
            {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-5xl text-gold">{(user.name || "?")[0]?.toUpperCase()}</div>}
          </div>
          {me?.id !== user.id && (
            <Link to={`/dm/${user.id}`} className="btn-gold text-xs"><MessageCircle className="w-4 h-4"/>Message</Link>
          )}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-cream mt-4">{user.name}</h1>
        <div className="overline mt-1">{user.role === "admin" ? "ROBIN ANGEL" : user.tier?.toUpperCase()}</div>
        {user.bio && <p className="text-cream/90 mt-4 leading-relaxed whitespace-pre-wrap">{user.bio}</p>}
        <div className="flex flex-wrap gap-4 text-xs font-mono text-textDim mt-3">
          {user.location && <span>{user.location}</span>}
          {user.website && <a href={user.website} target="_blank" rel="noreferrer" className="text-gold hover:underline">{user.website}</a>}
          <span>Joined {fmt.date(user.created_at)}</span>
        </div>
        <h2 className="font-display text-2xl text-cream mt-12 mb-4">Recent posts</h2>
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="panel p-5">
              <div className="overline mb-2">{p.kind === "win" ? "WIN" : p.kind === "new_drop_announcement" ? "DROP" : "POST"} · {fmt.datetime(p.created_at)}</div>
              <p className="text-cream/90 whitespace-pre-wrap">{p.body}</p>
            </div>
          ))}
          {posts.length === 0 && <p className="text-textMuted">No posts yet.</p>}
        </div>
      </div>
      <div className="h-32"/>
    </div>
  );
}
