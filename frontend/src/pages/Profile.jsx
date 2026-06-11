import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Camera, Save, User as UserIcon, Check } from "lucide-react";

export function MyProfile() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "", bio: user?.bio || "",
    avatar_url: user?.avatar_url || "", cover_image_url: user?.cover_image_url || "",
    pronouns: user?.pronouns || "", location: user?.location || "", website: user?.website || "",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (user) setForm((f) => ({ ...f,
      name: user.name || "", bio: user.bio || "",
      avatar_url: user.avatar_url || "", cover_image_url: user.cover_image_url || "",
      pronouns: user.pronouns || "", location: user.location || "", website: user.website || "",
    }));
  }, [user]);
  const save = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      await api.patch("/me/profile", form);
      await refresh();
      toast.success("Profile saved");
    } catch { toast.error("Save failed"); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen px-6 lg:px-10 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="overline mb-3">// PROFILE</div>
        <h1 className="font-display text-5xl text-cream">Your sovereign presence</h1>
        <p className="text-textMuted mt-2">Members see this on every post you make.</p>

        <div className="mt-10 panel">
          <div className="relative h-44 bg-surfaceUp">
            {form.cover_image_url && <img src={form.cover_image_url} alt="" className="w-full h-full object-cover"/>}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void/70"/>
          </div>
          <div className="px-6 pb-6 -mt-12 relative">
            <div className="w-24 h-24 border-2 border-gold bg-surface overflow-hidden">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-4xl text-gold">{(form.name || "?")[0]?.toUpperCase()}</div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={save} className="mt-8 space-y-5">
          <div>
            <label className="overline">// DISPLAY NAME</label>
            <input data-testid="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
          </div>
          <div>
            <label className="overline">// PRONOUNS</label>
            <input data-testid="profile-pronouns" value={form.pronouns} onChange={(e) => setForm({ ...form, pronouns: e.target.value })} placeholder="she/her, he/him, they/them..."/>
          </div>
          <div>
            <label className="overline">// AVATAR IMAGE URL</label>
            <input data-testid="profile-avatar" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..."/>
          </div>
          <div>
            <label className="overline">// COVER IMAGE URL</label>
            <input data-testid="profile-cover" value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..."/>
          </div>
          <div>
            <label className="overline">// BIO</label>
            <textarea data-testid="profile-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Who are you, and what are you stepping into?"/>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="overline">// LOCATION</label>
              <input data-testid="profile-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}/>
            </div>
            <div>
              <label className="overline">// WEBSITE</label>
              <input data-testid="profile-website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..."/>
            </div>
          </div>
          <button data-testid="profile-save" type="submit" disabled={busy} className="btn-gold"><Save className="w-4 h-4"/>{busy ? "Saving..." : "Save profile"}</button>
        </form>
      </div>
    </div>
  );
}

export function PublicProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/users/${id}/public`).then((r) => setData(r.data)); }, [id]);
  if (!data) return null;
  const { user, posts } = data;
  return (
    <div className="min-h-screen">
      <div className="relative h-56 bg-surfaceUp">
        {user.cover_image_url && <img src={user.cover_image_url} alt="" className="w-full h-full object-cover"/>}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-void/70"/>
      </div>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 -mt-16 relative">
        <div className="w-32 h-32 border-2 border-gold bg-surface overflow-hidden">
          {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-5xl text-gold">{(user.name || "?")[0]?.toUpperCase()}</div>}
        </div>
        <h1 className="font-display text-4xl text-cream mt-4">{user.name} {user.pronouns && <span className="text-textDim text-base font-mono ml-2">({user.pronouns})</span>}</h1>
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
              <div className="overline mb-2">{p.kind === "win" ? "WIN" : "POST"} &middot; {fmt.datetime(p.created_at)}</div>
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
