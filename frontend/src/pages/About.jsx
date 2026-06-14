import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function About() {
  const [m, setM] = useState(null);
  useEffect(() => { api.get("/public/state").then(() => {}); }, []);
  // Manifesto requires auth in our setup; show static fallback if public
  useEffect(() => { (async () => {
    try { const r = await api.get("/community/feed"); setM(r.data.manifesto?.body_md); } catch (e) { console.error("Could not load manifesto", e); }
  })(); }, []);
  return (
    <div className="min-h-screen px-6 lg:px-10 py-24">
      <div className="max-w-3xl mx-auto">
        <div className="overline mb-4">// MANIFESTO</div>
        <h1 className="font-display text-5xl md:text-7xl text-cream leading-none">The NOWCOMMAND Manifesto.</h1>
        <pre className="whitespace-pre-wrap font-display text-2xl md:text-3xl text-cream/90 leading-snug mt-12">{m || `We do not chase money. We assign it.

We do not negotiate with delay. We evict it.

We do not wait for the right time. We carry it.

We rule over the increase. We operate in Kairos. We rest as sovereigns.

— Robin Angel`}</pre>
      </div>
    </div>
  );
}
