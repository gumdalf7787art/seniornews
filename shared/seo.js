export const SITE_NAME = '시니어 라이프 뉴스';
export const SITE_ORIGIN = 'https://seniorlifenews.co.kr';

export const categoryPages = [
  ['health', '건강', '건강한 노후를 위해 일상에서 무엇을 챙겨야 할까요? 운동과 영양, 질환 예방과 건강검진에 관한 기사를 모았습니다.'],
  ['welfare', '복지·정책', '기초연금과 돌봄 서비스는 누가, 어디서 신청할 수 있을까요? 시니어에게 필요한 복지 제도의 지원 대상과 신청 방법, 달라진 정책을 전합니다.'],
  ['life-finance', '생활·금융', '은퇴 후 생활비와 자산을 어떻게 관리할까요? 연금과 금융 거래, 주거비와 소비 등 노후 가계에 필요한 생활 정보를 전합니다.'],
  ['jobs', '일자리', '은퇴 후 다시 일하고 싶은 독자를 위해 시니어 일자리 사업, 재취업 준비와 사회참여 기회를 소개합니다.'],
  ['digital', '디지털', '스마트폰으로 공공서비스를 이용하거나 의심스러운 문자를 받았을 때 무엇을 확인해야 할까요? 디지털 기기 사용법과 온라인 안전 수칙을 안내합니다.'],
  ['culture', '문화·여가', '여가 시간을 어디서 어떻게 보낼까요? 시니어가 즐길 만한 여행, 공연·전시, 취미와 배움에 관한 소식을 모았습니다.'],
].map(([slug, name, description]) => ({ path: `/category/${slug}`, slug, name, description }));

export const publicPages = [
  { path: '/', name: SITE_NAME, description: '시니어 라이프 뉴스는 중장년과 시니어를 위한 온라인 뉴스 매체입니다. 건강관리부터 복지 신청, 노후 생활비, 재취업, 스마트폰 활용, 문화·여가까지 일상에서 마주하는 질문을 기사로 풀어냅니다.' },
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
  const publisher = { '@type': 'NewsMediaOrganization', '@id': `${SITE_ORIGIN}/#publisher`, name: SITE_NAME, url: SITE_ORIGIN + '/', logo: SITE_ORIGIN + '/favicon.png', description: publicPages[0].description };
  website.publisher = { '@id': publisher['@id'] };
  const graph = [website, webpage, publisher];
  if (page.path !== '/') graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_ORIGIN}/` },
    { '@type': 'ListItem', position: 2, name: page.name, item: `${SITE_ORIGIN}${page.path}` },
  ] });
  return { '@context': 'https://schema.org', '@graph': graph };
}
