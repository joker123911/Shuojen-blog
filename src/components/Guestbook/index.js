import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import Link from '@docusaurus/Link'; 
import styles from './styles.module.css';
import TurnstileWidget from './TurnstileWidget';

// --- 1. 換成你專屬的 Cloudflare Worker 網址 ---
const WORKER_URL = "https://blog-comments-api.joker123911.workers.dev";

// --- 全站留言快取（模組層級）：同一次瀏覽內切換文章不必重抓，同時進行的請求也會共用 ---
const COMMENTS_CACHE_TTL = 60 * 1000;
let commentsCache = null; // { promise, time }

function loadAllComments({ force = false } = {}) {
  const now = Date.now();
  if (!force && commentsCache && now - commentsCache.time < COMMENTS_CACHE_TTL) {
    return commentsCache.promise;
  }
  const promise = fetch(WORKER_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => (Array.isArray(data) ? data : []));
  const entry = { promise, time: now };
  commentsCache = entry;
  // 失敗的請求不留在快取裡，下次會重試
  promise.catch(() => {
    if (commentsCache === entry) commentsCache = null;
  });
  return promise;
}

export default function Guestbook({ readOnly = false, postSlug }) {
  const location = useLocation();
  
  const currentSlug = postSlug || location.pathname;
  const isGuestbookPage = currentSlug === '/guestbook';

  const [allComments, setAllComments] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [formData, setFormData] = useState({ name: '', content: '', website: '' });
  const [replyData, setReplyData] = useState({ name: '', content: '', website: '' });
  const [formTab, setFormTab] = useState('write');
  const [replyTab, setReplyTab] = useState('write');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // --- Turnstile 人機驗證狀態 ---
  const [turnstileToken, setTurnstileToken] = useState('');
  const [replyTurnstileToken, setReplyTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const replyTurnstileRef = useRef(null);

  // --- 管理員狀態 ---
  const [adminKey, setAdminKey] = useState('');
  const [clickCount, setClickCount] = useState(0);

  // --- 互動狀態（回覆、編輯與摺疊控制） ---
  const [replyingTo, setReplyingTo] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');     
  const [expandedComments, setExpandedComments] = useState({});
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // --- 站內提示訊息（取代 alert）：scope 決定顯示位置 'form' | 'reply' | 'list' ---
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);
  const showNotice = (scope, type, text) => {
    clearTimeout(noticeTimer.current);
    setNotice({ scope, type, text });
    noticeTimer.current = setTimeout(() => setNotice(null), type === 'error' ? 6000 : 4000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const renderNotice = (scope) =>
    notice && notice.scope === scope ? (
      <p
        className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}
        role={notice.type === 'error' ? 'alert' : 'status'}
      >
        {notice.text}
      </p>
    ) : null;

  // 刪除確認：第一次點擊進入確認狀態，數秒內沒確認就自動取消
  useEffect(() => {
    if (pendingDeleteId === null) return undefined;
    const t = setTimeout(() => setPendingDeleteId(null), 5000);
    return () => clearTimeout(t);
  }, [pendingDeleteId]);

  useEffect(() => {
    const savedKey = localStorage.getItem('guestbook_admin_key');
    if (savedKey) setAdminKey(savedKey);
  }, []);

  const handleSecretClick = () => {
    setClickCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 5) {
        setTimeout(async () => {
          const key = prompt('🎉 恭喜你發現了隱藏大門！\n如果你是站長，請輸入通關密語：');
          
          if (key) {
            try {
              const res = await fetch(`${WORKER_URL}/verify`, {
                headers: { 'Authorization': key }
              });
              const result = await res.json();

              if (result.success) {
                localStorage.setItem('guestbook_admin_key', key);
                setAdminKey(key);
                showNotice('form', 'success', '身分驗證成功！歡迎回來，shuojen 🛡️');
              } else {
                showNotice('form', 'error', '你是不是想刪我留言 (⁰⊖⁰)');
              }
            } catch (err) {
              showNotice('form', 'error', '連線失敗，請檢查網路或 Worker 狀態。');
            }
          }
        }, 50);
        return 0;
      }
      return nextCount;
    });
  };

  // --- ASCII Art 判斷邏輯 ---
  const isAsciiArt = (text) => {
    if (!text) return false;
    const lines = text.split('\n');
    if (lines.length < 5) return false;

    let artLineCount = 0;
    const artCharsRegex = /[\\\/\|\_\-\.\*\:\;\+\=\(\)\[\]\{\}\s\u2500-\u257F\.,'"`]/g;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 2) continue; 
      
      const symbols = line.match(artCharsRegex) || [];
      if (symbols.length / line.length > 0.9) {
        artLineCount++;
      }
    }
    return artLineCount >= 5;
  };

  // --- URL 安全協定檢查（杜絕 javascript: / data: 等 XSS 攻擊） ---
  const getSafeHttpUrl = (rawUrl) => {
    if (!rawUrl) return null;
    const trimmed = String(rawUrl).trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
      return trimmed;
    }
    if (!trimmed.includes(':') && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return null;
  };

  const renderInlineMarkdown = (text) => {
    if (!text) return text;

    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        const safeUrl = getSafeHttpUrl(match[2]);
        if (safeUrl) {
          return (
            <a key={index} href={safeUrl} target="_blank" rel="noopener noreferrer" className={styles.contentLink}>
              {match[1]}
            </a>
          );
        }
        return <span key={index}>{match[1]}</span>;
      }

      const splitRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g;

      return (
        <span key={index}>
          {part.split(splitRegex).map((subPart, subIndex) => {
            if (!subPart) return null;
            
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return <code key={subIndex} className={styles.inlineCode}>{subPart.slice(1, -1)}</code>;
            }
            if (subPart.startsWith('**') && subPart.endsWith('**')) {
              return <b key={subIndex}>{subPart.slice(2, -2)}</b>;
            }
            if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
              return <i key={subIndex}>{subPart.slice(1, -1)}</i>;
            }
            if (subPart.startsWith('~~') && subPart.endsWith('~~')) {
              return <del key={subIndex}>{subPart.slice(2, -2)}</del>;
            }
            
            return subPart;
          })}
        </span>
      );
    });
  };

  const isQuoteLine = (line) => /^\s{0,3}>(?: (.*)|$|(?![\s<_\.0-9\(\)\/\\~])(.*))$/.test(line);
  const getQuoteContent = (line) => line.replace(/^\s{0,3}>\s?/, '');

  const parseBlocks = (text) => {
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let currentBlock = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isQuote = isQuoteLine(line);

      if (currentBlock && currentBlock.type === 'quote') {
        if (isQuote) {
          currentBlock.lines.push(getQuoteContent(line));
        } else if (line.trim() === '') {
          blocks.push(currentBlock);
          currentBlock = null;
        } else {
          currentBlock.lines.push(line);
        }
      } else if (currentBlock && currentBlock.type === 'text') {
        if (isQuote) {
          blocks.push(currentBlock);
          currentBlock = { type: 'quote', lines: [getQuoteContent(line)] };
        } else {
          currentBlock.lines.push(line);
        }
      } else {
        if (isQuote) {
          currentBlock = { type: 'quote', lines: [getQuoteContent(line)] };
        } else {
          currentBlock = { type: 'text', lines: [line] };
        }
      }
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  const renderMarkdown = (text, depth = 0) => {
    if (!text) return text;

    if (depth === 0 && isAsciiArt(text)) {
      return <div className={styles.asciiArt}>{text}</div>;
    }

    if (depth > 5) {
      return renderInlineMarkdown(text);
    }

    const blocks = parseBlocks(text);

    return blocks.map((block, idx) => {
      const content = block.lines.join('\n').trim();
      if (!content) return null;

      if (block.type === 'quote') {
        return (
          <blockquote key={idx} className={styles.commentBlockquote}>
            {renderMarkdown(content, depth + 1)}
          </blockquote>
        );
      }

      return (
        <span key={idx}>
          {renderInlineMarkdown(content)}
        </span>
      );
    });
  };
  

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  };

  // 只採用最新一次請求的結果，避免快速切換文章時舊請求晚回來蓋掉新資料；卸載後也不再更新狀態
  const latestRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchComments = async ({ force = false } = {}) => {
    const requestId = ++latestRequestRef.current;
    const isCurrent = () => isMountedRef.current && requestId === latestRequestRef.current;
    setFetchError(false);
    try {
      const data = await loadAllComments({ force });
      if (isCurrent()) setAllComments(data);
    } catch (err) {
      console.error("載入留言錯誤:", err);
      if (isCurrent()) setFetchError(true);
    } finally {
      if (isCurrent()) setFetchLoading(false);
    }
  };
  // 送出、編輯、刪除後強制重抓最新留言
  const refreshComments = () => fetchComments({ force: true });

  useEffect(() => {
    fetchComments();
    setActiveTab('current');
    setVisibleCount(10);
  }, [currentSlug]);

  const currentPageComments = allComments.filter(c => c.slug === currentSlug);
  const allPostComments = allComments.filter(c => c.slug !== '/guestbook');
  
  const displayComments = (isGuestbookPage && activeTab === 'all_posts') 
    ? allPostComments 
    : currentPageComments;

  // --- 強制限制最大兩層樹狀結構演算法 ---
  const buildCommentTree = (flatComments) => {
    const extendedComments = [];
    
    flatComments.forEach(c => {
      extendedComments.push({ ...c });
      if (c.replyContent && c.replyContent.trim() !== '') {
        extendedComments.push({
          id: `legacy-reply-${c.id}`,
          parentId: String(c.id),
          name: c.replyName === '站長' ? 'shuojen' : (c.replyName || 'shuojen'),
          content: c.replyContent,
          time: c.replyTime || c.time,
          isAdmin: 1,
          slug: c.slug,
          title: c.title,
          website: ''
        });
      }
    });

    const map = {};
    extendedComments.forEach(c => {
      map[String(c.id)] = { ...c, children: [] };
    });

    const roots = [];

    extendedComments.forEach(c => {
      const mapped = map[String(c.id)];
      
      if (!c.parentId) {
        roots.push(mapped);
      } else {
        let rootParent = map[String(c.parentId)];
        while (rootParent && rootParent.parentId && map[String(rootParent.parentId)]) {
          rootParent = map[String(rootParent.parentId)];
        }
        
        if (rootParent) {
          const immediateParent = map[String(c.parentId)];
          if (immediateParent && String(immediateParent.id) !== String(rootParent.id)) {
            mapped.replyToName = immediateParent.name;
          }
          
          map[String(rootParent.id)].children.push(mapped);
        } else {
          roots.push(mapped);
        }
      }
    });

    roots.sort((a, b) => new Date(b.time) - new Date(a.time));

    roots.forEach(root => {
      if (root.children) {
        root.children.sort((a, b) => new Date(a.time) - new Date(b.time));
      }
    });

    return roots;
  };

  const commentTree = buildCommentTree(displayComments);

  const observerTarget = useRef(null);

  // 無限滾動監聽（IntersectionObserver）
  useEffect(() => {
    if (visibleCount >= commentTree.length || commentTree.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 10, commentTree.length));
        }
      },
      {
        rootMargin: '400px', // 提早 400px 預載，滑動體驗無縫流暢
        threshold: 0.1,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
      observer.disconnect();
    };
  }, [visibleCount, commentTree.length]);

  // --- 精準計算所有留言與回覆的總和（包含舊版站長回覆欄位） ---
  const totalCommentCount = displayComments.reduce((acc, c) => {
    const hasLegacyReply = c.replyContent && c.replyContent.trim() !== '';
    return acc + 1 + (hasLegacyReply ? 1 : 0);
  }, 0);

  // --- 切換展開與摺疊狀態 ---
  const toggleReplies = (commentId) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // --- 表單送出（一般留言） ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;
    if (!adminKey && !turnstileToken) {
      showNotice('form', 'error', '請先完成人機安全驗證！');
      return;
    }
    setLoading(true);
    let finalWebsite = formData.website.trim();
    if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) finalWebsite = `https://${finalWebsite}`;

    const pageTitle = document.title.split(' | ')[0];

    const submitData = { 
      ...formData, 
      website: finalWebsite, 
      slug: currentSlug,
      title: pageTitle,
      parentId: null,
      turnstileToken: adminKey ? null : turnstileToken
    };
    
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminKey ? { 'Authorization': adminKey } : {})
        },
        body: JSON.stringify(submitData),
      });
      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error || '送出失敗');
      }
      showNotice('form', 'success', '留言已送出，謝謝你的留言！');
      setFormData({ name: '', content: '', website: '' });
      setTurnstileToken('');
      if (turnstileRef.current) turnstileRef.current.reset();
      setFormTab('write');
      setTimeout(refreshComments, 500); 
    } catch (error) {
      console.error("送出錯誤:", error);
      showNotice('form', 'error', error.message || '送出失敗，請稍後再試。');
      setTurnstileToken('');
      if (turnstileRef.current) turnstileRef.current.reset();
    } finally {
      setLoading(false);
    }
  };

  // --- 表單送出（回覆留言） ---
  const handleReplySubmit = async (e, parentComment) => {
    e.preventDefault();
    if (!adminKey && !replyData.name.trim()) return;
    if (!replyData.content.trim()) return;
    if (!adminKey && !replyTurnstileToken) {
      showNotice('reply', 'error', '請先完成人機安全驗證！');
      return;
    }
    setLoading(true);

    let finalWebsite = replyData.website.trim();
    if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) finalWebsite = `https://${finalWebsite}`;

    const submitData = {
      name: adminKey ? 'shuojen' : replyData.name,
      website: adminKey ? '' : finalWebsite,
      content: replyData.content,
      slug: parentComment.slug,     
      title: parentComment.title,   
      parentId: String(parentComment.id),
      turnstileToken: adminKey ? null : replyTurnstileToken
    };

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminKey ? { 'Authorization': adminKey } : {})
        },
        body: JSON.stringify(submitData),
      });
      const resData = await res.json();
      if (!res.ok || resData.error) {
        throw new Error(resData.error || '回覆失敗');
      }
      showNotice('list', 'success', '回覆已送出！');
      
      setExpandedComments(prev => ({ ...prev, [parentComment.id]: true }));
      
      setReplyData({ name: '', content: '', website: '' });
      setReplyTurnstileToken('');
      if (replyTurnstileRef.current) replyTurnstileRef.current.reset();
      setReplyTab('write');
      setReplyingTo(null);
      setTimeout(refreshComments, 500);
    } catch (error) {
      console.error("回覆錯誤:", error);
      showNotice('reply', 'error', error.message || '回覆失敗，請稍後再試。');
      setReplyTurnstileToken('');
      if (replyTurnstileRef.current) replyTurnstileRef.current.reset();
    } finally {
      setLoading(false);
    }
  };

  const startReply = (id) => {
    setReplyingTo(id);
    setReplyData({ name: '', content: '', website: '' });
    setReplyTurnstileToken('');
    setReplyTab('write');
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyTurnstileToken('');
    setReplyTab('write');
  };

  const startEdit = (id, content) => {
    setEditingId(id);
    setEditContent(content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const submitEdit = async (id) => {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminKey
        },
        body: JSON.stringify({ id, content: editContent })
      });

      if (res.ok) {
        refreshComments();
        setEditingId(null); 
        setEditContent('');
      } else {
        showNotice('list', 'error', '修改失敗：金鑰錯誤或權限不足');
      }
    } catch (error) {
      showNotice('list', 'error', '連線失敗，請稍後再試。');
    }
  };

  const handleDelete = async (id) => {
    // 兩段式確認：第一次點擊只進入確認狀態
    if (pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    setPendingDeleteId(null);
    try {
      const res = await fetch(`${WORKER_URL}?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': adminKey }
      });
      if (res.ok) {
        refreshComments();
        showNotice('list', 'success', '留言已刪除。');
      } else {
        showNotice('list', 'error', '刪除失敗：金鑰錯誤或權限不足');
      }
    } catch (error) {
      showNotice('list', 'error', '連線失敗，請稍後再試。');
    }
  };

  // --- 遞迴渲染留言組件（最多至兩層） ---
  const renderCommentNode = (c, isChild = false) => {
    const isExpanded = expandedComments[c.id];
    const safeUrl = getSafeHttpUrl(c.website);
    const isPendingDelete = pendingDeleteId === c.id;

    return (
      <div key={c.id} className={isChild ? styles.childNode : styles.threadNode}>
        <div className={styles.commentItemInner}>
          <div className={styles.commentHeader}>
            <span className={styles.commentName}>
              {safeUrl ? (
                <a href={safeUrl} target="_blank" rel="noopener noreferrer">{c.name}</a>
              ) : (
                c.name
              )}
              {c.isAdmin === 1 && <span className={styles.masterBadge}>站長</span>}
              {/* 回覆與主留言同一篇文章，只在主留言顯示文章標籤 */}
              {activeTab === 'all_posts' && isGuestbookPage && !isChild && (
                <Link to={c.slug} className={styles.slugTag}>
                  @{c.title || c.slug.replace('/blog/', '')}
                </Link>
              )}
            </span>
            {/* 時間與操作按鈕同一行（沿用舊版排版），按鈕平常較淡，滑鼠移到留言上才加深 */}
            <span className={styles.commentMeta}>
            <span className={styles.commentTime}>{formatDate(c.time)}</span>
            <span className={styles.actions}>
              {!readOnly && (
                <button className={`${styles.actionBtn} ${styles.actionReply}`} onClick={() => startReply(c.id)}>
                  回覆
                </button>
              )}
              {adminKey && (
                <>
                  <button className={styles.actionBtn} onClick={() => startEdit(c.id, c.content)}>
                    編輯
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionDanger}`}
                    onClick={() => handleDelete(c.id)}
                  >
                    {isPendingDelete ? '確定刪除？' : '刪除'}
                  </button>
                  {isPendingDelete && (
                    <button className={styles.actionBtn} onClick={() => setPendingDeleteId(null)}>
                      取消
                    </button>
                  )}
                </>
              )}
            </span>
            </span>
          </div>

          {editingId === c.id ? (
            <div className={styles.editBox}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className={styles.editTextarea}
              />
              <div className={styles.buttonRow}>
                <button type="button" onClick={cancelEdit} className={styles.ghostBtn}>取消</button>
                <button type="button" onClick={() => submitEdit(c.id)} className={styles.primaryBtnSmall}>
                  儲存修改
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.commentBody}>
              {c.replyToName && <span className={styles.replyToName}>@{c.replyToName}</span>}
              {renderMarkdown(c.content)}
            </div>
          )}

          {/* 內嵌回覆表單 */}
          {replyingTo === c.id && (
            <div className={styles.replyFormContainer}>
              <div className={styles.replyFormTitle}>
                回覆 @{c.name} {adminKey && '🛡️（將以站長身分發言）'}
              </div>
              <form onSubmit={(e) => handleReplySubmit(e, c)} className={styles.commentForm}>
                {!adminKey && (
                  <div className={styles.inputRow}>
                    <input
                      type="text" placeholder="名稱（必填）" required
                      value={replyData.name} onChange={e => setReplyData({...replyData, name: e.target.value})}
                    />
                    <input
                      type="text" placeholder="個人網站（選填）"
                      value={replyData.website} onChange={e => setReplyData({...replyData, website: e.target.value})}
                    />
                  </div>
                )}
                {renderEditor({
                  tab: replyTab,
                  setTab: setReplyTab,
                  value: replyData.content,
                  onChange: (v) => setReplyData({ ...replyData, content: v }),
                  placeholder: '輸入回覆內容（必填）',
                  rows: 3,
                })}
                {!adminKey && (
                  <TurnstileWidget
                    ref={replyTurnstileRef}
                    onVerify={(token) => setReplyTurnstileToken(token)}
                    onExpire={() => setReplyTurnstileToken('')}
                  />
                )}
                {renderNotice('reply')}
                <div className={styles.buttonRow}>
                  <button type="button" onClick={cancelReply} className={styles.ghostBtn}>取消</button>
                  <button type="submit" className={styles.primaryBtnSmall} disabled={loading}>
                    {loading ? '傳送中...' : '送出回覆'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* FB/IG 風格：收摺與展開控制區塊 */}
        {!isChild && c.children && c.children.length > 0 && (
          <>
            {c.children.length > 1 && (
              <button
                type="button"
                className={styles.toggleRepliesContainer}
                onClick={() => toggleReplies(c.id)}
                aria-expanded={Boolean(isExpanded)}
              >
                <span className={styles.toggleRepliesLine}></span>
                <span className={styles.toggleRepliesText}>
                  {isExpanded ? '隱藏回覆' : `查看回覆 (${c.children.length} 則)`}
                </span>
              </button>
            )}

            {(c.children.length === 1 || isExpanded) && (
              <div className={styles.commentChildren}>
                {c.children.map(child => renderCommentNode(child, true))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // --- 編輯／預覽切換 + 輸入框 + Markdown 語法提示（主表單與回覆表單共用） ---
  const renderEditor = ({ tab, setTab, value, onChange, placeholder, rows }) => (
    <div className={styles.editor}>
      <div className={styles.formTabHeader}>
        <button
          type="button"
          className={`${styles.formTabBtn} ${tab === 'write' ? styles.formTabBtnActive : ''}`}
          onClick={() => setTab('write')}
        >
          編輯
        </button>
        <button
          type="button"
          className={`${styles.formTabBtn} ${tab === 'preview' ? styles.formTabBtnActive : ''}`}
          onClick={() => setTab('preview')}
        >
          預覽
        </button>
      </div>
      <textarea
        placeholder={placeholder}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        hidden={tab !== 'write'}
      />
      {tab === 'preview' && (
        <div className={styles.previewContainer}>
          {value.trim() ? (
            renderMarkdown(value)
          ) : (
            <span className={styles.previewPlaceholder}>（尚無輸入內容，請在編輯區輸入文字）</span>
          )}
        </div>
      )}
      <details className={styles.markdownHelp}>
        <summary>支援 Markdown 語法</summary>
        <ul>
          <li>超連結：<code>[顯示的文字](網址)</code></li>
          <li>內嵌程式碼：<code>{'`code`'}</code></li>
          <li>粗體：<code>**bold**</code></li>
          <li>斜體：<code>*italic*</code></li>
          <li>刪除線：<code>~~strike~~</code></li>
          <li>引言：<code>&gt; 引用的文字</code></li>
        </ul>
      </details>
    </div>
  );

  return (
    <div className={styles.guestbookContainer}>
      {!readOnly ? (
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle} onClick={handleSecretClick}>
            發表留言 {adminKey && '🛡️'}
          </h3>
          <form onSubmit={handleSubmit} className={styles.commentForm}>
            <div className={styles.inputRow}>
              <input
                type="text" placeholder="名稱（必填）" required
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input
                type="text" placeholder="個人網站（選填）"
                value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})}
              />
            </div>
            {renderEditor({
              tab: formTab,
              setTab: setFormTab,
              value: formData.content,
              onChange: (v) => setFormData({ ...formData, content: v }),
              placeholder: '輸入內容（必填）',
              rows: 5,
            })}
            {!adminKey && (
              <TurnstileWidget
                ref={turnstileRef}
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
              />
            )}
            {renderNotice('form')}
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '傳送中...' : '送出留言'}
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.readOnlyNote}>
          <p>
            💡 點擊進入
            <Link to={currentSlug} className={styles.readOnlyLink}>
              本文章
            </Link>
            即可發表留言。
          </p>
        </div>
      )}

      <div className={styles.listSection}>
        {/* 留言板頁：分頁按鈕與則數同一列；文章頁：「本篇留言」標題與則數同一列 */}
        <div className={styles.listHeader}>
          {isGuestbookPage ? (
            <div className={styles.tabGroup} role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'current'}
                className={`${styles.tabBtn} ${activeTab === 'current' ? styles.tabActive : ''}`}
                onClick={() => { setActiveTab('current'); setVisibleCount(10); }}
              >
                一般留言
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'all_posts'}
                className={`${styles.tabBtn} ${activeTab === 'all_posts' ? styles.tabActive : ''}`}
                onClick={() => { setActiveTab('all_posts'); setVisibleCount(10); }}
              >
                全站文章討論
              </button>
            </div>
          ) : (
            <h3 className={styles.listTitle}>本篇留言</h3>
          )}
          {!fetchLoading && !fetchError && (
            <span className={styles.count}>{totalCommentCount} 則</span>
          )}
        </div>

        {renderNotice('list')}

        {fetchLoading ? (
          <p className={styles.statusText}>載入中...</p>
        ) : fetchError ? (
          <p className={`${styles.statusText} ${styles.statusError}`}>
            ⚠️ 留言伺服器連線異常，請稍後再試。
          </p>
        ) : commentTree.length === 0 ? (
          <p className={styles.statusText}>目前尚無留言</p>
        ) : (
          <>
            <div className={styles.commentsListRoot}>
              {commentTree.slice(0, visibleCount).map(c => renderCommentNode(c, false))}
            </div>

            {/* 無限滾動觸發目標 */}
            {visibleCount < commentTree.length && (
              <div ref={observerTarget} className={styles.scrollSentinel} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
