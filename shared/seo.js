export const SITE_NAME = '시니어 라이프 뉴스';
export const SITE_ORIGIN = 'https://seniorlifenews.co.kr';

export const categoryPages = [
  ['health', '건강', '시니어 건강관리, 질환 예방, 운동과 영양 정보를 쉽고 정확하게 전합니다.'],
  ['welfare', '복지·정책', '기초연금, 돌봄, 지원 제도 등 시니어가 알아야 할 복지 혜택과 정책 소식을 전합니다.'],
  ['life-finance', '생활·금융', '노후 생활에 필요한 금융, 소비, 주거와 생활 정보를 살펴봅니다.'],
  ['jobs', '일자리', '시니어 일자리, 재취업과 사회참여에 도움이 되는 소식을 전합니다.'],
  ['digital', '디지털', '스마트폰 활용부터 온라인 안전까지 시니어의 디지털 생활을 돕습니다.'],
  ['culture', '문화·여가', '여행, 문화, 취미와 배움으로 풍요로운 시니어 일상을 제안합니다.'],
].map(([slug, name, description]) => ({ path: `/category/${slug}`, slug, name, description }));

export const publicPages = [
  { path: '/', name: SITE_NAME, description: '건강, 복지·정책, 생활·금융, 일자리, 디지털, 문화·여가까지. 시니어의 삶에 필요한 정보를 정확하고 쉽게 전합니다.' },
  ...categoryPages,
  { path: '/lab', name: '시니어 라이프 연구소', description: '시니어의 건강, 자립, 경제, 관계, 디지털 삶을 살피고 더 나은 일상을 위한 실질적인 해법을 제안합니다.' },
  { path: '/about', name: '매체 소개', description: '시니어 라이프 뉴스의 소개와 쉽고 정확한 정보를 전하기 위한 원칙을 안내합니다.' },
  { path: '/editorial-policy', name: '편집 원칙', description: '정확성, 독립성, 시니어 친화성을 바탕으로 한 시니어 라이프 뉴스의 편집 원칙입니다.' },
  { path: '/corrections', name: '정정·반론 정책', description: '보도 오류의 수정과 정정·반론 요청 처리 원칙을 안내합니다.' },
];

export function pageMetadata(path) {
  return publicPages.find((page) => page.path === path);
}

export function pageTitle(page) {
  return page.path === '/' ? `${SITE_NAME} | 건강·복지·생활 정보` : `${page.name} | ${SITE_NAME}`;
}

export function pageSchema(page) {
  const website = { '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: SITE_NAME, alternateName: ['시니어라이프뉴스', 'Senior Life News'], inLanguage: 'ko-KR' };
  const webpage = { '@type': page.path.startsWith('/category/') ? 'CollectionPage' : 'WebPage', '@id': `${SITE_ORIGIN}${page.path}#webpage`, url: `${SITE_ORIGIN}${page.path}`, name: pageTitle(page), description: page.description, isPartOf: { '@id': website['@id'] }, inLanguage: 'ko-KR' };
  const graph = [website, webpage];
  if (page.path !== '/') graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_ORIGIN}/` },
    { '@type': 'ListItem', position: 2, name: page.name, item: `${SITE_ORIGIN}${page.path}` },
  ] });
  return { '@context': 'https://schema.org', '@graph': graph };
}
