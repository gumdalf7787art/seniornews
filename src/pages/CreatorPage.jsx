import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CheckCircle2,
  FolderCog,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
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
  const [dashboard, setDashboard] = useState({
    articleCounts: [],
    memberCounts: [],
    reviewArticles: [],
    auditLogs: [],
  });
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newCategory, setNewCategory] = useState({ name: "", slug: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardResponse, memberResponse, categoryResponse] =
        await Promise.all([
          fetch("/api/admin/dashboard", { credentials: "include" }),
          fetch("/api/admin/users", { credentials: "include" }),
          fetch("/api/admin/categories", { credentials: "include" }),
        ]);
      const [dashboardData, memberData, categoryData] = await Promise.all([
        dashboardResponse.json(),
        memberResponse.json(),
        categoryResponse.json(),
      ]);
      if (!dashboardResponse.ok) throw new Error(dashboardData.message);
      if (!memberResponse.ok) throw new Error(memberData.message);
      if (!categoryResponse.ok) throw new Error(categoryData.message);
      setDashboard(dashboardData);
      setMembers(memberData.users || []);
      setCategories(categoryData.categories || []);
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

  const navItems = [
    { id: "overview", label: "운영 현황", icon: LayoutDashboard },
    { id: "review", label: "발행 요청", icon: CheckCircle2 },
    { id: "members", label: "회원·권한", icon: UsersRound },
    { id: "categories", label: "카테고리", icon: FolderCog },
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
      <nav className="creator-tabs" aria-label="관리자 관리 메뉴">
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
                  {dashboard.reviewArticles.map((article) => (
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
                {members.map((member) => (
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
        </>
      )}
    </div>
  );
}
