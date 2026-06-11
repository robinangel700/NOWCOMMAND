// DropDetail with YouTube embed, transcript, related links, drop comments that cross-post to community.
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Bookmark, Hourglass, ChevronLeft, CheckCircle2, MessageCircle, ExternalLink, Send, Trash2 } from "lucide-react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function DropDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState("");
  const [crossPost, setCrossPost] = useState(true);

  const load = () => api.get(`/drops/${id}`).then((r) => {
    setData(r.data);
    setNoteBody(r.data?.note?.body || "");
  }).catch(() => {});
  const loadComments = () => api.get(`/drops/${id}/comments`).then((r) => setComments(r.data.comments));

  useEffect(() => { load(); loadComments(); }, [id]); // eslint-disable-line

  if (!data) return <div className="min-h-screen flex items-center justify-center"><Hourglass className="w-6 h-6 text-gold animate-glow"/></div>;
  const d = data.drop;
  const yt = youtubeId(d.youtube_url);

  const toggleBookmark = async () => {
    const { data: r } = await api.post(`/bookmarks/${id}`);
    load();
    toast.success(r.bookmarked ? "Bookmarked" : "Removed bookmark");
  };
  const saveNote = async () => {
    setBusy(true);
    try { await api.post("/notes", { drop_id: id, body: noteBody }); toast.success("Note saved (private)"); }
    catch { toast.error("Could not save"); }
    setBusy(false);
  };
  const submitQuiz = async () => {
    if (!data.quiz) return;
    const answers = data.quiz.questions.map((_, i) => quizAnswers[i] ?? -1);
    const { data: r } = await api.post(`/quizzes/${data.quiz.id}/attempt`, { answers });
    setQuizResult(r);
    toast.success(`You scored ${r.score}/${r.total}`);
  };
  const postComment = async () => {
    if (!commentBody.trim()) return;
    try {
      await api.post(`/drops/${id}/comments`, { body: commentBody, cross_post_to_community: crossPost });
      setCommentBody("");
      loadComments();
      toast.success(crossPost ? "Posted & shared to community" : "Posted on this drop");
    } catch { toast.error("Could not post"); }
  };
  const delComment = async (cid) => {
    if (!window.confirm("Delete comment?")) return;
    await api.delete(`/drops/comments/${cid}`); loadComments();
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => nav(-1)} className="overline flex items-center gap-2 mb-6"><ChevronLeft className="w-4 h-4"/>Back</button>
        <div className="overline mb-3">{d.foundational ? "FOUNDATIONAL" : "TRANSMISSION"} {d.quick_win && "// QUICK WIN"}</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream leading-[1.05]">{d.title}</h1>
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <span className="text-xs font-mono text-textDim">{fmt.datetime(d.published_at || d.scheduled_for)}</span>
          <button data-testid="bookmark-toggle" onClick={toggleBookmark} className="text-xs font-mono text-textMuted hover:text-gold flex items-center gap-2">
            <Bookmark className={`w-4 h-4 ${data.bookmarked ? "fill-gold text-gold" : ""}`}/>{data.bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>

        {yt && (
          <div className="mt-8 aspect-video w-full border border-borderGold bg-surface">
            <iframe
              src={`https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1`}
              title={d.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              data-testid="drop-youtube"
            />
          </div>
        )}

        {d.media_url && !yt && (
          <div className="mt-8 border border-borderGold">
            <img src={d.media_url} alt="" className="w-full max-h-[480px] object-cover"/>
          </div>
        )}

        <div className="mt-10 prose prose-invert max-w-none">
          <article className="whitespace-pre-wrap font-body text-base sm:text-lg leading-[1.8] text-cream/90">{d.body_md}</article>
        </div>

        {d.related_links && d.related_links.length > 0 && (
          <div className="mt-10 panel p-6">
            <div className="overline mb-3">// RELATED LINKS</div>
            <ul className="space-y-2">
              {d.related_links.map((l, i) => (
                <li key={i}><a href={l.url} target="_blank" rel="noreferrer" className="text-gold hover:underline flex items-center gap-2"><ExternalLink className="w-3 h-3"/>{l.title || l.url}</a></li>
              ))}
            </ul>
          </div>
        )}

        {d.transcript_md && (
          <details className="mt-10 panel p-6">
            <summary className="overline cursor-pointer">// TRANSCRIPT (click to expand)</summary>
            <div className="mt-4 whitespace-pre-wrap text-cream/85 leading-relaxed text-sm">{d.transcript_md}</div>
          </details>
        )}

        {data.quiz && (
          <div className="mt-16 panel p-6 sm:p-8">
            <div className="overline mb-3">// QUIZ</div>
            <h2 className="font-display text-2xl sm:text-3xl text-cream mb-6">{data.quiz.title}</h2>
            <div className="space-y-6">
              {data.quiz.questions.map((q, i) => (
                <div key={i}>
                  <div className="text-cream mb-2">{i + 1}. {q.q}</div>
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <label key={oi} className="flex items-center gap-3 cursor-pointer">
                        <input type="radio" name={`q${i}`} checked={quizAnswers[i] === oi} onChange={() => setQuizAnswers({ ...quizAnswers, [i]: oi })} style={{width:16,height:16}}/>
                        <span className="text-textMuted">{o}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button data-testid="quiz-submit" onClick={submitQuiz} className="btn-gold mt-6">Submit</button>
            {quizResult && (
              <div className="mt-4 flex items-center gap-2 text-cream"><CheckCircle2 className="w-4 h-4 text-gold"/>You scored {quizResult.score}/{quizResult.total}</div>
            )}
          </div>
        )}

        <div className="mt-16">
          <div className="overline mb-3">// YOUR PRIVATE NOTE</div>
          <p className="text-textDim text-xs font-mono mb-3">Only you can see this. Not posted to community.</p>
          <textarea data-testid="note-textarea" rows={5} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="What landed? What do you need to act on?"/>
          <button data-testid="note-save" onClick={saveNote} disabled={busy} className="btn-gold mt-4">Save note</button>
        </div>

        <div className="mt-16">
          <div className="overline mb-3">// DROP DISCUSSION</div>
          <h3 className="font-display text-2xl text-cream mb-2">Engage on this drop</h3>
          <p className="text-textDim text-xs font-mono mb-4">Comments here are public. Tick the box to also cross-post to the community feed.</p>
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  <Link to={`/u/${c.user_id}`} className="w-9 h-9 border border-borderGold overflow-hidden shrink-0 bg-surface">
                    {c.user_avatar ? <img src={c.user_avatar} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-gold">{(c.user_name||"?")[0]}</div>}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/u/${c.user_id}`} className="text-cream font-medium hover:text-gold">{c.user_name}</Link>
                      {c.user_role === "admin" && <span className="overline">// ROBIN</span>}
                      <span className="text-xs font-mono text-textDim">{fmt.datetime(c.created_at)}</span>
                    </div>
                    <p className="text-cream/90 whitespace-pre-wrap mt-1">{c.body}</p>
                  </div>
                  {(user?.role === "admin" || c.user_id === user?.id) && (
                    <button onClick={() => delComment(c.id)} className="text-textMuted hover:text-ruby shrink-0"><Trash2 className="w-4 h-4"/></button>
                  )}
                </div>
              </div>
            ))}
            {comments.length === 0 && <p className="text-textMuted text-sm">No comments yet.</p>}
          </div>
          <div className="mt-5 panel p-4">
            <textarea data-testid="drop-comment-body" rows={3} value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Share what landed for you…"/>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <label className="text-xs font-mono uppercase tracking-[0.2em] text-textMuted flex items-center gap-2">
                <input type="checkbox" checked={crossPost} onChange={(e) => setCrossPost(e.target.checked)} style={{width:16,height:16}}/>
                Also share to community
              </label>
              <button data-testid="drop-comment-submit" onClick={postComment} className="btn-gold"><Send className="w-4 h-4"/>Post</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DropsList() {
  const [drops, setDrops] = useState([]);
  useEffect(() => { api.get("/drops").then((r) => setDrops(r.data.drops || [])); }, []);
  const published = drops.filter((d) => d.published && !d.locked);
  const upcoming = drops.filter((d) => d.preview);
  const locked = drops.filter((d) => d.locked);
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="overline mb-4">// THE ARCHIVE</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream">All drops</h1>
        <p className="text-textMuted mt-3">Wednesday after Wednesday. The vault stays open while your seat does.</p>
        <h2 className="font-display text-2xl text-cream mt-16 mb-4">Published</h2>
        <div className="space-y-3">
          {published.map((d) => (
            <Link key={d.id} to={`/drops/${d.id}`} className="block panel p-6 hover:border-borderGoldHi">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="overline mb-1">{d.foundational ? "FOUNDATIONAL" : "FULL"} {d.quick_win && "// QUICK WIN"}</div>
                  <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                  {d.insight_preview && <p className="text-textMuted text-sm mt-1">{d.insight_preview}</p>}
                </div>
                <div className="text-xs font-mono text-textDim whitespace-nowrap">{fmt.date(d.published_at || d.scheduled_for)}</div>
              </div>
            </Link>
          ))}
          {published.length === 0 && <p className="text-textMuted">Nothing published yet.</p>}
        </div>
        {upcoming.length > 0 && (
          <>
            <h2 className="font-display text-2xl text-cream mt-16 mb-4">Coming soon</h2>
            <div className="space-y-3">{upcoming.map((d) => (
              <div key={d.id} className="panel p-6 opacity-70">
                <div className="flex items-center gap-3 mb-1"><Hourglass className="w-4 h-4 text-gold animate-glow"/><div className="overline">SCHEDULED · {fmt.datetime(d.scheduled_for)}</div></div>
                <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                {d.insight_preview && <p className="text-textMuted text-sm mt-1">{d.insight_preview}</p>}
              </div>))}</div>
          </>
        )}
        {locked.length > 0 && (
          <>
            <h2 className="font-display text-2xl text-cream mt-16 mb-4">A-la-carte</h2>
            <div className="space-y-3">{locked.map((d) => (
              <Link key={d.id} to={`/drops/${d.id}`} className="block panel p-6 hover:border-borderGoldHi">
                <div className="overline">SINGLE ASSET · {fmt.money(d.alacarte_price_cents)}</div>
                <h3 className="font-display text-2xl text-cream">{d.title}</h3>
              </Link>))}</div>
          </>
        )}
      </div>
    </div>
  );
}

export { DropDetail as default };
function DropDetail_alias() {}
