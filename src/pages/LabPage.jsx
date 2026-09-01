import { Link, NavLink, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, FileText, HandHeart, HeartPulse, Laptop, Mail, Users } from 'lucide-react';

const themes = [
  { icon: HeartPulse, title: '건강한 노화와 예방', description: '몸과 마음의 건강을 오래 지키기 위한 생활 습관과 예방의 조건을 살펴봅니다.' },
  { icon: HandHeart, title: '자립 생활과 돌봄', description: '가능한 오래 자기 삶을 결정하며 살아가기 위한 돌봄과 주거의 해법을 연구합니다.' },
  { icon: Users, title: '경제·일자리와 사회참여', description: '안정적인 생활과 관계를 이어가는 일, 배움, 지역 참여의 방식을 탐색합니다.' },
  { icon: Laptop, title: '디지털 포용과 생활 기술', description: '기술이 장벽이 아닌 일상의 도움이 되도록 시니어 친화적 환경을 제안합니다.' },
];

const researchItems = [
  { slug: 'healthy-aging-brief', type: '이슈 브리프', category: '건강한 노화', date: '2026.09.01', title: '활력 있는 노후를 만드는 세 가지 생활 습관', summary: '건강수명과 일상 기능을 지키는 데 필요한 신체 활동, 관계, 배움의 조건을 정리했습니다.' },
  { slug: 'digital-inclusion-note', type: '연구 노트', category: '디지털 포용', date: '2026.08.25', title: '시니어 디지털 교육, 무엇부터 달라져야 할까', summary: '기능 중심 교육을 넘어 일상의 목적과 반복 경험을 중심으로 한 교육 방향을 제안합니다.' },
  { slug: 'care-community-brief', type: '정책 브리프', category: '돌봄·자립', date: '2026.08.18', title: '지역 안에서 오래 살기 위한 돌봄의 연결', summary: '의료·복지·주거 정보가 단절되지 않도록 지역에서 만들 수 있는 연결 구조를 살펴봅니다.' },
];

const insights = [
  ['건강수명은 왜 ‘오래 사는 것’보다 중요한가', '건강한 일상을 지속할 수 있는 환경과 선택의 중요성을 짚어봅니다.'],
  ['초고령사회, 시니어의 관계망을 다시 생각하다', '관계와 참여가 삶의 만족도에 미치는 영향을 생활의 언어로 풀어봅니다.'],
  ['시니어 친화적 서비스는 무엇이 달라야 하는가', '접근성, 정보의 명확성, 존중의 경험을 기준으로 살펴봅니다.'],
];

function LabMark() {
  return <div className="lab-mark" aria-label="시니어 라이프 연구소"><span>SENIOR LIFE LAB</span><i aria-hidden="true" /></div>;
}

function LabHeader() {
  return <header className="lab-site-header">
    <div className="lab-header-inner">
      <p className="lab-header-tagline">건강한 삶의 후반전을<br />연구합니다.</p>
      <Link className="lab-header-wordmark" to="/lab" aria-label="시니어 라이프 연구소 홈">
        <strong>시니어 라이프 연구소</strong>
        <span>SENIOR LIFE LAB</span>
        <i aria-hidden="true" />
      </Link>
      <Link className="lab-news-shortcut" to="/">
        <strong>시니어 라이프 뉴스</strong>
        <span>Senior Life News</span>
      </Link>
    </div>
    <LabNav />
  </header>;
}

function LabNav() {
  return <nav className="lab-nav" aria-label="시니어 라이프 연구소 메뉴">
    <NavLink to="/lab" end>연구소 홈</NavLink><NavLink to="/lab/about">연구소 소개</NavLink><NavLink to="/lab/research">연구 아카이브</NavLink><NavLink to="/lab/insight">인사이트</NavLink><NavLink to="/lab/contact">협력 문의</NavLink>
  </nav>;
}

function ResearchCard({ item }) {
  return <article className="lab-research-card"><div className="lab-card-meta"><span>{item.type}</span><small>{item.category} · {item.date}</small></div><h3>{item.title}</h3><p>{item.summary}</p><Link to={`/lab/research/${item.slug}`}>연구 읽기 <ArrowRight size={16} /></Link></article>;
}

