import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SeniorBriefingBar({ briefings = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const multiple = briefings.length > 1;
  const changeSlide = (direction) => {
    setActiveIndex((current) => (current + direction + briefings.length) % briefings.length);
  };

  useEffect(() => {
    if (!multiple || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % briefings.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [briefings.length, multiple]);

  useEffect(() => setActiveIndex(0), [briefings.length]);
  if (!briefings.length) return null;
  const active = briefings[activeIndex] || briefings[0];
  const external = /^https?:\/\//.test(active.target_url);
  return (
    <section className="senior-briefing" aria-label="오늘의 시니어 알림">
      <div className="senior-briefing-title"><Sparkles size={17} /><strong>오늘의 시니어 알림</strong></div>
      <div className="senior-briefing-content" aria-live="polite">
        <span>{active.category}</span>
        <a href={active.target_url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{active.message}</a>
      </div>
      {multiple && <div className="senior-briefing-controls"><span>{activeIndex + 1} / {briefings.length}</span><button type="button" onClick={() => changeSlide(-1)} aria-label="이전 알림"><ChevronLeft size={18} /></button><button type="button" onClick={() => changeSlide(1)} aria-label="다음 알림"><ChevronRight size={18} /></button></div>}
    </section>
  );
}
