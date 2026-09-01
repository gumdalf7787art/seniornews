import BrandLogoConcept from '../components/BrandLogoConcept';
import BrandSymbolConcept, { BrandLogoLockup } from '../components/BrandSymbolConcept';

const concepts = [
  {
    variant: 'recommended',
    number: '01',
    title: '추천안 · 빛의 흐름 워드마크',
    description: '가장 읽기 쉽고 오래 써도 질리지 않는 기본형입니다. 밝은 바탕의 홈페이지 헤더에 가장 안정적으로 어울립니다.',
  },
  {
    variant: 'typography',
    number: '02',
    title: '타이포그래픽 · 라이프 강조',
    description: '“라이프”에 무게를 주어 정보 채널을 넘어 삶을 돕는 뉴스라는 인상을 만듭니다. 제목 자체의 리듬이 살아납니다.',
  },
  {
    variant: 'line',
    number: '03',
    title: '라인 그래픽 · 확장되는 정보의 흐름',
    description: '아홉 겹의 곡선 라인이 삶의 흐름과 연결을 표현합니다. 첨부 이미지의 감도를 가장 직접적으로 계승한 시안입니다.',
  },
];

const symbols = [
  { type: 'book', number: '01', title: '추천안 · 열린 책과 빛의 길', note: '뉴스 채널이라는 정체성이 가장 직관적으로 전달되는 메인 로고 후보' },
  { type: 'monogram', number: '02', title: '타이포형 · ㅅㄹ 모노그램', note: '파비콘과 앱 아이콘에서 독창적인 브랜드 자산이 되는 후보' },
  { type: 'flow', number: '03', title: '라인형 · 연결의 흐름', note: '참조 이미지의 곡선 언어를 이어받은 배너·캠페인용 후보' },
];

export default function BrandPreviewPage() {
  return (
    <main className="brand-preview container">
      <header className="brand-preview-intro">
        <p className="eyebrow">Brand identity draft</p>
        <h1>시니어 라이프 뉴스 로고 시안</h1>
        <p>모두 배경이 없는 HTML/CSS 로고입니다. 제목은 라이프 블루에서 잉크 바이올렛으로 이어지고, 부제는 <strong>SENIOR LIFE NEWS</strong>로 통일했습니다. 흰 헤더와 참조 이미지의 군청–바이올렛 분위기를 적용한 어두운 화면에서 함께 확인할 수 있습니다.</p>
      </header>

      <section className="brand-preview-grid" aria-label="로고 시안 비교">
        {concepts.map((concept) => (
          <article className="brand-preview-card" key={concept.variant}>
            <div className="brand-preview-meta">
              <span>{concept.number}</span>
              <div>
                <h2>{concept.title}</h2>
                <p>{concept.description}</p>
              </div>
            </div>
            <div className="brand-preview-surface is-light">
              <span className="brand-preview-surface-label">흰 배경 헤더</span>
              <BrandLogoConcept variant={concept.variant} />
            </div>
            <div className="brand-preview-surface is-dark">
              <span className="brand-preview-surface-label">어두운 배경</span>
              <BrandLogoConcept variant={concept.variant} />
            </div>
          </article>
        ))}
      </section>

      <section className="brand-symbol-preview" aria-labelledby="brand-symbol-heading">
        <div className="brand-symbol-preview-heading">
          <p className="eyebrow">Logo symbol draft</p>
          <h2 id="brand-symbol-heading">심볼을 결합한 로고 시안</h2>
          <p>위 워드마크는 유지한 채, 심볼을 더한 확장안을 비교합니다. 각 심볼은 SVG 벡터라서 파비콘부터 대형 배너까지 선명하게 사용할 수 있습니다.</p>
        </div>
        <div className="brand-symbol-preview-grid">
          {symbols.map((symbol) => (
            <article className="brand-symbol-preview-card" key={symbol.type}>
              <div className="brand-symbol-card-meta">
                <span>{symbol.number}</span>
                <div><h3>{symbol.title}</h3><p>{symbol.note}</p></div>
              </div>
              <div className="brand-symbol-lockup-surface is-light">
                <BrandLogoLockup type={symbol.type} />
              </div>
              <div className="brand-symbol-icon-surface">
                <BrandSymbolConcept type={symbol.type} />
                <span>심볼 단독 · 앱 아이콘 / 파비콘</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="brand-preview-note">
        <strong>공통 색상</strong>
        <span>Life Blue #73A8FF</span>
        <span>Ink Violet #27114D</span>
        <span>Deep Navy #0B153E</span>
      </aside>
    </main>
  );
}
