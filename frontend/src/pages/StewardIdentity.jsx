import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";

const LESSONS = [
  { title: "Day 1 · The Throne, Not the Treadmill", body: "You are not earning the influx. You are stewarding it. Today's practice: at the start of your work block, declare out loud, 'This belongs to the Lord. I administer it from rest.' Then sit in silence for 90 seconds before you touch the laptop." },
  { title: "Day 2 · The Architecture of Praise", body: "Praise is not a reward for the breakthrough. It's the architecture that holds the breakthrough. Each member who joins NOWCOMMAND is the Lord's seat-fill, not yours. Practice: when a new signup email lands, stop and praise out loud before opening it." },
  { title: "Day 3 · Lock the Identity", body: "Identity decides response. Today, write out: 'I am the steward, not the source. The 300 are the Lord's, not mine. I deliver from rest. I do not chase. I do not flinch.' Read it before opening admin." },
  { title: "Day 4 · The Posture for the Influx", body: "Most ministries die at the breakthrough, not at the lack. The influx exposes the unhealed parts. Today: name one thing you'd grip too tightly if NOWCOMMAND hit 1,000 members. Surrender it now, on paper, by name." },
  { title: "Day 5 · The Sabbath Lock", body: "Pick one day a week. Touch nothing on the platform. Let the scheduler do the work. The drops auto-publish. The win-back system fires. The community runs. Your absence proves the system is from the Lord, not your sweat." },
  { title: "Day 6 · Glory Allocation", body: "Every win is a Romans-8 win. Write down where you'll publicly credit the Lord this week for what's flowing through NOWCOMMAND. Then do it — in the community, in the Tuesday transmission, on social." },
  { title: "Day 7 · The Stewardship Standard", body: "Re-read your Day 3 identity declaration. Now write your standard for the next 90 days: who you become as 300 fills. Specific. Embodied. Repeatable. This is what you protect — more than the MRR." },
];

export default function StewardIdentity() {
  const [done, setDone] = useState(() => JSON.parse(localStorage.getItem("steward_lessons_done") || "{}"));
  const toggle = (i) => { const n = { ...done, [i]: !done[i] }; setDone(n); localStorage.setItem("steward_lessons_done", JSON.stringify(n)); };
  const completed = Object.values(done).filter(Boolean).length;
  return (
    <div>
      <div className="overline mb-3">// IDENTITY COURSE · STEWARD 300 FROM REST</div>
      <h2 className="font-display text-3xl text-cream">A 7-day root for the season ahead.</h2>
      <p className="text-textMuted mt-3 max-w-2xl">For Robin only. Walk through one lesson per day. The platform will run with or without you — these lessons make sure <em>you</em> run from rest, praise, and the right identity while it does. {completed}/{LESSONS.length} complete.</p>
      <div className="h-2 bg-borderGold mt-4 relative overflow-hidden max-w-md"><div className="absolute inset-y-0 left-0 bg-gold" style={{width:`${(completed/LESSONS.length)*100}%`}}/></div>
      <div className="space-y-3 mt-8">
        {LESSONS.map((l, i) => (
          <div key={i} className={`panel p-6 ${done[i] ? "opacity-70" : ""}`}>
            <div className="flex items-start gap-4">
              <button onClick={() => toggle(i)} className="shrink-0 mt-1">{done[i] ? <CheckSquare className="w-5 h-5 text-gold"/> : <Square className="w-5 h-5 text-textMuted"/>}</button>
              <div>
                <h3 className={`font-display text-xl ${done[i] ? "line-through text-textMuted" : "text-cream"}`}>{l.title}</h3>
                <p className="text-cream/90 leading-relaxed mt-2">{l.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
