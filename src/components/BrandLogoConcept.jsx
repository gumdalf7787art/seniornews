const subtitle = 'SENIOR LIFE NEWS';

function FlowLines() {
  return (
    <span className="brand-logo-flow-lines" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
    </span>
  );
}

export default function BrandLogoConcept({ variant = 'recommended' }) {
  const title = variant === 'typography'
    ? <><span>시니어</span><strong> 라이프</strong><span> 뉴스</span></>
    : '시니어 라이프 뉴스';

  return (
    <div className={`brand-logo-concept brand-logo-${variant}`}>
      {variant === 'line' && <FlowLines />}
      <span className="brand-logo-title">{title}</span>
      <span className="brand-logo-tagline">{subtitle}</span>
      {variant === 'recommended' && <span className="brand-logo-rule" aria-hidden="true" />}
      {variant === 'typography' && <span className="brand-logo-underline" aria-hidden="true" />}
      {variant === 'line' && <span className="brand-logo-line-caption">LIFE · INSIGHT · NEWS</span>}
    </div>
  );
}
