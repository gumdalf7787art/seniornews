const subtitles = {
  recommended: '오늘을 더 잘 살고, 내일을 든든하게 준비하는 뉴스',
  typography: '건강 · 복지 · 생활을 잇는 시니어 뉴스 채널',
  line: '삶의 정보를 차분하고 또렷하게 연결합니다',
};

export default function BrandLogoConcept({ variant = 'recommended' }) {
  const title = variant === 'typography'
    ? <><span>시니어</span><strong> 라이프</strong><span> 뉴스</span></>
    : '시니어 라이프 뉴스';

  return (
    <div className={`brand-logo-concept brand-logo-${variant}`}>
      {variant === 'line' && (
        <span className="brand-logo-lines" aria-hidden="true">
          <i /><i /><i />
        </span>
      )}
      <span className="brand-logo-title">{title}</span>
      <span className="brand-logo-tagline">{subtitles[variant]}</span>
    </div>
  );
}
