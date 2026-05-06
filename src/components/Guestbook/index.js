import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import Link from '@docusaurus/Link'; 
import styles from './styles.module.css';

const GIST_JSON_URL = "https://gist.githubusercontent.com/joker123911/b7156615c093aee48f41ef1839da8dde/raw/comments.json";
const GAS_APP_URL = "https://script.google.com/macros/s/AKfycbzqlUX8yz0eYzb72WOtjXTpeuhuVtwHYfuMJzs2rrspAKXynIbPugc02OdYWAM66nR7/exec";

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

  // 解析 Markdown 超連結語法，並自動補齊網址協議
  const renderMarkdown = (text) => {
    if (!text) return text;
    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        let url = match[2].trim();
        // 如果網址不是以 http(s)://, / (站內路徑), 或 # (錨點) 開頭，則補上 https://
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
      const res = await fetch(`${GIST_JSON_URL}?t=${new Date().getTime()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
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
      await fetch(GAS_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(submitData),
      });
      alert('留言已送出！');
      setFormData({ name: '', content: '', website: '' });
      setTimeout(fetchComments, 3000);
    } catch (error) {
      console.error("送出錯誤:", error);
      alert('送出失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.guestbookContainer}>
      {!readOnly ? (
        <div className={styles.formSection}>
          <h3 className={styles.sectionTitle}>發表留言</h3>
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
                  <span className={styles.commentTime}>{formatDate(c.time)}</span>
                </div>
                <div className={getCommentClass(c.content)}>
                  {renderMarkdown(c.content)}
                </div>

                {c.replyContent && (
                  <div className={styles.replyBox}>
                    <div className={styles.replyHeader}>
                      <div className={styles.replyUser}>
                        <span className={styles.replyName}>{c.replyName || 'shuojen'}</span>
                        <span className={styles.masterBadge}>站長</span>
                      </div>
                      <span className={styles.replyTime}>{formatDate(c.replyTime)}</span>
                    </div>
                    <div className={getCommentClass(c.replyContent)}>
                      {renderMarkdown(c.replyContent)}
                    </div>
                  </div>
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