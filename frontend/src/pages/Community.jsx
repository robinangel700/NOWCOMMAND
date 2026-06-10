import { useEffect, useState } from "react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Pin, Trash2, MessageCircle, Send } from "lucide-react";

export default function Community() {
  const { user } = useAuth();
  const [feed, setFeed] = useState({ posts: [], rules: null, manifesto: null });
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("regular");
  const [openComments, setOpenComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentBodies, setCommentBodies] = useState({});

  const load = () => api.get("/community/feed").then((r) => setFeed(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const post = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try { await api.post("/community/posts", { body, kind }); setBody(""); setKind("regular"); load(); toast.success("Posted"); }
    catch { toast.error("Could not post"); }
  };

  const loadComments = async (pid) => {
    setOpenComments({ ...openComments, [pid]: !openComments[pid] });
    if (!comments[pid]) {
      const { data } = await api.get(`/community/posts/${pid}/comments`);
      setComments({ ...comments, [pid]: data.comments });
    }
  };
  const submitComment = async (pid) => {
    const b = (commentBodies[pid] || "").trim(); if (!b) return;
    await api.post(`/community/posts/${pid}/comments`, { body: b });
    setCommentBodies({ ...commentBodies, [pid]: "" });
    const { data } = await api.get(`/community/posts/${pid}/comments`);
    setComments({ ...comments, [pid]: data.comments });
    load();
  };
  const deletePost = async (pid) => {
    if (!window.confirm("Delete post?")) return;
    await api.delete(`/community/posts/${pid}`); load(); toast.success("Deleted");
  };
  const togglePin = async (pid) => { await api.post(`/community/posts/${pid}/pin`); load(); };
  const deleteComment = async (cid, pid) => {
    if (!window.confirm("Delete comment?")) return;
    await api.delete(`/community/comments/${cid}`);
    const { data } = await api.get(`/community/posts/${pid}/comments`);
    setComments({ ...comments, [pid]: data.comments });
  };

  if (user?.tier === "foundational") {
    return (
      <div className="min-h-screen px-6 py-24 max-w-2xl mx-auto">
        <div className="overline mb-4">// COMMUNITY</div>
        <h1 className="font-display text-5xl text-cream">Sovereign tier only.</h1>
        <p className="text-textMuted mt-3">The community is reserved for Sovereign members. Upgrade from Billing to enter.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 lg:px-10 py-12">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-4 space-y-6">
          <div className="panel p-6">
            <div className="overline mb-3">// THE MANIFESTO</div>
            <pre className="whitespace-pre-wrap font-display text-xl text-cream leading-snug">{feed.manifesto?.body_md || "Manifesto pending\u2026"}</pre>
          </div>
          <div className="panel p-6">
            <div className="overline mb-3">// HOUSE RULES</div>
            <pre className="whitespace-pre-wrap text-sm text-textMuted leading-relaxed">{feed.rules?.body_md || "Rules pending\u2026"}</pre>
          </div>
        </aside>

        <div className="lg:col-span-8">
          <div className="overline mb-4">// COMMUNITY FEED</div>
          <h1 className="font-display text-4xl text-cream mb-6">The Sovereign Vault</h1>

          <form onSubmit={post} className="panel p-5 mb-8" data-testid="new-post-form">
            <textarea data-testid="new-post-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share a win, ask a question, drop a code\u2026" />
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs font-mono uppercase tracking-[0.2em] text-textMuted flex items-center gap-2">
                <input type="checkbox" checked={kind === "win"} onChange={(e) => setKind(e.target.checked ? "win" : "regular")} className="!w-4 !h-4" style={{width:16,height:16}}/>
                Tag as Biggest Win
              </label>
              <button type="submit" data-testid="new-post-submit" className="btn-gold ml-auto"><Send className="w-4 h-4"/> Post</button>
            </div>
          </form>

          <div className="space-y-4">
            {feed.posts.map((p) => (
              <div key={p.id} data-testid={`post-${p.id}`} className="panel p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-borderGold flex items-center justify-center font-display text-gold">{(p.user_name || "?")[0]?.toUpperCase()}</div>
                    <div>
                      <div className="text-cream font-medium">{p.user_name} {p.user_role === "admin" && <span className="overline ml-2">// ROBIN</span>}</div>
                      <div className="text-xs font-mono text-textDim">{fmt.datetime(p.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.kind === "win" && <span className="overline">WIN</span>}
                    {p.pinned && <Pin className="w-4 h-4 text-gold"/>}
                    {user?.role === "admin" && (
                      <>
                        <button data-testid={`pin-${p.id}`} onClick={() => togglePin(p.id)} title="Pin" className="text-textMuted hover:text-gold"><Pin className="w-4 h-4"/></button>
                        <button data-testid={`del-post-${p.id}`} onClick={() => deletePost(p.id)} title="Delete" className="text-textMuted hover:text-ruby"><Trash2 className="w-4 h-4"/></button>
                      </>
                    )}
                    {user?.role !== "admin" && p.user_id === user?.id && (
                      <button onClick={() => deletePost(p.id)} className="text-textMuted hover:text-ruby"><Trash2 className="w-4 h-4"/></button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-cream/90 leading-relaxed">{p.body}</p>
                <button data-testid={`comments-${p.id}`} onClick={() => loadComments(p.id)} className="mt-4 text-xs font-mono text-textMuted hover:text-gold flex items-center gap-2"><MessageCircle className="w-4 h-4"/> {p.comment_count} comments</button>
                {openComments[p.id] && (
                  <div className="mt-4 border-t border-borderGold pt-4 space-y-3">
                    {(comments[p.id] || []).map((c) => (
                      <div key={c.id} className="text-sm">
                        <span className="text-gold mr-2">{c.user_name}</span>
                        <span className="text-cream/80">{c.body}</span>
                        {(user?.role === "admin" || c.user_id === user?.id) && (
                          <button onClick={() => deleteComment(c.id, p.id)} className="ml-2 text-textDim hover:text-ruby"><Trash2 className="w-3 h-3 inline"/></button>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <input data-testid={`comment-input-${p.id}`} value={commentBodies[p.id] || ""} onChange={(e) => setCommentBodies({ ...commentBodies, [p.id]: e.target.value })} placeholder="Add a comment\u2026" />
                      <button data-testid={`comment-submit-${p.id}`} onClick={() => submitComment(p.id)} className="btn-gold !py-2 !px-4 text-xs">Send</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {feed.posts.length === 0 && <p className="text-textMuted">No posts yet. Be first.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
