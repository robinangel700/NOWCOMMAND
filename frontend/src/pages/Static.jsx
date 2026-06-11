import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { marked } from "marked";
import { api } from "../lib/api";

export function LegalPage() {
  const { doc } = useParams();
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/public/legal/${doc}`).then((r) => { setD(r.data); document.title = `${r.data.title} · NOWCOMMAND`; }); }, [doc]);
  if (!d) return null;
  const html = marked.parse(d.body_md || "");
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="overline mb-3">// LEGAL · UPDATED {d.updated}</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream">{d.title}</h1>
        <div className="gold-line my-8"/>
        <div className="legal-prose font-body text-cream/90 leading-[1.8]" dangerouslySetInnerHTML={{__html: html}}/>
      </div>
    </div>
  );
}

export function FAQPage() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  useEffect(() => { api.get("/public/faq").then((r) => setData(r.data)); document.title = "FAQ · NOWCOMMAND"; }, []);
  if (!data) return null;
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="overline mb-3">// FREQUENTLY ASKED</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream">Everything you need to know.</h1>
        <p className="text-textMuted mt-4 max-w-2xl">Search here first. Robin's email is at the bottom — but most questions are answered in this list, faster than you could send a message.</p>
        <div className="mt-12 space-y-10">
          {data.sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-2xl text-gold mb-4">{s.title}</h2>
              <div className="space-y-2">
                {s.qa.map((q, i) => {
                  const key = `${s.title}-${i}`;
                  return (
                    <button key={key} onClick={() => setOpen({...open, [key]: !open[key]})} className="block w-full text-left panel p-5 hover:border-borderGoldHi">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg text-cream">{q.q}</h3>
                        <span className="text-gold text-xl">{open[key] ? "−" : "+"}</span>
                      </div>
                      {open[key] && <p className="text-textMuted text-sm mt-3 leading-relaxed">{q.a}</p>}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
