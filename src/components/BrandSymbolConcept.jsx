const symbols = {
  book: {
    name: '열린 책과 빛의 길',
    description: '정보를 통해 삶의 다음 장을 준비한다는 의미를 담은 뉴스형 심볼',
  },
  monogram: {
    name: 'ㅅㄹ 모노그램',
    description: '시니어 라이프의 첫 자음을 하나의 단정한 기호로 구성한 브랜드형 심볼',
  },
  flow: {
    name: '연결의 흐름',
    description: '건강·복지·생활의 정보가 삶으로 이어지는 모습을 곡선으로 표현한 라인형 심볼',
  },
};

function SymbolSvg({ type, size = 96 }) {
  const gradientId = `brand-gradient-${type}`;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 96 96',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  return (
    <svg {...common} className={`brand-symbol-svg brand-symbol-${type}`}>
      <defs>
        <linearGradient id={gradientId} x1="10" y1="10" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#73A8FF" />
          <stop offset=".48" stopColor="#688CFF" />
          <stop offset="1" stopColor="#27114D" />
        </linearGradient>
      </defs>
      {type === 'book' && <>
        <path d="M16 66.5C26.5 59.5 37 60 48 67V31C37 24 26.5 23.5 16 30.5V66.5Z" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinejoin="round" />
        <path d="M80 66.5C69.5 59.5 59 60 48 67V31C59 24 69.5 23.5 80 30.5V66.5Z" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinejoin="round" />
        <path d="M48 49V14M48 14L38 24M48 14L58 24" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </>}
      {type === 'monogram' && <>
        <path d="M20 30L48 14L76 30" stroke={`url(#${gradientId})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M30 42V65C30 76 39 82 48 82C57 82 66 76 66 65V42" stroke={`url(#${gradientId})`} strokeWidth="6" strokeLinecap="round" />
        <path d="M39 52H57" stroke={`url(#${gradientId})`} strokeWidth="6" strokeLinecap="round" />
      </>}
      {type === 'flow' && <>
        <path d="M11 71C25 71 26 25 47 25C68 25 68 71 85 71" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" />
        <path d="M11 58C26 58 29 37 47 37C65 37 68 58 85 58" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" opacity=".83" />
        <path d="M11 45C27 45 31 49 47 49C63 49 69 45 85 45" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" opacity=".67" />
        <circle cx="47" cy="49" r="5.5" fill={`url(#${gradientId})`} />
      </>}
    </svg>
  );
}

export default function BrandSymbolConcept({ type, compact = false }) {
  const symbol = symbols[type];
  return (
    <div className={`brand-symbol-concept brand-symbol-concept-${type}${compact ? ' is-compact' : ''}`}>
      <span className="brand-symbol-mark"><SymbolSvg type={type} size={compact ? 58 : 90} /></span>
      {!compact && (
        <div className="brand-symbol-copy">
          <strong>{symbol.name}</strong>
          <p>{symbol.description}</p>
        </div>
      )}
    </div>
  );
}

export function BrandLogoLockup({ type }) {
  return (
    <div className="brand-logo-lockup">
      <BrandSymbolConcept type={type} compact />
      <div>
        <strong>시니어 라이프 뉴스</strong>
        <span>SENIOR LIFE NEWS</span>
      </div>
    </div>
  );
}
