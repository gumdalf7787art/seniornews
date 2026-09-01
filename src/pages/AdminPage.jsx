import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  FilePenLine,
  ImageUp,
  LoaderCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { categories } from "../data/articles";
import ArticleBlockEditor, {
  blocksFromArticle,
  createTextBlock,
  serializeBlocks,
} from "../components/ArticleBlockEditor";

const emptyForm = {
  title: "",
  slug: "",
  summary: "",
  category: "health",
  blocks: [createTextBlock()],
  image_url: "",
  image_alt: "",
  source_text: "",
};
const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_OPTIMIZED_IMAGE_BYTES = 4.5 * 1024 * 1024;

async function optimizeImageForWeb(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.86;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  while (blob && blob.size > MAX_OPTIMIZED_IMAGE_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  }
  if (!blob || blob.size > MAX_OPTIMIZED_IMAGE_BYTES) throw new Error("이미지를 웹용 크기로 최적화하지 못했습니다.");
  const fileName = `${file.name.replace(/\.[^.]+$/, "") || "article-image"}.webp`;
  return new File([blob], fileName, { type: "image/webp" });
}
const statusLabel = {
  draft: "작성 중",
  review: "발행 요청",
  scheduled: "예약 발행",
  published: "공개 중",
  archived: "보관됨",
};

function statusClass(status) {
  return `status status-${status || "draft"}`;
}

