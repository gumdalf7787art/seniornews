import { Bold, ImagePlus, Link2, Quote, Type } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const createId = () => globalThis.crypto?.randomUUID?.() || `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const plainText = (value = '') => value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\u00a0/g, ' ').trim();

export const createTextBlock = (type = 'paragraph', text = '') => ({ id: createId(), type, text, html: text });

export function blocksFromArticle(article) {
  try {
    const parsed = JSON.parse(article.body_json || '{}');
    const content = Array.isArray(parsed) ? parsed : parsed.content;
    if (Array.isArray(content) && content.length) {
      return content.map((block) => ({
        id: createId(),
        type: block.type === 'heading' ? 'sectionTitle' : ['paragraph', 'quote', 'sectionTitle', 'image'].includes(block.type) ? block.type : 'paragraph',
        text: block.text || plainText(block.html || ''),
        html: block.html || block.text || '',
        variant: block.attrs?.variant || block.variant || 'bar',
        url: block.attrs?.src || block.url || '',
        alt: block.attrs?.alt || block.alt || '',
        caption: block.attrs?.caption || block.caption || '',
      }));
    }
  } catch { /* Older articles fall back to their searchable text. */ }
  const paragraphs = String(article.body_text || '').split(/\n{2,}/).map((text) => text.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs.map((text) => createTextBlock('paragraph', text)) : [createTextBlock()];
}

export function serializeBlocks(blocks) {
  const content = blocks
    .filter((block) => block.type === 'image' ? block.url : plainText(block.html || block.text || ''))
    .map((block) => block.type === 'image'
      ? { type: 'image', attrs: { src: block.url, alt: block.alt?.trim() || '기사 본문 이미지', caption: block.caption?.trim() || '' } }
      : { type: block.type, text: plainText(block.html || block.text || ''), html: block.html || block.text || '', attrs: block.type === 'sectionTitle' ? { variant: block.variant || 'bar' } : undefined });
  return {
    bodyJson: JSON.stringify({ type: 'doc', version: 2, content }),
    bodyText: content.filter((block) => block.type !== 'image').map((block) => block.text).join('\n\n'),
  };
}

function blocksSignature(blocks) {
  return JSON.stringify(blocks.map(({ type, text, html, variant, url, alt, caption }) => ({ type, text, html, variant, url, alt, caption })));
}

function createTextElement(type, variant = 'bar') {
  const element = document.createElement(type === 'quote' ? 'blockquote' : type === 'sectionTitle' ? 'h3' : 'p');
  element.dataset.editorType = type;
  if (type === 'sectionTitle') element.dataset.variant = variant;
  element.innerHTML = '<br>';
  return element;
}

function createImageElement({ url, alt = '기사 본문 이미지', caption = '', pending = false }) {
  const figure = document.createElement('figure');
  figure.dataset.editorType = 'image';
  figure.contentEditable = 'false';
  const image = document.createElement('img');
  image.src = url;
  image.alt = alt;
  figure.append(image);
  const figcaption = document.createElement('figcaption');
  figcaption.contentEditable = 'true';
  figcaption.dataset.caption = 'true';
  figcaption.dataset.placeholder = '사진 설명 입력 (선택)';
  figcaption.textContent = caption;
  figure.append(figcaption);
  if (pending) {
    const status = document.createElement('span');
    status.className = 'editor-image-uploading';
    status.textContent = '이미지를 웹용으로 최적화하고 있습니다…';
    figure.append(status);
  }
  return figure;
}

function renderBlocks(editor, blocks) {
  editor.replaceChildren();
  blocks.forEach((block) => {
    if (block.type === 'image' && block.url) editor.append(createImageElement(block));
    else {
      const element = createTextElement(block.type === 'quote' ? 'quote' : block.type === 'sectionTitle' || block.type === 'heading' ? 'sectionTitle' : 'paragraph', block.variant);
      element.innerHTML = block.html || block.text || '<br>';
      editor.append(element);
    }
  });
  if (!editor.children.length) editor.append(createTextElement('paragraph'));
}

function readBlocks(editor) {
  return [...editor.children].flatMap((node) => {
    const type = node.dataset.editorType;
    if (type === 'image') {
      const image = node.querySelector('img');
      if (!image?.src) return [];
      const caption = node.querySelector('[data-caption]')?.textContent?.trim() || '';
      return [{ id: createId(), type: 'image', url: image.src, alt: image.alt || '기사 본문 이미지', caption }];
    }
    const nextType = ['paragraph', 'quote', 'sectionTitle'].includes(type) ? type : 'paragraph';
    return [{ id: createId(), type: nextType, html: node.innerHTML, text: plainText(node.innerHTML), variant: node.dataset.variant || 'bar' }];
  });
}

function moveCaretToEnd(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  element.focus();
}

export default function ArticleBlockEditor({ blocks, onChange, onUploadImage }) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const inputRef = useRef(null);
  const [signature, setSignature] = useState('');
  const [titleMenuOpen, setTitleMenuOpen] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const nextSignature = blocksSignature(blocks);
    if (editorRef.current && signature !== nextSignature) {
      renderBlocks(editorRef.current, blocks);
      setSignature(nextSignature);
    }
  }, [blocks, signature]);

  const sync = () => {
    if (!editorRef.current) return;
    const next = readBlocks(editorRef.current);
    const nextSignature = blocksSignature(next);
    setSignature(nextSignature);
    onChange(next);
  };

  const saveRange = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  };

  const getSavedRange = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = savedRangeRef.current;
    if (range && editor?.contains(range.startContainer)) {
      selection.removeAllRanges();
      selection.addRange(range);
      return range;
    }
    const fallback = document.createRange();
    fallback.selectNodeContents(editor);
    fallback.collapse(false);
    return fallback;
  };

  const insertTextBlock = (type, variant) => {
    const range = getSavedRange();
    const block = createTextElement(type, variant);
    range.deleteContents();
    range.insertNode(block);
    const spacer = createTextElement('paragraph');
    block.after(spacer);
    moveCaretToEnd(block);
    sync();
  };

  const selectTitleStyle = (variant) => {
    insertTextBlock('sectionTitle', variant);
    setTitleMenuOpen(false);
  };

  const handleEditorKeyDown = (event) => {
    if (event.key !== 'Backspace' || !event.currentTarget) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.getRangeAt(0).collapsed) return;
    const range = selection.getRangeAt(0);
    const current = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const title = current?.closest?.('h3[data-editor-type="sectionTitle"]');
    if (!title || plainText(title.innerHTML)) return;

    event.preventDefault();
    const previous = title.previousElementSibling;
    const next = title.nextElementSibling;
    title.remove();
    if (previous) moveCaretToEnd(previous);
    else if (next) {
      const nextRange = document.createRange();
      nextRange.selectNodeContents(next);
      nextRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      editorRef.current?.focus();
    } else {
      const paragraph = createTextElement('paragraph');
      editorRef.current.append(paragraph);
      moveCaretToEnd(paragraph);
    }
    sync();
  };

  const toggleBold = () => {
    editorRef.current?.focus();
    getSavedRange();
    document.execCommand('bold');
    sync();
  };

  const insertImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setModalMessage('이미지 파일만 첨부할 수 있습니다. JPG, PNG, WEBP 파일을 선택해 주세요.');
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setModalMessage('첨부할 수 없는 이미지입니다. 사진 파일은 10MB 이하만 첨부할 수 있습니다. 사진 크기를 줄인 뒤 다시 선택해 주세요.');
      return;
    }
    const range = getSavedRange();
    const localUrl = URL.createObjectURL(file);
    const figure = createImageElement({ url: localUrl, pending: true });
    range.deleteContents();
    range.insertNode(figure);
    const spacer = createTextElement('paragraph');
    figure.after(spacer);
    moveCaretToEnd(spacer);
    try {
      const uploaded = await onUploadImage(file, '기사 본문 이미지');
      const image = figure.querySelector('img');
      if (image) image.src = uploaded.url;
      if (image) image.alt = uploaded.alt || '기사 본문 이미지';
      figure.querySelector('.editor-image-uploading')?.remove();
      URL.revokeObjectURL(localUrl);
      sync();
    } catch (error) {
      figure.querySelector('.editor-image-uploading')?.remove();
      figure.classList.add('editor-image-failed');
      const failure = document.createElement('span');
      failure.className = 'editor-image-upload-error';
      failure.textContent = error.message || '이미지를 업로드하지 못했습니다. 이미지를 삭제한 뒤 다시 시도해 주세요.';
      figure.append(failure);
      sync();
    }
  };

  const insertLinkedImage = () => {
    const url = linkValue.trim();
    if (!/^https?:\/\//i.test(url)) {
      setModalMessage('http:// 또는 https://로 시작하는 이미지 주소를 입력해 주세요.');
      return;
    }
    const range = getSavedRange();
    const figure = createImageElement({ url });
    range.deleteContents();
    range.insertNode(figure);
    const spacer = createTextElement('paragraph');
    figure.after(spacer);
    moveCaretToEnd(spacer);
    setLinkValue('');
    setLinkDialog(false);
    sync();
  };

  return <section className="article-rich-editor" aria-label="기사 본문 편집기">
    <div className="article-rich-toolbar" role="toolbar" aria-label="본문 편집 도구">
      <div className={`title-menu ${titleMenuOpen ? 'is-open' : ''}`}>
        <button type="button" aria-haspopup="menu" aria-expanded={titleMenuOpen} onMouseDown={(event) => event.preventDefault()} onClick={() => setTitleMenuOpen((open) => !open)}><Type size={17} />문단제목</button>
        <div className="title-menu-options" aria-label="문단제목 형태">
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectTitleStyle('bar')}>세로선 제목</button>
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectTitleStyle('underline')}>밑줄 제목</button>
          <button type="button" role="menuitem" onMouseDown={(event) => event.preventDefault()} onClick={() => selectTitleStyle('quote')}>인용형 제목</button>
        </div>
      </div>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={toggleBold}><Bold size={17} />굵게</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertTextBlock('quote')}><Quote size={17} />인용문</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => inputRef.current?.click()}><ImagePlus size={17} />이미지 첨부</button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setLinkDialog(true)}><Link2 size={17} />이미지 링크 첨부</button>
      <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void insertImage(event.target.files?.[0]); event.target.value = ''; }} />
    </div>
    <div ref={editorRef} className="article-rich-canvas" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder="기사 본문을 입력해 주세요." onInput={sync} onKeyDown={handleEditorKeyDown} onKeyUp={saveRange} onMouseUp={saveRange} onBlur={sync} />
    {linkDialog && <div className="editor-dialog-backdrop" role="presentation"><div className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="image-link-title"><h3 id="image-link-title">이미지 링크 첨부</h3><label htmlFor="inline-image-link">이미지 주소</label><input id="inline-image-link" type="url" value={linkValue} onChange={(event) => setLinkValue(event.target.value)} placeholder="https://" autoFocus /><div><button type="button" className="secondary-button" onClick={() => setLinkDialog(false)}>취소</button><button type="button" className="primary-button" onClick={insertLinkedImage}>본문에 넣기</button></div></div></div>}
    {modalMessage && <div className="editor-dialog-backdrop" role="presentation"><div className="editor-dialog editor-notice-dialog" role="alertdialog" aria-modal="true"><h3>이미지 첨부 안내</h3><p>{modalMessage}</p><button type="button" className="primary-button" onClick={() => setModalMessage('')}>확인</button></div></div>}
  </section>;
}
