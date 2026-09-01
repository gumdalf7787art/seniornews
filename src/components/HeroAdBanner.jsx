import { useEffect, useState } from 'react';

export default function HeroAdBanner({ banners = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const multiple = banners.length > 1;

  useEffect(() => {
    if (!multiple) return undefined;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % banners.length), 6000);
    return () => window.clearInterval(timer);
  }, [banners.length, multiple]);

  useEffect(() => setActiveIndex(0), [banners.length]);

  if (!banners.length) return null;
  return (
    <aside className="hero-ad" aria-label="광고">
      <span className="hero-ad-label">광고</span>
      {banners.map((banner, index) => (
        <a
          key={banner.id}
          className={`hero-ad-slide ${index === activeIndex ? 'active' : ''}`}
          href={banner.target_url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          aria-label={`${banner.name} 광고 열기`}
          aria-hidden={index !== activeIndex}
          tabIndex={index === activeIndex ? 0 : -1}
        >
          <img src={banner.image_url} alt={index === activeIndex ? banner.image_alt : ''} />
        </a>
      ))}
      {multiple && (
        <div className="hero-ad-dots" aria-label="광고 배너 선택">
          {banners.map((item, index) => (
            <button key={item.id} type="button" className={index === activeIndex ? 'active' : ''} onClick={() => setActiveIndex(index)} aria-label={`${index + 1}번 광고 보기`} aria-current={index === activeIndex ? 'true' : undefined} />
          ))}
        </div>
      )}
    </aside>
  );
}
