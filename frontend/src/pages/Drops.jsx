import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Bookmark, Hourglass, Lock, ChevronLeft, CheckCircle2 } from "lucide-react";
import { api, fmt } from "../lib/api";
import { toast } from "sonner";

export function DropsList() {
  const [drops, setDrops] = useState([]);
  useEffect(() => { api.get("/drops").then((r) => setDrops(r.data.drops || [])); }, []);
  const published = drops.filter((d) => d.published && !d.locked);
  const upcoming = drops.filter((d) => d.preview);
  const locked = drops.filter((d) => d.locked);

  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="overline mb-4">// THE ARCHIVE</div>
        <h1 className="font-display text-5xl md:text-6xl text-cream">All drops</h1>
        <p className="text-textMuted mt-3">Wednesday after Wednesday. The vault stays open while your seat does.</p>

        <h2 className="font-display text-2xl text-cream mt-16 mb-4">Published</h2>
        <div className="space-y-3">
          {published.map((d) => (
            <Link key={d.id} to={`/drops/${d.id}`} data-testid={`drop-${d.id}`} className="block panel p-6 hover:border-borderGoldHi">
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
            <div className="space-y-3">
              {upcoming.map((d) => (
                <div key={d.id} className="panel p-6 opacity-70">
                  <div className="flex items-center gap-3 mb-1"><Hourglass className="w-4 h-4 text-gold animate-glow" /><div className="overline">SCHEDULED &middot; {fmt.datetime(d.scheduled_for)}</div></div>
                  <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                  {d.insight_preview && <p className="text-textMuted text-sm mt-1">{d.insight_preview}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {locked.length > 0 && (
          <>
            <h2 className="font-display text-2xl text-cream mt-16 mb-4">A-la-carte</h2>
            <div className="space-y-3">
              {locked.map((d) => (
                <Link key={d.id} to={`/drops/${d.id}`} className="block panel p-6 hover:border-borderGoldHi">
                  <div className="flex items-center gap-3"><Lock className="w-4 h-4 text-gold"/><div className="overline">SINGLE ASSET &middot; {fmt.money(d.alacarte_price_cents)}</div></div>
                  <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                  {d.insight_preview && <p className="text-textMuted text-sm mt-1">{d.insight_preview}</p>}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function DropDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  const load = () => api.get(`/drops/${id}`).then((r) => {
    setData(r.data);
    setNoteBody(r.data?.note?.body || "");
  }).catch(() => { /* could be 403 */ });

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (!data) return <div className="min-h-screen flex items-center justify-center"><Hourglass className="w-6 h-6 text-gold animate-glow"/></div>;
  const d = data.drop;

  const toggleBookmark = async () => {
    const { data: r } = await api.post(`/bookmarks/${id}`);
    load();
    toast.success(r.bookmarked ? "Bookmarked" : "Removed bookmark");
  };
  const saveNote = async () => {
    setBusy(true);
    try {
      await api.post("/notes", { drop_id: id, body: noteBody });
      toast.success("Note saved");
    } catch { toast.error("Could not save"); }
    setBusy(false);
  };
  const submitQuiz = async () => {
    if (!data.quiz) return;
    const answers = data.quiz.questions.map((_, i) => quizAnswers[i] ?? -1);
    const { data: r } = await api.post(`/quizzes/${data.quiz.id}/attempt`, { answers });
    setQuizResult(r);
    toast.success(`You scored ${r.score}/${r.total}`);
  };
  const buyAlacarte = async () => {
    setBusy(true);
    try {
      const { data: r } = await api.post("/checkout/alacarte", { drop_id: id, origin_url: window.location.origin });
      if (r.dev_mode) toast.info("Dev mode: simulating purchase");
      window.location.href = r.url;
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not start"); setBusy(false); }
  };

  return (
    <div className="min-h-screen px-6 lg:px-10 py-12">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => nav(-1)} className="overline flex items-center gap-2 mb-6"><ChevronLeft className="w-4 h-4"/>Back</button>
        <div className="overline mb-3">{d.foundational ? "FOUNDATIONAL" : "TRANSMISSION"} {d.quick_win && "// QUICK WIN"}</div>
        <h1 className="font-display text-5xl md:text-6xl text-cream leading-none">{d.title}</h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-xs font-mono text-textDim">{fmt.datetime(d.published_at || d.scheduled_for)}</span>
          <button data-testid="bookmark-toggle" onClick={toggleBookmark} className="text-xs font-mono text-textMuted hover:text-gold flex items-center gap-2">
            <Bookmark className={`w-4 h-4 ${data.bookmarked ? "fill-gold text-gold" : ""}`}/> {data.bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
        </div>
        {d.media_url && (
          <div className="mt-8 border border-borderGold">
            <img src={d.media_url} alt="" className="w-full max-h-[480px] object-cover" />
          </div>
        )}
        <div className="mt-10 prose prose-invert max-w-none">
          <article className="whitespace-pre-wrap font-body text-lg leading-relaxed text-cream/90">{d.body_md}</article>
        </div>

        {data.quiz && (
          <div className="mt-16 panel p-8">
            <div className="overline mb-3">// QUIZ</div>
            <h2 className="font-display text-3xl text-cream mb-6">{data.quiz.title}</h2>
            <div className="space-y-6">
              {data.quiz.questions.map((q, i) => (
                <div key={i}>
                  <div className="text-cream mb-2">{i + 1}. {q.q}</div>
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <label key={oi} className="flex items-center gap-3 cursor-pointer">
                        <input
                          data-testid={`quiz-q${i}-opt${oi}`}
                          type="radio" name={`q${i}`} checked={quizAnswers[i] === oi}
                          onChange={() => setQuizAnswers({ ...quizAnswers, [i]: oi })}
                          className="!w-4 !h-4 !accent-gold"
                          style={{ width: 16, height: 16 }}
                        />
                        <span className="text-textMuted">{o}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button data-testid="quiz-submit" onClick={submitQuiz} className="btn-gold mt-6">Submit</button>
            {quizResult && (
              <div className="mt-4 flex items-center gap-2 text-cream"><CheckCircle2 className="w-4 h-4 text-gold"/> You scored {quizResult.score}/{quizResult.total}</div>
            )}
          </div>
        )}

        <div className="mt-16">
          <div className="overline mb-3">// YOUR NOTE</div>
          <textarea data-testid="note-textarea" rows={5} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="What landed? What do you need to act on?" />
          <button data-testid="note-save" onClick={saveNote} disabled={busy} className="btn-gold mt-4">Save note</button>
        </div>
      </div>
    </div>
  );
}

export function DropDetailLocked({ drop, onBuy }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="panel p-10 max-w-xl">
        <Lock className="w-6 h-6 text-gold mb-4"/>
        <h1 className="font-display text-4xl text-cream">{drop.title}</h1>
        <p className="text-textMuted mt-3">This is an a-la-carte asset. Unlock it once and own it forever.</p>
        <button onClick={onBuy} className="btn-gold mt-6">Unlock for {fmt.money(drop.alacarte_price_cents)}</button>
      </div>
    </div>
  );
}