function LabHome() {
  return <>
    <section className="lab-hero">
      <div className="lab-hero-wave lab-hero-wave-left" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>
      <div className="lab-hero-wave lab-hero-wave-right" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>
      <div className="lab-hero-copy"><p className="lab-kicker">MEDIPROPER · RESEARCH CENTER</p><h1>시니어 라이프 연구소</h1><LabMark /><p className="lab-mission">건강한 삶의 후반전을 연구합니다.</p><p className="lab-intro">시니어의 건강, 자립, 경제, 관계, 디지털 삶을 살피고 더 나은 일상을 위한 실질적인 해법을 제안합니다.</p><div className="lab-hero-actions"><Link className="primary-button" to="/lab/research">최신 연구 보기 <ArrowRight size={18} /></Link><Link className="lab-ghost-button" to="/lab/about">연구소 소개</Link></div></div><aside className="lab-hero-note"><strong>Senior Life Lab</strong><p>시니어의 삶을 더 깊이 이해하고, 사회에 필요한 변화를 함께 만듭니다.</p><span>운영 법인 · (주)메디프라퍼</span></aside>
    </section>

    <section className="lab-section"><div className="lab-section-heading"><div><p className="lab-kicker">OUR FOCUS</p><h2>우리가 연구하는 삶의 장면</h2></div><p>연구소는 시니어의 삶을 하나의 문제로 보지 않고, 서로 연결된 일상의 조건으로 바라봅니다.</p></div><div className="lab-theme-grid">{themes.map(({ icon: Icon, title, description }) => <article key={title}><Icon aria-hidden="true" size={29} /><h3>{title}</h3><p>{description}</p></article>)}</div></section>

    <section className="lab-section lab-research-feature"><div className="lab-section-heading"><div><p className="lab-kicker">LATEST RESEARCH</p><h2>최신 연구·리포트</h2></div><Link to="/lab/research">연구 아카이브 <ArrowRight size={16} /></Link></div><div className="lab-research-grid">{researchItems.map((item) => <ResearchCard item={item} key={item.slug} />)}</div></section>

    <section className="lab-section lab-insight-section"><div className="lab-section-heading"><div><p className="lab-kicker">LAB INSIGHT</p><h2>연구소 인사이트</h2></div><Link to="/lab/insight">모든 인사이트 <ArrowRight size={16} /></Link></div><div className="lab-insight-list">{insights.map(([title, summary], index) => <Link to="/lab/insight" key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{summary}</p></div><ArrowRight aria-hidden="true" size={20} /></Link>)}</div></section>

    <section className="lab-collaboration"><div><p className="lab-kicker">COLLABORATION</p><h2>더 나은 시니어 라이프를<br />함께 연구합니다.</h2><p>의료·복지기관, 지역사회, 대학과 연구자, 기업의 제안과 협력을 기다립니다.</p></div><Link className="lab-light-button" to="/lab/contact">협력·연구 문의 <ArrowRight size={18} /></Link></section>
  </>;
}

function LabAbout() { return <section className="lab-detail"><p className="lab-kicker">ABOUT THE LAB</p><h1>시니어 라이프 연구소는<br />삶의 후반전을 더 깊이 연구합니다.</h1><div className="lab-detail-grid"><div><h2>우리의 역할</h2><p>시니어 라이프 연구소는 (주)메디프라퍼 안에서 시니어의 삶과 사회 변화를 연구하는 조직입니다. 시니어 라이프 뉴스가 오늘 필요한 정보를 전한다면, 연구소는 그 정보의 배경이 되는 변화와 해법을 축적합니다.</p><p>우리는 현장의 목소리, 공공 데이터, 전문가 자문을 바탕으로 건강·자립·관계·배움의 조건을 살핍니다.</p></div><div className="lab-principles"><h2>연구 원칙</h2><p><strong>근거</strong><span>확인할 수 있는 자료와 방법을 바탕으로 합니다.</span></p><p><strong>존중</strong><span>시니어를 보호의 대상이 아니라 삶의 주체로 봅니다.</span></p><p><strong>연결</strong><span>연구 결과가 일상의 변화로 이어지도록 공유합니다.</span></p></div></div></section>; }

