import { Link } from 'react-router-dom';

export default function AuthBrand() {
  return (
    <Link className="auth-wordmark" to="/" aria-label="시니어 라이프 뉴스 홈">
      <strong>시니어 라이프 뉴스</strong>
      <span>SENIOR LIFE NEWS</span>
      <i aria-hidden="true" />
    </Link>
  );
}
