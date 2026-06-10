import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmt } from "../lib/api";

export function NotesPage() {
  const [notes, setNotes] = useState([]);
  useEffect(() => { api.get("/notes").then((r) => setNotes(r.data.notes)); }, []);
  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="overline mb-3">// PRIVATE</div>
        <h1 className="font-display text-5xl text-cream">Your notes</h1>
        <p className="text-textMuted mt-3">Saved per drop. Updated whenever you write.</p>
        <div className="mt-12 space-y-4">
          {notes.map((n) => (
            <Link key={n.id} to={`/drops/${n.drop_id}`} data-testid={`note-${n.id}`} className="block panel p-6">
              <div className="text-xs font-mono text-textDim">{fmt.datetime(n.updated_at)}</div>
              <p className="text-cream/90 mt-2 whitespace-pre-wrap line-clamp-4">{n.body}</p>
            </Link>
          ))}
          {notes.length === 0 && <p className="text-textMuted">No notes yet.</p>}
        </div>
      </div>
    </div>
  );
}

export function BookmarksPage() {
  const [items, setItems] = useState([]);
  const [drops, setDrops] = useState({});
  useEffect(() => {
    api.get("/bookmarks").then(async (r) => {
      setItems(r.data.bookmarks);
      const allDrops = await api.get("/drops");
      const map = {};
      (allDrops.data.drops || []).forEach((d) => { map[d.id] = d; });
      setDrops(map);
    });
  }, []);
  return (
    <div className="min-h-screen px-6 lg:px-10 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="overline mb-3">// SAVED</div>
        <h1 className="font-display text-5xl text-cream">Bookmarks</h1>
        <div className="mt-12 space-y-3">
          {items.map((b) => {
            const d = drops[b.drop_id];
            if (!d) return null;
            return (
              <Link key={b.id} to={`/drops/${b.drop_id}`} data-testid={`bookmark-${b.id}`} className="block panel p-5">
                <h3 className="font-display text-2xl text-cream">{d.title}</h3>
                <div className="text-xs font-mono text-textDim mt-1">Saved {fmt.datetime(b.created_at)}</div>
              </Link>
            );
          })}
          {items.length === 0 && <p className="text-textMuted">No bookmarks yet.</p>}
        </div>
      </div>
    </div>
  );
}
