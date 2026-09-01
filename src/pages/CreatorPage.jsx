import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CheckCircle2,
  FolderCog,
  ImageUp,
  LayoutDashboard,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";

const statusLabels = {
  active: "활성",
  suspended: "이용 정지",
  withdrawn: "탈퇴",
};
const articleStatusLabels = {
  draft: "작성 중",
  review: "발행 요청",
  scheduled: "예약 발행",
  published: "공개 중",
  archived: "보관됨",
};

function readCount(rows, key) {
  return Number(
    rows.find((row) => row.status === key || row.role === key)?.count || 0,
  );
}

function formatDate(value) {
  return value ? String(value).slice(0, 16).replace("T", " ") : "-";
}

export default function CreatorPage({ user }) {
  const [tab, setTab] = useState("overview");
  const tabsRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const [dashboard, setDashboard] = useState({
    articleCounts: [],
    memberCounts: [],
    reviewArticles: [],
    auditLogs: [],
  });
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", slug: "" });
  const [bannerForm, setBannerForm] = useState({ name: "", image_url: "", image_alt: "", target_url: "", display_order: 0, is_active: true, starts_at: "", ends_at: "" });
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [briefingForm, setBriefingForm] = useState({ category: "복지", message: "", target_url: "", display_order: 0, is_active: true, starts_at: "", ends_at: "" });
  const [editingBriefingId, setEditingBriefingId] = useState(null);

  useEffect(() => {
    tabsRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  useEffect(() => {
    setVisibleCount(20);
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, memberResponse, categoryResponse, bannerResponse, briefingResponse] =
        await Promise.all([
          fetch("/api/admin/dashboard", { credentials: "include" }),
          fetch("/api/admin/users", { credentials: "include" }),
          fetch("/api/admin/categories", { credentials: "include" }),
          fetch("/api/admin/banners", { credentials: "include" }),
          fetch("/api/admin/briefings", { credentials: "include" }),
        ]);
      const [dashboardData, memberData, categoryData, bannerData, briefingData] = await Promise.all([
        dashboardResponse.json(),
        memberResponse.json(),
        categoryResponse.json(),
        bannerResponse.json(),
        briefingResponse.json(),
      ]);
      if (!dashboardResponse.ok) throw new Error(dashboardData.message);
      if (!memberResponse.ok) throw new Error(memberData.message);
      if (!categoryResponse.ok) throw new Error(categoryData.message);
      if (!bannerResponse.ok) throw new Error(bannerData.message);
      if (!briefingResponse.ok) throw new Error(briefingData.message);
      setDashboard(dashboardData);
      setMembers(memberData.users || []);
      setCategories(categoryData.categories || []);
      setBanners(bannerData.banners || []);
      setBriefings(briefingData.briefings || []);
    } catch (error) {
      setMessage(error.message || "관리자 관리 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(requestId);
  }, []);

  const stats = useMemo(
    () => ({
      review: readCount(dashboard.articleCounts, "review"),
      published: readCount(dashboard.articleCounts, "published"),
      editors: readCount(dashboard.memberCounts, "editor"),
      members: readCount(dashboard.memberCounts, "reader"),
    }),
    [dashboard],
  );

  const publish = async (article) => {
    if (!window.confirm(`“${article.title}” 기사를 지금 공개할까요?`)) return;
    try {
      const response = await fetch(
        `/api/admin/articles/${article.id}/publish`,
        {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "SeniorNews" },
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage("기사를 공개했습니다.");
      await loadData();
    } catch (error) {
      setMessage(error.message || "기사를 발행하지 못했습니다.");
    }
  };

  const updateMember = async (member, updates) => {
    const next = {
      role: updates.role ?? member.role,
      status: updates.status ?? member.status,
    };
    try {
      const response = await fetch(`/api/admin/users/${member.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "SeniorNews",
        },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id ? { ...item, ...next } : item,
        ),
      );
      setMessage(`${member.name} 회원의 설정을 저장했습니다.`);
    } catch (error) {
      setMessage(error.message || "회원 설정을 변경하지 못했습니다.");
    }
  };

  const updateCategory = async (category, updates) => {
    const next = {
      display_order: Number(updates.display_order ?? category.display_order),
      is_active: updates.is_active ?? Boolean(category.is_active),
    };
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "SeniorNews",
        },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCategories((current) =>
        current
          .map((item) =>
            item.id === category.id
              ? { ...item, ...next, is_active: next.is_active ? 1 : 0 }
              : item,
          )
          .sort((a, b) => a.display_order - b.display_order),
      );
      setMessage(`${category.name} 카테고리 설정을 저장했습니다.`);
    } catch (error) {
      setMessage(error.message || "카테고리 설정을 변경하지 못했습니다.");
    }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "SeniorNews",
        },
        body: JSON.stringify(newCategory),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setNewCategory({ name: "", slug: "" });
      setMessage("카테고리를 추가했습니다.");
      await loadData();
    } catch (error) {
      setMessage(error.message || "카테고리를 추가하지 못했습니다.");
    }
  };

  const resetBannerForm = () => {
    setEditingBannerId(null);
    setBannerForm({ name: "", image_url: "", image_alt: "", target_url: "", display_order: 0, is_active: true, starts_at: "", ends_at: "" });
  };

  const uploadBannerImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("배너 이미지는 JPG, PNG, WEBP 파일만 사용할 수 있습니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMessage("배너 이미지는 10MB 이하만 업로드할 수 있습니다.");
      return;
    }
    if (!bannerForm.image_alt.trim()) {
      setMessage("이미지 업로드 전에 배너 이미지 설명을 먼저 입력해 주세요.");
      return;
    }
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("alt", bannerForm.image_alt.trim());
      const response = await fetch("/api/admin/banners/media", { method: "POST", credentials: "include", headers: { "X-Requested-With": "SeniorNews" }, body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.message || "배너 이미지를 저장하지 못했습니다.");
      setBannerForm((current) => ({ ...current, image_url: data.url }));
      setMessage("배너 이미지가 저장되었습니다. 아래 등록 버튼을 눌러 광고를 노출해 주세요.");
    } catch (error) {
      setMessage(error.message || "배너 이미지를 저장하지 못했습니다.");
    } finally {
      setBannerUploading(false);
    }
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(editingBannerId ? `/api/admin/banners/${editingBannerId}` : "/api/admin/banners", {
        method: editingBannerId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "SeniorNews" },
        body: JSON.stringify(bannerForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "광고 배너를 저장하지 못했습니다.");
      setMessage(editingBannerId ? "광고 배너를 수정했습니다." : "광고 배너를 등록했습니다.");
      resetBannerForm();
      await loadData();
    } catch (error) {
      setMessage(error.message || "광고 배너를 저장하지 못했습니다.");
    }
  };

  const editBanner = (banner) => {
    setEditingBannerId(banner.id);
    setBannerForm({ ...banner, is_active: Boolean(banner.is_active), starts_at: banner.starts_at || "", ends_at: banner.ends_at || "" });
  };

  const deleteBanner = async (banner) => {
    if (!window.confirm(`“${banner.name}” 광고 배너를 삭제할까요?`)) return;
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE", credentials: "include", headers: { "X-Requested-With": "SeniorNews" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "광고 배너를 삭제하지 못했습니다.");
      setMessage("광고 배너를 삭제했습니다.");
      if (Number(editingBannerId) === Number(banner.id)) resetBannerForm();
      await loadData();
    } catch (error) {
      setMessage(error.message || "광고 배너를 삭제하지 못했습니다.");
    }
  };

  const resetBriefingForm = () => {
    setEditingBriefingId(null);
    setBriefingForm({ category: "복지", message: "", target_url: "", display_order: 0, is_active: true, starts_at: "", ends_at: "" });
  };

  const saveBriefing = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(editingBriefingId ? `/api/admin/briefings/${editingBriefingId}` : "/api/admin/briefings", { method: editingBriefingId ? "PATCH" : "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Requested-With": "SeniorNews" }, body: JSON.stringify(briefingForm) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "오늘의 알림을 저장하지 못했습니다.");
      setMessage(editingBriefingId ? "오늘의 알림을 수정했습니다." : "오늘의 알림을 등록했습니다.");
      resetBriefingForm();
      await loadData();
    } catch (error) {
      setMessage(error.message || "오늘의 알림을 저장하지 못했습니다.");
    }
  };

  const deleteBriefing = async (briefing) => {
    if (!window.confirm("이 알림을 삭제할까요?")) return;
    try {
      const response = await fetch(`/api/admin/briefings/${briefing.id}`, { method: "DELETE", credentials: "include", headers: { "X-Requested-With": "SeniorNews" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "오늘의 알림을 삭제하지 못했습니다.");
      setMessage("오늘의 알림을 삭제했습니다.");
      if (Number(editingBriefingId) === Number(briefing.id)) resetBriefingForm();
      await loadData();
    } catch (error) {
      setMessage(error.message || "오늘의 알림을 삭제하지 못했습니다.");
    }
  };

  const navItems = [
    { id: "overview", label: "운영 현황", icon: LayoutDashboard },
    { id: "review", label: "발행 요청", icon: CheckCircle2 },
    { id: "members", label: "회원·권한", icon: UsersRound },
    { id: "categories", label: "카테고리", icon: FolderCog },
    { id: "banners", label: "광고 배너", icon: Megaphone },
    { id: "briefings", label: "오늘의 알림", icon: Megaphone },
  ];

  return (
    <div className="container creator-page">
      <div className="creator-hero">
        <div>
          <p className="eyebrow">관리자 전용</p>
          <h1>서비스 운영 센터</h1>
          <p>발행 기준과 회원 권한, 카테고리 운영을 한 곳에서 관리합니다.</p>
        </div>
        <Link className="secondary-button" to="/admin">
          <BookOpenCheck size={19} />
          기사 관리센터
        </Link>
      </div>
      {message && (
        <p role="status" className="admin-notice">
          {message}
        </p>
      )}
      <nav ref={tabsRef} className="creator-tabs" aria-label="관리자 관리 메뉴">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      {loading ? (
        <div className="panel creator-loading">
          <RefreshCw className="spin" />
          운영 정보를 불러오는 중입니다.
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <>
              <section className="creator-stat-grid">
                <button onClick={() => setTab("review")}>
                  <Send />
                  <strong>{stats.review}</strong>
                  <span>검수 대기 기사</span>
                </button>
                <button onClick={() => setTab("review")}>
                  <CheckCircle2 />
                  <strong>{stats.published}</strong>
                  <span>공개 중 기사</span>
                </button>
                <button onClick={() => setTab("members")}>
                  <ShieldCheck />
                  <strong>{stats.editors}</strong>
                  <span>기자</span>
                </button>
                <button onClick={() => setTab("members")}>
                  <UsersRound />
                  <strong>{stats.members}</strong>
                  <span>일반회원</span>
                </button>
              </section>
              <section className="creator-overview-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>우선 검수할 기사</h2>
                      <p>검수 요청 순으로 표시됩니다.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("review")}
                    >
                      전체 보기
                    </button>
                  </div>
                  {dashboard.reviewArticles.length ? (
                    <div className="creator-queue">
                      {dashboard.reviewArticles.slice(0, 4).map((article) => (
                        <div key={article.id}>
                          <div>
                            <span className="status status-review">
                              검수 요청
                            </span>
                            <strong>{article.title}</strong>
                            <small>
                              {article.author_name} ·{" "}
                              {formatDate(article.updated_at)}
                            </small>
                          </div>
                          <button
                            className="primary-button"
                            onClick={() => publish(article)}
                          >
                            발행
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">
                      현재 검수 대기 중인 기사가 없습니다.
                    </p>
                  )}
                </div>
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>최근 변경 이력</h2>
                      <p>중요한 운영 변경을 확인합니다.</p>
                    </div>
                  </div>
                  {dashboard.auditLogs.length ? (
                    <div className="audit-list">
                      {dashboard.auditLogs.map((log, index) => (
                        <div key={`${log.created_at}-${index}`}>
                          <strong>{log.user_name || "시스템"}</strong>
                          <span>{log.action.replaceAll("_", " ")}</span>
                          <time>{formatDate(log.created_at)}</time>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">
                      아직 기록된 변경 이력이 없습니다.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
          {tab === "review" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>발행 검수</h2>
                  <p>기자의 검수 요청을 확인한 후 최종 발행합니다.</p>
                </div>
                <button className="secondary-button" onClick={loadData}>
                  <RefreshCw size={17} />
                  새로고침
                </button>
              </div>
              {dashboard.reviewArticles.length ? (
                <div className="creator-review-list">
                  {dashboard.reviewArticles.slice(0, visibleCount).map((article) => (
                    <article key={article.id}>
                      <div>
                        <span className="status status-review">
                          {articleStatusLabels[article.status]}
                        </span>
                        <span className="article-category-label">
                          {article.category_name}
                        </span>
                        <h3>{article.title}</h3>
                        <p>
                          작성자 {article.author_name} · 검수 요청{" "}
                          {formatDate(article.updated_at)}
                        </p>
                      </div>
                      <div>
                        <Link className="secondary-button" to="/admin">
                          내용 확인
                        </Link>
                        <button
                          className="primary-button"
                          onClick={() => publish(article)}
                        >
                          최종 발행
                        </button>
                      </div>
                    </article>
                  ))}
                  {dashboard.reviewArticles.length > visibleCount && (
                    <button
                      type="button"
                      className="mobile-load-more"
                      onClick={() => setVisibleCount((count) => count + 20)}
                    >
                      기사 더 보기
                    </button>
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>검수 대기 중인 기사가 없습니다.</h3>
                  <p>기자가 발행 요청한 기사가 이곳에 표시됩니다.</p>
                </div>
              )}
            </section>
          )}
          {tab === "members" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>회원·권한 관리</h2>
                  <p>
                    관리자, 기자, 일반회원 권한과 이용 상태를
                    관리합니다.
                  </p>
                </div>
              </div>
              <div className="member-admin-list">
                {members.slice(0, visibleCount).map((member) => (
                  <article key={member.id}>
                    <div className="member-admin-main">
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                      <small>
                        {member.provider === "email"
                          ? "이메일 가입"
                          : member.provider}{" "}
                        · 가입 {formatDate(member.created_at)}
                      </small>
                    </div>
                    <div className="member-admin-controls">
                      <label>
                        <span className="sr-only">{member.name} 권한</span>
                        <select
                          value={member.role}
                          onChange={(event) =>
                            updateMember(member, { role: event.target.value })
                          }
                          disabled={Number(member.id) === Number(user?.id)}
                        >
                          <option value="reader">일반회원</option>
                          <option value="editor">기자</option>
                          <option value="admin">관리자</option>
                        </select>
                      </label>
                      <label>
                        <span className="sr-only">{member.name} 상태</span>
                        <select
                          value={member.status}
                          onChange={(event) =>
                            updateMember(member, { status: event.target.value })
                          }
                          disabled={
                            member.status === "withdrawn" ||
                            Number(member.id) === Number(user?.id)
                          }
                        >
                          <option value="active">활성</option>
                          <option value="suspended">이용 정지</option>
                          <option value="withdrawn" disabled>
                            탈퇴
                          </option>
                        </select>
                      </label>
                      <span className={`member-status ${member.status}`}>
                        {statusLabels[member.status] || member.status}
                      </span>
                    </div>
                  </article>
                ))}
                {members.length > visibleCount && (
                  <button
                    type="button"
                    className="mobile-load-more"
                    onClick={() => setVisibleCount((count) => count + 20)}
                  >
                    회원 더 보기
                  </button>
                )}
              </div>
            </section>
          )}
          {tab === "categories" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>카테고리 관리</h2>
                  <p>뉴스 메뉴의 노출 순서와 사용 여부를 관리합니다.</p>
                </div>
              </div>
              <div className="category-admin-list">
                {categories.map((category) => (
                  <article key={category.id}>
                    <div>
                      <strong>{category.name}</strong>
                      <span>/{category.slug}</span>
                    </div>
                    <label>
                      순서{" "}
                      <input
                        type="number"
                        min="1"
                        value={category.display_order}
                        onChange={(event) =>
                          updateCategory(category, {
                            display_order: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="category-active">
                      <input
                        type="checkbox"
                        checked={Boolean(category.is_active)}
                        onChange={(event) =>
                          updateCategory(category, {
                            is_active: event.target.checked,
                          })
                        }
                      />
                      공개
                    </label>
                  </article>
                ))}
              </div>
              <form className="add-category-form" onSubmit={addCategory}>
                <h3>카테고리 추가</h3>
                <div>
                  <input
                    value={newCategory.name}
                    onChange={(event) =>
                      setNewCategory((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="카테고리 이름"
                    required
                    maxLength={30}
                  />
                  <input
                    value={newCategory.slug}
                    onChange={(event) =>
                      setNewCategory((current) => ({
                        ...current,
                        slug: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      }))
                    }
                    placeholder="영문 주소 (예: local-news)"
                    required
                    pattern="[a-z0-9-]{2,40}"
                  />
                  <button className="primary-button">
                    <Plus size={18} />
                    추가
                  </button>
                </div>
              </form>
            </section>
          )}
          {tab === "banners" && (
            <section className="panel banner-admin-panel">
              <div className="panel-heading">
                <div>
                  <h2>광고 배너 관리</h2>
                  <p>홈 주요 뉴스 우측에 노출할 4:3 광고 배너와 연결 주소를 관리합니다.</p>
                </div>
              </div>
              <form className="banner-editor-form" onSubmit={saveBanner}>
                <h3>{editingBannerId ? "광고 배너 수정" : "새 광고 배너 등록"}</h3>
                <div className="banner-form-grid">
                  <label>광고명<input value={bannerForm.name} onChange={(event) => setBannerForm((current) => ({ ...current, name: event.target.value }))} placeholder="관리용 광고명" maxLength={80} required /></label>
                  <label>연결 주소<input type="url" value={bannerForm.target_url} onChange={(event) => setBannerForm((current) => ({ ...current, target_url: event.target.value }))} placeholder="https://" required /></label>
                  <label>이미지 설명<input value={bannerForm.image_alt} onChange={(event) => setBannerForm((current) => ({ ...current, image_alt: event.target.value }))} placeholder="배너 이미지를 설명해 주세요" required /></label>
                  <label>노출 순서<input type="number" min="0" value={bannerForm.display_order} onChange={(event) => setBannerForm((current) => ({ ...current, display_order: event.target.value }))} /></label>
                  <label>노출 시작일<input type="datetime-local" value={bannerForm.starts_at} onChange={(event) => setBannerForm((current) => ({ ...current, starts_at: event.target.value }))} /></label>
                  <label>노출 종료일<input type="datetime-local" value={bannerForm.ends_at} onChange={(event) => setBannerForm((current) => ({ ...current, ends_at: event.target.value }))} /></label>
                </div>
                <div className="banner-image-upload">
                  <label className="secondary-button" htmlFor="banner-image-file"><ImageUp size={18} />{bannerUploading ? "이미지 저장 중" : "배너 이미지 업로드"}</label>
                  <input id="banner-image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadBannerImage} disabled={bannerUploading} />
                  <span>JPG·PNG·WEBP, 최대 10MB · 이미지 설명 입력 후 업로드</span>
                </div>
                {bannerForm.image_url && <img className="banner-form-preview" src={bannerForm.image_url} alt={bannerForm.image_alt || "배너 이미지 미리보기"} />}
                <label className="banner-active"><input type="checkbox" checked={bannerForm.is_active} onChange={(event) => setBannerForm((current) => ({ ...current, is_active: event.target.checked }))} /> 즉시 노출</label>
                <div className="banner-form-actions"><button className="primary-button" disabled={bannerUploading}>{editingBannerId ? "배너 수정" : "배너 등록"}</button>{editingBannerId && <button type="button" className="secondary-button" onClick={resetBannerForm}>등록 취소</button>}</div>
              </form>
              <div className="banner-admin-list">
                {banners.length ? banners.map((banner) => (
                  <article key={banner.id}>
                    <img src={banner.image_url} alt={banner.image_alt} />
                    <div><strong>{banner.name}</strong><a href={banner.target_url} target="_blank" rel="noreferrer">{banner.target_url}</a><small>순서 {banner.display_order} · {banner.is_active ? "노출 중" : "비공개"}{banner.starts_at ? ` · 시작 ${formatDate(banner.starts_at)}` : ""}{banner.ends_at ? ` · 종료 ${formatDate(banner.ends_at)}` : ""}</small></div>
                    <div className="banner-list-actions"><button className="secondary-button" onClick={() => editBanner(banner)}>수정</button><button className="danger-button" onClick={() => deleteBanner(banner)}><Trash2 size={17} />삭제</button></div>
                  </article>
                )) : <p className="muted-copy">등록된 광고 배너가 없습니다. 배너를 등록하면 홈 주요 뉴스 우측에 노출됩니다.</p>}
              </div>
            </section>
          )}
          {tab === "briefings" && (
            <section className="panel briefing-admin-panel">
              <div className="panel-heading"><div><h2>오늘의 시니어 알림 관리</h2><p>최신 뉴스 아래에 노출되는 생활·복지 핵심 알림을 관리합니다.</p></div></div>
              <form className="briefing-editor-form" onSubmit={saveBriefing}>
                <h3>{editingBriefingId ? "알림 수정" : "새 알림 등록"}</h3>
                <div className="briefing-form-grid">
                  <label>분류<input value={briefingForm.category} onChange={(event) => setBriefingForm((current) => ({ ...current, category: event.target.value }))} placeholder="예: 복지" maxLength={20} required /></label>
                  <label>노출 순서<input type="number" min="0" value={briefingForm.display_order} onChange={(event) => setBriefingForm((current) => ({ ...current, display_order: event.target.value }))} /></label>
                  <label className="briefing-wide">알림 문구<input value={briefingForm.message} onChange={(event) => setBriefingForm((current) => ({ ...current, message: event.target.value }))} placeholder="독자가 바로 행동할 수 있는 짧은 문구를 입력하세요" maxLength={120} required /></label>
                  <label className="briefing-wide">연결 주소<input value={briefingForm.target_url} onChange={(event) => setBriefingForm((current) => ({ ...current, target_url: event.target.value }))} placeholder="내부 기사 주소 또는 https:// 공식 안내 주소" required /></label>
                  <label>노출 시작일<input type="datetime-local" value={briefingForm.starts_at} onChange={(event) => setBriefingForm((current) => ({ ...current, starts_at: event.target.value }))} /></label>
                  <label>노출 종료일<input type="datetime-local" value={briefingForm.ends_at} onChange={(event) => setBriefingForm((current) => ({ ...current, ends_at: event.target.value }))} /></label>
                </div>
                <label className="banner-active"><input type="checkbox" checked={briefingForm.is_active} onChange={(event) => setBriefingForm((current) => ({ ...current, is_active: event.target.checked }))} /> 즉시 노출</label>
                <div className="banner-form-actions"><button className="primary-button">{editingBriefingId ? "알림 수정" : "알림 등록"}</button>{editingBriefingId && <button type="button" className="secondary-button" onClick={resetBriefingForm}>등록 취소</button>}</div>
              </form>
              <div className="briefing-admin-list">
                {briefings.length ? briefings.map((briefing) => <article key={briefing.id}><span>{briefing.category}</span><div><strong>{briefing.message}</strong><small>{briefing.target_url} · 순서 {briefing.display_order} · {briefing.is_active ? "노출 중" : "비공개"}</small></div><div className="banner-list-actions"><button className="secondary-button" onClick={() => { setEditingBriefingId(briefing.id); setBriefingForm({ ...briefing, is_active: Boolean(briefing.is_active), starts_at: briefing.starts_at || "", ends_at: briefing.ends_at || "" }); }}>수정</button><button className="danger-button" onClick={() => deleteBriefing(briefing)}><Trash2 size={17} />삭제</button></div></article>) : <p className="muted-copy">등록된 알림이 없습니다. 생활·복지 핵심 정보를 짧게 등록해 보세요.</p>}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
