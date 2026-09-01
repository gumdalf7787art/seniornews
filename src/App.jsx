import { Component, lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NewsLayout from './components/NewsLayout';
import Login from './components/Login';
import SignUp from './components/SignUp';
import KakaoCallback from './components/KakaoCallback';
import NaverCallback from './components/NaverCallback';
import GoogleCallback from './components/GoogleCallback';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const MyPage = lazy(() => import('./pages/MyPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CreatorPage = lazy(() => import('./pages/CreatorPage'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const BrandPreviewPage = lazy(() => import('./pages/BrandPreviewPage'));
const BrandHeaderPreviewPage = lazy(() => import('./pages/BrandHeaderPreviewPage'));
const LabPage = lazy(() => import('./pages/LabPage'));

function ScrollToTop() {
  const { pathname, state } = useLocation();
  useEffect(() => {
    if (!state?.preserveCategoryNavigation) {
      window.scrollTo(0, 0);
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      const categoryShell = document.querySelector('.category-nav-shell');
      if (!categoryShell) return;
      const top = categoryShell.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, state?.preserveCategoryNavigation]);
  return null;
}

function Loading() {
  return <div className="page-loading" role="status">페이지를 불러오고 있습니다.</div>;
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error">
          <div>
            <h1>화면을 표시하지 못했습니다.</h1>
            <p>페이지를 새로고침해 주세요. 문제가 계속되면 아래 오류 내용을 알려주세요.</p>
            <pre>{this.state.error.message}</pre>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>새로고침</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const handleAuthSuccess = (value) => {
    if (value && typeof value === 'object') {
      setUser(value);
      setCheckingSession(false);
      return;
    }
    if (value) {
      fetch('/api/auth/me', { credentials: 'include' }).then((response) => response.ok ? response.json() : null).then((data) => setUser(data?.user || null)).finally(() => setCheckingSession(false));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    fetch('/api/auth/me', { credentials: 'include', signal: controller.signal })
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        return response.ok && contentType.includes('application/json') ? response.json() : null;
      })
      .then((data) => setUser(data?.user || null))
      .catch(() => setUser(null))
      .finally(() => {
        window.clearTimeout(timeout);
        setCheckingSession(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <AppErrorBoundary>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<NewsLayout user={user} />}>
            <Route index element={<HomePage />} />
            <Route path="category/:slug" element={<CategoryPage />} />
            <Route path="article/:slug" element={<ArticlePage user={user} />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="mypage" element={checkingSession ? <Loading /> : user ? <MyPage user={user} setUser={setUser} /> : <Navigate to="/login?next=/mypage" replace />} />
            <Route path="admin" element={checkingSession ? <Loading /> : ['editor', 'admin'].includes(user?.role) ? <AdminPage user={user} /> : <Navigate to="/" replace />} />
            <Route path="creator" element={checkingSession ? <Loading /> : user?.role === 'admin' ? <CreatorPage user={user} /> : <Navigate to="/" replace />} />
            <Route path="about" element={<InfoPage type="about" />} />
            <Route path="editorial-policy" element={<InfoPage type="editorial" />} />
            <Route path="corrections" element={<InfoPage type="corrections" />} />
            <Route path="privacy" element={<InfoPage type="privacy" />} />
            <Route path="terms" element={<InfoPage type="terms" />} />
            <Route path="contact" element={<InfoPage type="contact" />} />
            <Route path="lab" element={<LabPage />} />
            <Route path="lab/:section" element={<LabPage />} />
            <Route path="lab/:section/:slug" element={<LabPage />} />
            <Route path="brand-preview" element={<BrandPreviewPage />} />
          </Route>
          <Route path="login" element={<Login setIsLoggedIn={handleAuthSuccess} />} />
          <Route path="signup" element={<SignUp setIsLoggedIn={handleAuthSuccess} />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="auth/kakao/callback" element={<KakaoCallback setIsLoggedIn={handleAuthSuccess} />} />
          <Route path="auth/naver/callback" element={<NaverCallback setIsLoggedIn={handleAuthSuccess} />} />
          <Route path="auth/google/callback" element={<GoogleCallback setIsLoggedIn={handleAuthSuccess} />} />
          <Route path="brand-header-preview" element={<BrandHeaderPreviewPage user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
