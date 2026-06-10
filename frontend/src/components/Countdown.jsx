import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";

export default function Countdown({ seconds }) {
  const [left, setLeft] = useState(seconds || 0);
  useEffect(() => { setLeft(seconds || 0); }, [seconds]);
  useEffect(() => {
    if (!seconds) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  if (!seconds) return null;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const cell = (n, label) => (
    <div className="flex flex-col items-center px-3 md:px-5 py-3 border border-borderGold min-w-[64px]">
      <div className="font-display text-3xl md:text-4xl text-gold leading-none">{String(n).padStart(2, "0")}</div>
      <div className="overline text-[9px] mt-1">{label}</div>
    </div>
  );
  return (
    <div className="flex items-center gap-2" data-testid="promo-countdown">
      <Hourglass className="w-5 h-5 text-gold animate-glow" />
      {cell(d, "Days")}
      {cell(h, "Hrs")}
      {cell(m, "Min")}
      {cell(s, "Sec")}
    </div>
  );
}
