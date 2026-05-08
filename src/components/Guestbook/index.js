import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import Link from '@docusaurus/Link'; 
import styles from './styles.module.css';

// --- 1. 換成你專屬的 Cloudflare Worker 網址 ---
const WORKER_URL = "https://blog-comments-api.joker123911.workers.dev";

export default function Guestbook({ readOnly = false, postSlug }) {
  const location = useLocation();
  
  const currentSlug = postSlug || location.pathname;
  const isGuestbookPage = currentSlug === '/guestbook';

  const [allComments, setAllComments] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [formData, setFormData] = useState({ name: '', content: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // --- 管理員狀態 ---
  const [adminKey, setAdminKey] = useState('');
  const [clickCount, setClickCount] = useState(0);

  // --- 內嵌編輯器狀態 ---
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyText, setReplyText] = useState('');     

  useEffect(() => {
    const savedKey = localStorage.getItem('guestbook_admin_key');
    if (savedKey) setAdminKey(savedKey);
  }, []);

  const handleSecretClick = () => {
    setClickCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 5) {
        setTimeout(() => {
          const key = prompt('🔑 進入管理員模式\n請輸入你的 ADMIN_KEY：');
          if (key) {
            localStorage.setItem('guestbook_admin_key', key);
            setAdminKey(key);
            alert('管理員模式已啟用！');
          }
        }, 50);
        return 0;
      }
      return nextCount;
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return text;
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        let url = match[2].trim();
        if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
          url = `https://${url}`;
        }
        return (
          <a 
            key={index} 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--ifm-color-primary)', textDecoration: 'underline' }}
          >
            {match[1]}
          </a>
        );
      }
      return part;
    });
  };

  const getCommentClass = (content) => {
    if (!content) return styles.commentBody;
    const safeContent = String(content);
    const lines = safeContent.split('\n');
    const hasAlignmentSpaces = / {3,}/.test(safeContent);
    const hasBackslash = safeContent.includes('\\');
    const drawingChars = (safeContent.match(/[|_=+*<>]/g) || []).length;
    const isSymbolDense = drawingChars > 10;
    return (lines.length > 1 && (hasAlignmentSpaces || hasBackslash || isSymbolDense)) 
      ? `${styles.commentBody} ${styles.asciiArt}` 
      : styles.commentBody;
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

  const fetchComments = async () => {
      try {
        const res = await fetch(WORKER_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
          // 在前端強制轉換成真實的時間物件進行比對，確保「最晚的在最上面」
          setAllComments(data.sort((a, b) => new Date(b.time) - new Date(a.time)));
        }
      } catch (err) {
        console.error("載入錯誤:", err);
      } finally {
        setFetchLoading(false);
      }
    };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;
    setLoading(true);
    let finalWebsite = formData.website.trim();
    if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) finalWebsite = `https://${finalWebsite}`;

    const pageTitle = document.title.split(' | ')[0];

    const submitData = { 
      ...formData, 
      website: finalWebsite, 
      slug: currentSlug,
      title: pageTitle 
    };
    
    try {
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      alert('留言已送出！');
      setFormData({ name: '', content: '', website: '' });
      setTimeout(fetchComments, 500); 
    } catch (error) {
      console.error("送出錯誤:", error);
      alert('送出失敗');
    } finally {
      setLoading(false);
    }
  };

  const startReply = (id, currentReply) => {
    setReplyingTo(id);
    setReplyText(currentReply || ''); 
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const submitReply = async (id) => {
    try {
      const res = await fetch(WORKER_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminKey
        },
        body: JSON.stringify({ id, replyContent: replyText, replyName: 'shuojen' })
      });

      if (res.ok) {
        fetchComments();
        setReplyingTo(null); 
        setReplyText('');
      } else {
        alert('回覆失敗：金鑰錯誤或權限不足');
      }
    } catch (error) {
      alert('連線失敗');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('🗑️ 確定要徹底刪除這則留言嗎？無法復原喔！')) return;
    try {
      const res = await fetch(`${WORKER_URL}?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': adminKey }
      });
      if (res.ok) fetchComments();
      else alert('刪除失敗：金鑰錯誤或權限不足');
    } catch (error) {
      alert('連線失敗');
    }
  };

  return (
    <div className={styles.guestbookContainer}>
      {!readOnly ? (
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle} onClick={handleSecretClick} style={{ cursor: 'default', userSelect: 'none' }}>
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
            <textarea
              placeholder="輸入內容（必填）" required
              value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
            />
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '傳送中...' : '送出留言'}
            </button>
          </form>
        </div>
      ) : (
        <div className={styles.readOnlyNote}>
          <p>
            💡 點擊進入
            <Link to={currentSlug} style={{ fontWeight: 'bold', margin: '0 4px' }}>
              本文章
            </Link>
            即可發表留言。
          </p>
        </div>
      )}

      <div className={styles.listSection}>
        {isGuestbookPage && (
          <div className={styles.tabContainer}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'current' ? styles.tabActive : ''}`}
              onClick={() => { setActiveTab('current'); setVisibleCount(10); }}
            >
              一般留言
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'all_posts' ? styles.tabActive : ''}`}
              onClick={() => { setActiveTab('all_posts'); setVisibleCount(10); }}
            >
              全站文章討論
            </button>
          </div>
        )}

        <h3 className={styles.sectionTitle}>
          {isGuestbookPage 
            ? (activeTab === 'current' ? '一般留言' : '全站文章討論') 
            : '本篇留言'
          }
          <span className={styles.count}>/ {displayComments.length} 則</span>
        </h3>

        {fetchLoading ? (
          <p className={styles.statusText}>載入中...</p>
        ) : displayComments.length === 0 ? (
          <p className={styles.statusText}>目前尚無留言</p>
        ) : (
          <>
            {displayComments.slice(0, visibleCount).map((c, i) => (
              <div key={i} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentName}>
                    {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer">{c.name}</a> : c.name}
                    {activeTab === 'all_posts' && isGuestbookPage && (
                       <Link 
                         to={c.slug} 
                         className={styles.slugTag} 
                         style={{ textDecoration: 'none' }}
                       >
                         @{c.title || c.slug.replace('/blog/', '')}
                       </Link>
                    )}
                  </span>
                  <span className={styles.commentTime}>
                    {formatDate(c.time)}
                    
                    {adminKey && (
                      <span style={{ marginLeft: '12px' }}>
                        <button onClick={() => startReply(c.id, c.replyContent)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#0070f3', padding: '0 4px', fontSize: '0.9em' }}>
                          ✏️{c.replyContent ? '編輯' : '回覆'}
                        </button>
                        <button onClick={() => handleDelete(c.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#ff4081', padding: '0 4px', fontSize: '0.9em' }}>
                          🗑️刪除
                        </button>
                      </span>
                    )}
                  </span>
                </div>
                <div className={getCommentClass(c.content)}>
                  {renderMarkdown(c.content)}
                </div>

                {replyingTo === c.id ? (
                  <div style={{ marginTop: '15px', padding: '12px', background: 'var(--ifm-background-surface-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '0.9em', fontWeight: 'bold', color: 'var(--ifm-color-primary)' }}>站長回覆編輯模式</div>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="支援 Markdown 超連結與多行換行..."
                      rows={4}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--ifm-color-emphasis-400)',
                        background: 'var(--ifm-background-color)',
                        color: 'var(--ifm-font-color-base)',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ textAlign: 'right', marginTop: '8px' }}>
                      <button onClick={cancelReply} style={{ marginRight: '8px', padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--ifm-color-emphasis-500)', background: 'transparent', color: 'var(--ifm-font-color-base)' }}>取消</button>
                      <button onClick={() => submitReply(c.id)} style={{ padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: 'var(--ifm-color-primary)', color: '#fff', fontWeight: 'bold' }}>儲存回覆</button>
                    </div>
                  </div>
                ) : (
                  c.replyContent && (
                    <div className={styles.replyBox}>
                      <div className={styles.replyHeader}>
                        <div className={styles.replyUser}>
                          <span className={styles.replyName}>{c.replyName === '站長' ? 'shuojen' : (c.replyName || 'shuojen')}</span>
                          <span className={styles.masterBadge}>站長</span>
                        </div>
                        <span className={styles.replyTime}>{formatDate(c.replyTime)}</span>
                      </div>
                      <div className={getCommentClass(c.replyContent)}>
                        {renderMarkdown(c.replyContent)}
                      </div>
                    </div>
                  )
                )}
              </div>
            ))}

            {visibleCount < displayComments.length && (
              <div className={styles.loadMoreContainer}>
                <button onClick={() => setVisibleCount(v => v + 10)} className={styles.loadMoreBtn}>
                  LOAD MORE
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}