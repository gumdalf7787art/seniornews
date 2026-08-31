import { ArrowDown, ArrowUp, Heading2, ImagePlus, Quote, Trash2, Type } from 'lucide-react';

const createId = () => globalThis.crypto?.randomUUID?.() || `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createTextBlock = (type = 'paragraph', text = '') => ({ id: createId(), type, text });

export function blocksFromArticle(article) {
  try {
    const content = JSON.parse(article.body_json || '{}')?.content;
    if (Array.isArray(content) && content.length) {
      return content.map((block) => ({
        id: createId(),
        type: ['heading', 'quote', 'image'].includes(block.type) ? block.type : 'paragraph',
        text: block.text || '',
        url: block.attrs?.src || block.url || '',
        alt: block.attrs?.alt || block.alt || '',
        caption: block.attrs?.caption || block.caption || '',
      }));
    }
  } catch { /* 기존 본문 텍스트로 복원합니다. */ }
  const paragraphs = String(article.body_text || '').split('\n').map((text) => text.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs.map((text) => createTextBlock('paragraph', text)) : [createTextBlock()];
}

export function serializeBlocks(blocks) {
  const content = blocks
    .filter((block) => block.type === 'image' ? block.url : block.text?.trim())
    .map((block) => block.type === 'image'
      ? { type: 'image', attrs: { src: block.url, alt: block.alt?.trim() || '', caption: block.caption?.trim() || '' } }
      : { type: block.type, text: block.text.trim() });
  return {
    bodyJson: JSON.stringify({ type: 'doc', version: 1, content }),
    bodyText: content.filter((block) => block.type !== 'image').map((block) => block.text).join('\n\n'),
  };
}

export default function ArticleBlockEditor({ blocks, onChange, onUploadImage, uploadingBlockId }) {
  const changeBlock = (id, patch) => onChange(blocks.map((block) => block.id === id ? { ...block, ...patch } : block));
  const addBlock = (type) => onChange([...blocks, type === 'image' ? { id: createId(), type: 'image', url: '', alt: '', caption: '' } : createTextBlock(type)]);
  const removeBlock = (id) => onChange(blocks.length === 1 ? [createTextBlock()] : blocks.filter((block) => block.id !== id));
  const moveBlock = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return <section className="block-editor" aria-label="기사 본문 블록 편집기">
    <div className="block-editor-toolbar" role="group" aria-label="본문 블록 추가">
      <button type="button" onClick={() => addBlock('paragraph')}><Type size={17} />문단</button>
      <button type="button" onClick={() => addBlock('heading')}><Heading2 size={17} />소제목</button>
      <button type="button" onClick={() => addBlock('quote')}><Quote size={17} />인용문</button>
      <button type="button" onClick={() => addBlock('image')}><ImagePlus size={17} />본문 이미지</button>
    </div>

    <div className="block-editor-list">
      {blocks.map((block, index) => <div className={`article-block article-block-${block.type}`} key={block.id}>
        <div className="article-block-controls">
          <span>{block.type === 'paragraph' ? '문단' : block.type === 'heading' ? '소제목' : block.type === 'quote' ? '인용문' : '본문 이미지'}</span>
          <div>
            <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} aria-label="위로 이동"><ArrowUp size={16} /></button>
            <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} aria-label="아래로 이동"><ArrowDown size={16} /></button>
            <button type="button" onClick={() => removeBlock(block.id)} aria-label="블록 삭제"><Trash2 size={16} /></button>
          </div>
        </div>

        {block.type === 'image' ? <div className="inline-image-editor">
          <div className="field">
            <label htmlFor={`alt-${block.id}`}>이미지 설명 <span className="required-text">(필수)</span></label>
            <input id={`alt-${block.id}`} value={block.alt} onChange={(event) => changeBlock(block.id, { alt: event.target.value })} placeholder="사진에 보이는 내용을 설명해 주세요" />
          </div>
          <div className="field">
            <label htmlFor={`caption-${block.id}`}>이미지 캡션 <span className="optional-text">(선택)</span></label>
            <input id={`caption-${block.id}`} value={block.caption} onChange={(event) => changeBlock(block.id, { caption: event.target.value })} placeholder="독자에게 보여 줄 사진 설명" />
          </div>
          <div className="upload-row">
            <label className="secondary-button upload-label" htmlFor={`inline-image-${block.id}`}><ImagePlus size={18} />{uploadingBlockId === block.id ? '업로드 중' : '이미지 업로드'}</label>
            <input id={`inline-image-${block.id}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUploadImage(block, event)} disabled={uploadingBlockId === block.id} />
            <span>JPG·PNG·WEBP, 최대 5MB</span>
          </div>
          <div className="field">
            <label htmlFor={`url-${block.id}`}>또는 이미지 주소</label>
            <input id={`url-${block.id}`} type="url" value={block.url} onChange={(event) => changeBlock(block.id, { url: event.target.value })} placeholder="https://" />
          </div>
          {block.url && <figure className="inline-image-preview"><img src={block.url} alt={block.alt || '본문 이미지 미리보기'} /><figcaption>{block.caption || '이미지 캡션을 입력하면 이곳에 표시됩니다.'}</figcaption></figure>}
        </div> : <textarea value={block.text} onChange={(event) => changeBlock(block.id, { text: event.target.value })} placeholder={block.type === 'heading' ? '소제목을 입력하세요' : block.type === 'quote' ? '인용문을 입력하세요' : '본문을 입력하세요'} rows={block.type === 'paragraph' ? 5 : 3} />}
      </div>)}
    </div>
  </section>;
}
