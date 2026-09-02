export default function SocialAuthButtons({ mode, onSelect }) {
  const action = mode === 'signup' ? '회원가입' : '로그인';

  return (
    <div className="social-auth-grid" aria-label={`소셜 ${action}`}>
      <button className="social-auth-button kakao" type="button" onClick={() => onSelect('kakao')}>
        <span className="social-auth-mark" aria-hidden="true">K</span>
        카카오로 {action}
      </button>
      <button className="social-auth-button naver" type="button" onClick={() => onSelect('naver')}>
        <span className="social-auth-mark" aria-hidden="true">N</span>
        네이버로 {action}
      </button>
    </div>
  );
}
