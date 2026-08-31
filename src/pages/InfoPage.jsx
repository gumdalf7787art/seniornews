const content = {
  about: { title: '시니어 뉴스 소개', body: <><p>시니어 뉴스는 50~70대 독자가 일상에서 바로 활용할 수 있는 건강, 복지, 생활, 일자리, 디지털, 문화 정보를 쉽고 정확하게 전하는 온라인 매체입니다.</p><h2>우리가 지키는 원칙</h2><p>어려운 용어는 풀어 쓰고, 공식 자료와 취재 출처를 확인하며, 독자가 중요한 결정을 내리는 데 필요한 맥락을 함께 제공합니다.</p></> },
  editorial: { title: '편집 원칙', body: <><h2>정확성</h2><p>사실과 의견을 구분하고, 가능한 경우 둘 이상의 출처를 확인합니다.</p><h2>독립성</h2><p>광고와 편집 콘텐츠를 명확하게 구분하며 이해관계를 공개합니다.</p><h2>시니어 친화성</h2><p>과도한 불안이나 공포를 유발하는 표현을 피하고 이해하기 쉬운 문장과 충분한 설명을 제공합니다.</p></> },
  corrections: { title: '정정·반론 정책', body: <><p>보도 내용에 오류가 확인되면 기사 상단 또는 하단에 수정 시각과 수정 내용을 분명하게 표시합니다.</p><p>정정이나 반론 요청은 문의 페이지를 통해 기사 주소, 요청 내용, 근거 자료와 함께 보내주세요. 편집부가 확인 후 처리 결과를 안내합니다.</p></> },
  privacy: { title: '개인정보처리방침', body: <><p>회원 가입과 서비스 제공에 필요한 최소한의 정보만 수집합니다. 이메일, 이름, 로그인 제공자 정보와 북마크 기록은 로그인 및 개인화 기능 제공 목적으로 사용합니다.</p><p>정식 서비스 개시 전 개인정보 보호책임자, 보유 기간, 처리 위탁 현황을 실제 운영 정보로 확정합니다.</p></> },
  terms: { title: '이용약관', body: <><p>시니어 뉴스의 콘텐츠는 정보 제공을 목적으로 합니다. 의료·금융 관련 기사는 개인을 위한 진단이나 자문을 대신하지 않습니다.</p><p>기사의 무단 복제와 재배포는 제한되며, 인용 시 출처와 원문 주소를 표시해야 합니다.</p></> },
  contact: { title: '문의', body: <><p>기사 제보, 정정 요청, 서비스 이용 문의를 받습니다.</p><div className="form-card"><div className="field"><label>이름</label><input /></div><div className="field"><label>이메일</label><input type="email" /></div><div className="field"><label>문의 내용</label><textarea /></div><button className="primary-button">문의 보내기</button></div><p>정식 서비스 개시 전 수신 이메일과 개인정보 동의 절차를 연결합니다.</p></> },
};

export default function InfoPage({ type }) { const page = content[type] || content.about; return <article className="info-page"><span className="eyebrow">시니어 뉴스 안내</span><h1>{page.title}</h1>{page.body}</article>; }