export default function AdminPage({ user }) {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageUploadStatus, setImageUploadStatus] = useState("");
  const [inlineImageUploads, setInlineImageUploads] = useState(0);

  const isCreator = user.role === "admin";
  const displayRole = isCreator ? "관리자" : "기자";

  const loadArticles = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/articles", {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setItems(data.articles || []);
    } catch (error) {
      setMessage(error.message || "기사 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadArticles();
    }, 0);
    return () => window.clearTimeout(requestId);
  }, []);

  const filteredItems = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((article) => article.status === filter),
    [items, filter],
  );
  const counts = useMemo(
    () => ({
      draft: items.filter((item) => item.status === "draft").length,
      review: items.filter((item) => item.status === "review").length,
      published: items.filter((item) => item.status === "published").length,
    }),
    [items],
  );

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "image_url") {
      setPendingImage(null);
      setImagePreviewUrl(value);
      setImageUploadStatus(value ? "이미지 주소 사용" : "");
    }
  };

  const makeSlug = (title) => {
    const latin = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return latin.length >= 3 ? latin : `article-${Date.now()}`;
  };

  const openNewArticle = () => {
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setForm(emptyForm);
    setPendingImage(null);
    setImagePreviewUrl("");
    setImageUploadStatus("");
    setEditingId(null);
    setMessage("");
    setView("editor");
  };

  const openEditor = (article) => {
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setForm({
      title: article.title || "",
      slug: article.slug || "",
      summary: article.summary || "",
      category: article.category_slug || "health",
      blocks: blocksFromArticle(article),
      image_url: article.image_url || "",
      image_alt: article.image_alt || "",
      source_text: article.source_text || "",
    });
    setEditingId(article.id);
    setPendingImage(null);
    setImagePreviewUrl(article.image_url || "");
    setImageUploadStatus(article.image_url ? "저장된 대표 이미지" : "");
    setMessage("");
    setView("editor");
  };

  const save = async (status) => {
    if (uploading || inlineImageUploads) {
      setMessage("이미지 업로드가 끝난 뒤 저장 또는 발행해 주세요.");
      return;
    }
    const { bodyJson, bodyText } = serializeBlocks(form.blocks);
    const payload = {
      ...form,
      slug: form.slug || makeSlug(form.title),
      status,
      body_json: bodyJson,
      body_text: bodyText,
    };
    if (payload.slug !== form.slug)
      setForm((current) => ({ ...current, slug: payload.slug }));
    if (
      !payload.title.trim() ||
      !payload.summary.trim() ||
      !payload.body_text.trim()
    ) {
      setMessage("제목, 요약, 본문은 꼭 입력해 주세요.");
      return;
    }
    if ((payload.image_url || pendingImage) && !payload.image_alt.trim()) {
      setMessage("대표 이미지를 사용하려면 이미지 설명을 입력해 주세요.");
      return;
    }
    if (
      status === "published" &&
      !window.confirm(
        editingId
          ? "수정한 내용을 반영하고 지금 바로 발행할까요?"
          : "이 기사를 지금 바로 발행할까요?",
      )
    )
      return;
    setSaving(true);
    setMessage(
      status === "review"
        ? "발행을 요청하는 중입니다."
        : status === "published"
          ? "기사를 발행하는 중입니다."
          : "기사를 저장하는 중입니다.",
    );
    try {
      if (pendingImage) {
        setUploading(true);
        setImageUploadStatus("R2 업로드 중");
        setMessage(
          "대표 이미지를 저장소에 올리는 중입니다. 잠시만 기다려 주세요.",
        );
        const imageData = new FormData();
        imageData.append("file", pendingImage);
        imageData.append("alt", form.image_alt.trim());
        const imageResponse = await fetch("/api/admin/media", {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "SeniorNews" },
          body: imageData,
        });
        const imageResult = await imageResponse
          .json()
          .catch(() => ({
            message: "이미지 서버 응답을 확인하지 못했습니다.",
          }));
        if (!imageResponse.ok || !imageResult.url)
          throw new Error(
            imageResult.message || "이미지를 저장하지 못했습니다.",
          );
        payload.image_url = imageResult.url;
        setForm((current) => ({ ...current, image_url: imageResult.url }));
        setImagePreviewUrl(imageResult.url);
        setImageUploadStatus("R2 업로드 완료");
      }
      const response = await fetch(
        editingId ? `/api/admin/articles/${editingId}` : "/api/admin/articles",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "SeniorNews",
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage(
        status === "review"
          ? "발행 요청을 보냈습니다. 관리자가 바로 발행하거나 수정 후 발행할 수 있습니다."
          : status === "published"
            ? "기사를 바로 발행했습니다."
            : "기사를 임시 저장했습니다.",
      );
      await loadArticles();
      setView("dashboard");
      if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
      setForm(emptyForm);
      setPendingImage(null);
      setImagePreviewUrl("");
      setImageUploadStatus("");
      setEditingId(null);
    } catch (error) {
      setImageUploadStatus("업로드 실패");
      setMessage(error.message || "기사를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const publish = async (article) => {
    if (
      !window.confirm(
        `“${article.title}” 기사를 지금 ${isCreator ? "발행" : "직접 발행"}할까요?`,
      )
    )
      return;
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
      setMessage(
        isCreator ? "기사를 발행했습니다." : "기사를 직접 발행했습니다.",
      );
      await loadArticles();
    } catch (error) {
      setMessage(error.message || "기사를 발행하지 못했습니다.");
    }
  };

  const archiveArticle = async (article) => {
    if (!window.confirm(`“${article.title}” 기사를 비공개로 전환할까요? 기사 내용은 보관되며 나중에 복원할 수 있습니다.`)) return;
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/archive`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "SeniorNews" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage("기사를 비공개로 전환했습니다. 보관됨 목록에서 복원할 수 있습니다.");
      await loadArticles();
    } catch (error) {
      setMessage(error.message || "기사를 비공개로 전환하지 못했습니다.");
    }
  };

  const restoreArticle = async (article) => {
    if (!window.confirm(`“${article.title}” 기사를 작성 중 상태로 복원할까요?`)) return;
    try {
      const response = await fetch(`/api/admin/articles/${article.id}/restore`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "SeniorNews" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage("기사를 작성 중 상태로 복원했습니다.");
      await loadArticles();
      setFilter("draft");
    } catch (error) {
      setMessage(error.message || "기사를 복원하지 못했습니다.");
    }
  };

  const deleteArticle = async (article) => {
    if (!window.confirm(`“${article.title}” 기사를 영구 삭제할까요? 기사 본문, 북마크와 조회 기록도 함께 삭제되며 되돌릴 수 없습니다.`)) return;
    try {
      const response = await fetch(`/api/admin/articles/${article.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-Requested-With": "SeniorNews" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMessage("기사를 영구 삭제했습니다.");
      await loadArticles();
    } catch (error) {
      setMessage(error.message || "기사를 삭제하지 못했습니다.");
    }
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      const notice = "이미지 파일만 첨부할 수 있습니다.";
      setMessage(notice);
      window.alert(notice);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      const notice = "첨부할 수 없는 이미지입니다. 사진 파일은 10MB 이하만 첨부할 수 있습니다. 사진 크기를 줄인 뒤 다시 선택해 주세요.";
      setMessage(notice);
      window.alert(notice);
      event.target.value = "";
      return;
    }
    if (imagePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
    setImageUploadStatus("파일 준비 중");
    try {
      const prepared = await optimizeImageForWeb(file);
      setPendingImage(prepared);
      setForm((current) => ({ ...current, image_url: "" }));
      setImageUploadStatus("첨부 완료 · 저장 대기");
      setMessage(`“${file.name}” 이미지가 준비되었습니다. 썸네일을 확인한 뒤 저장 또는 발행 요청을 눌러 주세요.`);
    } catch (error) {
      setPendingImage(null);
      setImageUploadStatus("파일 처리 실패");
      const notice = `${error.message || "이미지를 처리하지 못했습니다."} JPG, PNG 또는 WEBP 파일로 다시 시도해 주세요.`;
      setMessage(notice);
      window.alert(notice);
    }
    event.target.value = "";
  };

  const uploadInlineImage = async (file, alt = "기사 본문 이미지") => {
    if (!file) throw new Error("이미지 파일을 선택해 주세요.");
    if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error("사진 파일은 10MB 이하만 첨부할 수 있습니다.");
    setInlineImageUploads((count) => count + 1);
    setMessage("본문 이미지를 웹용으로 최적화하고 업로드하는 중입니다.");
    try {
      const prepared = await optimizeImageForWeb(file);
      const formData = new FormData();
      formData.append("file", prepared);
      formData.append("alt", alt || "기사 본문 이미지");
      const response = await fetch("/api/admin/media", {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "SeniorNews" },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.message || "본문 이미지를 업로드하지 못했습니다.");
      setMessage("본문 이미지 첨부가 완료되었습니다.");
      return data;
    } finally {
      setInlineImageUploads((count) => Math.max(0, count - 1));
    }
  };

  return (
    <div className="container newsroom-admin">
      <div className="admin-hero">
        <div>
          <p className="eyebrow">{displayRole} 업무 공간</p>
          <h1>기사 관리 센터</h1>
          <p>
            {isCreator
              ? "발행 요청을 확인하고, 필요한 수정 후 바로 발행합니다."
              : "기사를 작성해 발행 요청하거나 직접 발행할 수 있습니다."}
          </p>
        </div>
        <button className="primary-button" onClick={openNewArticle}>
          <Plus size={20} />새 기사 작성
        </button>
      </div>

      {message && (
        <p role="status" className="admin-notice">
          {message}
        </p>
      )}

      <nav className="admin-tabs" aria-label="기사 관리 메뉴">
        <button
          className={view === "dashboard" ? "active" : ""}
          onClick={() => setView("dashboard")}
        >
          내 기사
        </button>
        <button
          className={view === "editor" ? "active" : ""}
          onClick={openNewArticle}
        >
          기사 작성
        </button>
        <Link to="/mypage">마이페이지</Link>
      </nav>

      {view === "dashboard" ? (
        <>
          <section className="editor-stat-grid" aria-label="기사 현황">
            <button onClick={() => setFilter("draft")}>
              <FilePenLine />
              <strong>{counts.draft}</strong>
              <span>작성 중</span>
            </button>
            <button onClick={() => setFilter("review")}>
              <Send />
              <strong>{counts.review}</strong>
              <span>발행 요청</span>
            </button>
            <button onClick={() => setFilter("published")}>
              <CheckCircle2 />
              <strong>{counts.published}</strong>
              <span>공개 중</span>
            </button>
          </section>
          <section className="panel admin-list-panel">
            <div className="panel-heading">
              <div>
                <h2>{isCreator ? "전체 기사" : "내 기사"}</h2>
                <p>
                  {isCreator
                    ? "발행 요청 기사를 바로 발행하거나 수정 후 발행할 수 있습니다."
                    : "임시 저장, 발행 요청, 직접 발행을 선택할 수 있습니다."}
                </p>
              </div>
              <button className="secondary-button" onClick={loadArticles}>
                새로고침
              </button>
            </div>
            <div className="article-filter" aria-label="기사 상태 필터">
              {[
                { id: "all", label: "전체" },
                { id: "draft", label: "작성 중" },
                { id: "review", label: "발행 요청" },
                { id: "published", label: "공개 중" },
                { id: "archived", label: "보관됨" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={filter === item.id ? "active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {loading ? (
              <p className="admin-loading">
                <LoaderCircle className="spin" />
                기사를 불러오는 중입니다.
              </p>
            ) : filteredItems.length ? (
              <div className="editor-article-list">
                {filteredItems.map((article) => (
                  <article key={article.id} className="editor-article-row">
                    <div className="editor-article-copy">
                      <div>
                        <span className={statusClass(article.status)}>
                          {statusLabel[article.status] || article.status}
                        </span>
                        <span className="article-category-label">
                          {article.category_name}
                        </span>
                      </div>
                      <h3>{article.title}</h3>
                      <p>{article.summary}</p>
                      <small>
                        마지막 수정{" "}
                        {String(article.updated_at || "")
                          .slice(0, 16)
                          .replace("T", " ") || "-"}
                        {isCreator && ` · 작성 ${article.author_name}`}
                      </small>
                    </div>
                    <div className="editor-row-actions">
                      <button
                        className="secondary-button"
                        onClick={() => openEditor(article)}
                      >
                        <Pencil size={17} />
                        수정
                      </button>
                      {["draft", "review", "scheduled"].includes(
                        article.status,
                      ) && (
                        <button
                          className="primary-button"
                          onClick={() => publish(article)}
                        >
                          {isCreator ? "발행" : "직접 발행"}
                        </button>
                      )}
                      {article.status === "review" && !isCreator && (
                        <span className="review-waiting">관리자 발행 대기</span>
                      )}
                      {article.status === "archived" ? (
                        <button
                          className="secondary-button"
                          onClick={() => restoreArticle(article)}
                        >
                          <Archive size={17} />
                          복원
                        </button>
                      ) : (
                        <button
                          className="secondary-button"
                          onClick={() => archiveArticle(article)}
                        >
                          <Archive size={17} />
                          비공개
                        </button>
                      )}
                      {isCreator && (
                        <button
                          className="danger-button"
                          onClick={() => deleteArticle(article)}
                        >
                          <Trash2 size={17} />
                          삭제
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>
                  {filter === "all"
                    ? "아직 작성한 기사가 없습니다."
                    : "해당 상태의 기사가 없습니다."}
                </h3>
                <p>
                  새 기사를 작성해 임시 저장, 발행 요청 또는 직접 발행해 보세요.
                </p>
                <button className="primary-button" onClick={openNewArticle}>
                  새 기사 작성
                </button>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="editor-layout">
          <form
            className="form-card article-editor-form"
            onSubmit={(event) => {
              event.preventDefault();
              save("draft");
            }}
          >
            <div className="panel-heading">
              <div>
                <h2>{editingId ? "기사 수정" : "새 기사 작성"}</h2>
                <p>
                  블록을 추가해 문단, 소제목, 인용문, 이미지를 원하는 순서로
                  작성하세요.
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setView("dashboard")}
              >
                목록으로
              </button>
            </div>
            <div className="field">
              <label htmlFor="title">기사 제목</label>
              <input
                id="title"
                name="title"
                value={form.title}
                onChange={update}
                required
                maxLength={150}
                placeholder="독자가 바로 이해할 수 있는 제목을 입력하세요"
              />
            </div>
            <div className="editor-form-grid">
              <div className="field">
                <label htmlFor="category">카테고리</label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={update}
                >
                  {categories.map((category) => (
                    <option value={category.slug} key={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="slug">기사 주소</label>
                <input
                  id="slug"
                  name="slug"
                  value={form.slug}
                  onChange={update}
                  pattern="[a-z0-9-]+"
                  placeholder="영문·숫자·하이픈 (비우면 자동 생성)"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="summary">기사 한눈에 보기</label>
              <textarea
                id="summary"
                name="summary"
                value={form.summary}
                onChange={update}
                required
                maxLength={300}
                placeholder="목록과 공유 화면에 보일 핵심 내용을 2~3문장으로 작성하세요"
              />
            </div>
            <fieldset className="editor-image-field">
              <legend>대표 이미지</legend>
              <div className="field">
                <label htmlFor="image_alt">
                  이미지 설명{" "}
                  <span className="required-text">(이미지 사용 시 필수)</span>
                </label>
                <input
                  id="image_alt"
                  name="image_alt"
                  value={form.image_alt}
                  onChange={update}
                  required={Boolean(form.image_url)}
                  placeholder="이미지에 보이는 내용을 설명해 주세요"
                />
              </div>
              <div className="upload-row">
                <label
                  className="secondary-button upload-label"
                  htmlFor="image-file"
                >
                  <UploadCloud size={18} />
                  {uploading ? "업로드 중" : "이미지 업로드"}
                </label>
                <input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={uploadImage}
                  disabled={uploading}
                />
                <span>이미지를 선택하면 자동으로 웹용 크기로 준비합니다.</span>
              </div>
              {imageUploadStatus && (
                <div className={`image-upload-status ${imageUploadStatus.includes("실패") ? "is-error" : "is-ready"}`} role="status">
                  <strong>{imageUploadStatus}</strong>
                  {pendingImage && <span>{pendingImage.name} · {(pendingImage.size / 1024 / 1024).toFixed(2)}MB</span>}
                </div>
              )}
              <div className="field">
                <label htmlFor="image_url">또는 이미지 주소</label>
                <input
                  id="image_url"
                  name="image_url"
                  type="url"
                  value={form.image_url}
                  onChange={update}
                  placeholder="https://"
                />
              </div>
              {imagePreviewUrl ? (
                <figure className="representative-image-preview">
                  <img className="editor-image-preview" src={imagePreviewUrl} alt={form.image_alt || "대표 이미지 미리보기"} />
                  <figcaption>선택한 대표 이미지 미리보기</figcaption>
                </figure>
              ) : (
                <div className="image-preview-empty">이미지를 선택하면 이곳에 썸네일이 표시됩니다.</div>
              )}
            </fieldset>
            <div className="field">
              <label htmlFor="source_text">자료·출처</label>
              <input
                id="source_text"
                name="source_text"
                value={form.source_text}
                onChange={update}
                placeholder="예: 보건복지부 공개 자료"
              />
            </div>
            <div className="field">
              <label>기사 본문</label>
              <ArticleBlockEditor
                blocks={form.blocks}
                onChange={(blocks) =>
                  setForm((current) => ({ ...current, blocks }))
                }
                onUploadImage={uploadInlineImage}
              />
            </div>
            <div className="editor-submit-actions">
              <button
                className="secondary-button"
                type="submit"
                disabled={saving}
              >
                <FilePenLine size={18} />
                임시 저장
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={saving}
                onClick={() => save("review")}
              >
                <Send size={18} />
                발행 요청
              </button>
            </div>
          </form>
          <aside className="editor-guide">
            <div>
              <ImageUp size={24} />
              <h2>작성 전 확인</h2>
              <ul>
                <li>대표·본문 이미지에는 설명을 꼭 입력합니다.</li>
                <li>본문 이미지에는 캡션을 추가할 수 있습니다.</li>
                <li>건강·금융 기사는 출처를 기록합니다.</li>
                <li>발행 요청 전 필수 항목을 자동 확인합니다.</li>
              </ul>
            </div>
            <div>
              <CalendarClock size={24} />
              <h2>발행 흐름</h2>
              <ol>
                <li>임시 저장</li>
                <li>발행 요청</li>
                <li>관리자 발행 또는 직접 발행</li>
              </ol>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
