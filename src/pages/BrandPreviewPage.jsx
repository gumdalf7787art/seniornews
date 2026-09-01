import BrandLogoConcept from '../components/BrandLogoConcept';

const concepts = [
  {
    variant: 'recommended',
    number: '01',
    title: '추천안 · 차분한 워드마크',
    description: '가장 읽기 쉽고 오래 써도 질리지 않는 기본형입니다. 웹 헤더, 기사 카드, 명함까지 자연스럽게 확장됩니다.',
  },
  {
    variant: 'typography',
    number: '02',
    title: '타이포그래픽 · 라이프 강조',
    description: '“라이프”에 무게를 주어 정보 채널을 넘어 삶을 돕는 뉴스라는 인상을 만듭니다.',
  },
  {
    variant: 'line',
    number: '03',
    title: '라인 그래픽 · 정보의 흐름',
    description: '얇은 선이 정보와 세대를 연결하는 흐름을 표현합니다. 배너와 캠페인 소재에서 특히 돋보입니다.',
  },
];

export default function BrandPreviewPage() {
  return (
    <main className="brand-preview container">
      <header className="brand-preview-intro">
        <p className="eyebrow">Brand identity draft</p>
        <h1>시니어 라이프 뉴스 로고 시안</h1>
        <p>모두 배경이 없는 HTML/CSS 로고입니다. 제목은 라이프 블루에서 잉크 바이올렛으로 이어지며, 흰 헤더와 어두운 홍보 화면에서의 사용 모습을 함께 확인할 수 있습니다.</p>
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

      <aside className="brand-preview-note">
        <strong>공통 색상</strong>
        <span>Life Blue #73A8FF</span>
        <span>Ink Violet #27114D</span>
        <span>Deep Navy #0B153E</span>
      </aside>
    </main>
  );
}
