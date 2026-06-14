import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Send, ChevronLeft, MessageCircle } from "lucide-react";
import { api, fmt } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export function DMInbox() {
  const [threads, setThreads] = useState([]);
  const loadThreads = useCallback(async () => {
    try {
      const r = await api.get("/dm/threads");
      setThreads(r.data.threads);
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.error("Failed loading threads", e);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="overline mb-3">// MESSAGES</div>
        <h1 className="font-display text-4xl sm:text-5xl text-cream">Direct messages</h1>
        <p className="text-textMuted mt-2 text-sm">Private conversations between members.</p>
        <div className="mt-10 space-y-2">
          {threads.map((t) => (
            <Link key={t.key} to={`/dm/${t.other?.id}`} data-testid={`thread-${t.other?.id}`} className="block panel p-4 hover:border-borderGoldHi">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-borderGold bg-surface overflow-hidden shrink-0">
                  {t.other?.avatar_url ? <img src={t.other.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-gold">{(t.other?.name||"?")[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-cream font-medium truncate">{t.other?.name}{t.other?.role === "admin" && <span className="overline ml-2">ROBIN</span>}</span>
                    <span className="text-xs font-mono text-textDim shrink-0">{fmt.datetime(t.last_at)}</span>
                  </div>
                  <div className="text-sm text-textMuted truncate">{t.last_body}</div>
                </div>
                {t.unread > 0 && <span className="bg-gold text-void px-2 py-0.5 text-xs font-mono">{t.unread}</span>}
              </div>
            </Link>
          ))}
          {threads.length === 0 && <p className="text-textMuted">No conversations yet. Visit a member's profile to start one.</p>}
        </div>
      </div>
    </div>
  );
}

export function DMThread() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ messages: [], other: null });
  const [body, setBody] = useState("");
  const endRef = useRef(null);
  const load = useCallback(() => api.get(`/dm/thread/${id}`).then((r) => setData(r.data)), [id]);
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data.messages.length]);
  const send = async (e) => {
    e?.preventDefault?.();
    if (!body.trim()) return;
    try { await api.post("/dm/send", { recipient_id: id, body }); setBody(""); load(); }
    catch (e) { console.error("DM send failed", e); toast.error("Could not send"); }
  };
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-8 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        <button onClick={() => nav("/dm")} className="overline flex items-center gap-2 mb-4"><ChevronLeft className="w-4 h-4"/>Inbox</button>
        <div className="panel p-4 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 border border-borderGold bg-surface overflow-hidden">
            {data.other?.avatar_url ? <img src={data.other.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-gold">{(data.other?.name||"?")[0]}</div>}
          </div>
          <div>
            <div className="text-cream font-medium">{data.other?.name}</div>
            <div className="overline">{data.other?.role === "admin" ? "ROBIN ANGEL" : data.other?.tier?.toUpperCase()}</div>
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {data.messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] p-3 ${mine ? "bg-gold text-void" : "panel"} rounded-none`}>
                  <p className={`whitespace-pre-wrap ${mine ? "text-void" : "text-cream/90"}`}>{m.body}</p>
                  <div className={`text-[10px] font-mono mt-1 ${mine ? "text-void/60" : "text-textDim"}`}>{fmt.datetime(m.created_at)}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef}/>
          {data.messages.length === 0 && <p className="text-textMuted text-center text-sm">Say hi.</p>}
        </div>
        <form onSubmit={send} className="panel p-3 sticky bottom-4 bg-void">
          <div className="flex gap-2">
            <input data-testid="dm-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" className="flex-1"/>
            <button data-testid="dm-send" type="submit" className="btn-gold !py-2 !px-4"><Send className="w-4 h-4"/></button>
          </div>
        </form>
      </div>
    </div>
  );
}