function ResearchList() { return <section className="lab-detail"><p className="lab-kicker">RESEARCH ARCHIVE</p><h1>연구 아카이브</h1><p className="lab-detail-lead">시니어 라이프 연구소가 발간한 이슈 브리프, 연구 노트, 정책 제안을 모아봅니다.</p><div className="lab-filter"><button className="active">전체</button><button>건강</button><button>돌봄·자립</button><button>생활·경제</button><button>디지털</button></div><div className="lab-archive-list">{researchItems.map((item) => <ResearchCard item={item} key={item.slug} />)}</div></section>; }

function ResearchDetail({ slug }) { const item = researchItems.find((research) => research.slug === slug) || researchItems[0]; return <article className="lab-detail lab-report"><p className="lab-kicker">{item.type.toUpperCase()}</p><p className="lab-report-meta">{item.category} · {item.date}</p><h1>{item.title}</h1><p className="lab-detail-lead">{item.summary}</p><div className="lab-report-actions"><span className="lab-download-pending"><Download size={17} /> 요약본 준비 중</span><Link to="/lab/research">아카이브로 돌아가기</Link></div><hr /><h2>연구 배경</h2><p>시니어의 삶의 질은 건강뿐 아니라 자립, 관계, 사회 참여의 조건과 연결되어 있습니다. 연구소는 일상에서 바로 적용할 수 있는 관점을 찾기 위해 이 주제를 살펴봤습니다.</p><h2>주요 제안</h2><ol><li>개인의 생활 리듬과 기능을 기준으로 필요한 지원을 살핍니다.</li><li>정보가 필요한 순간에 이해하기 쉬운 언어로 연결합니다.</li><li>지역 안의 관계와 참여 기회를 함께 설계합니다.</li></ol><p className="lab-report-note"><FileText size={18} /> 본 페이지는 연구소의 초기 공개용 이슈 브리프입니다. 조사 범위와 방법은 정식 연구 발간 시 함께 공개합니다.</p></article>; }

function InsightList() { return <section className="lab-detail"><p className="lab-kicker">LAB INSIGHT</p><h1>연구소 인사이트</h1><p className="lab-detail-lead">연구의 관점을 일상 언어로 풀어, 함께 생각할 질문을 나눕니다.</p><div className="lab-insight-list lab-insight-page">{insights.map(([title, summary], index) => <article key={title}><span>0{index + 1}</span><div><h2>{title}</h2><p>{summary}</p></div><BookOpen aria-hidden="true" size={22} /></article>)}</div></section>; }

function LabContact() { return <section className="lab-detail"><p className="lab-kicker">CONTACT & COLLABORATION</p><h1>연구와 협력에 관한<br />이야기를 들려주세요.</h1><p className="lab-detail-lead">연구 제안, 공동 프로젝트, 자문과 강의, 자료 협력에 관한 문의를 받습니다.</p><div className="lab-contact-card"><Mail size={30} aria-hidden="true" /><div><h2>시니어 라이프 연구소</h2><p>연구·협력 문의는 아래 이메일로 보내주세요. 담당자가 확인 후 안내드립니다.</p><a href="mailto:contact@mediproper.com">contact@mediproper.com <ArrowRight size={17} /></a></div></div></section>; }

export default function LabPage() {
  const { section, slug } = useParams();
  let page = <LabHome />;
  if (section === 'about') page = <LabAbout />;
  if (section === 'research') page = slug ? <ResearchDetail slug={slug} /> : <ResearchList />;
  if (section === 'insight') page = <InsightList />;
  if (section === 'contact') page = <LabContact />;
  return <section className="lab-page"><LabHeader /><div className={`lab-page-content ${!section ? 'lab-page-content-home' : ''}`}>{page}</div><footer className="lab-site-footer"><p>시니어 라이프 연구소 · (주)메디프라퍼</p><Link to="/">시니어 라이프 뉴스로 돌아가기 <ArrowRight size={15} /></Link></footer></section>;
}
