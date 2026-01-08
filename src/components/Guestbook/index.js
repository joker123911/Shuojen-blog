import React, { useState, useEffect } from 'react';
import styles from './styles.module.css';

const GIST_JSON_URL = "https://gist.githubusercontent.com/joker123911/b7156615c093aee48f41ef1839da8dde/raw/comments.json";
const GAS_APP_URL = "https://script.google.com/macros/s/AKfycbz1XA-9i4SWcwplB6U-KO17g3Qo8Rle5vqqiFhWOjmlbZ_MY_FNN26jMJw7pBAh5Zik/exec";

export default function Guestbook() {
  const [comments, setComments] = useState([]);
  const [formData, setFormData] = useState({ name: '', content: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // --- 關鍵修正：確保 content 必定為字串 ---
  const getCommentClass = (content) => {
    if (!content) return styles.commentBody;
    // 使用 String() 強制轉型，防止數字 123 導致 split 失敗
    const safeContent = String(content);
    const lineCount = safeContent.split('\n').length;
    return lineCount > 10
      ? `${styles.commentBody} ${styles.asciiArt}`
      : styles.commentBody;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // 如果日期無效則回傳原始字串
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  };

  const fetchComments = async () => {
    try {
      // 加上時間戳記防止快取
      const res = await fetch(`${GIST_JSON_URL}?t=${new Date().getTime()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const sortedData = data.sort((a, b) => new Date(b.time) - new Date(a.time));
        setComments(sortedData);
      }
    } catch (err) {
      console.error("載入錯誤:", err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;

    setLoading(true);
    let finalWebsite = formData.website.trim();
    if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) {
      finalWebsite = `https://${finalWebsite}`;
    }

    const submitData = { ...formData, website: finalWebsite };

    try {
      // 使用 no-cors 是因為 GAS 不支援 CORS 預檢
      await fetch(GAS_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(submitData),
      });

      alert('留言已送出！');
      setFormData({ name: '', content: '', website: '' });

      // 嘗試延遲重新抓取一次（雖然 Gist 更新沒那麼快，但這是好習慣）
      setTimeout(fetchComments, 3000);

    } catch (error) {
      console.error("送出錯誤:", error);
      alert('送出失敗，請檢查網路連線');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.guestbookContainer}>
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

      <div className={styles.listSection}>
        <h3 className={styles.sectionTitle}>
          所有留言 <span className={styles.count}>/ {comments.length} 則</span>
        </h3>

        {fetchLoading ? (
          <p className={styles.statusText}>載入中...</p>
        ) : comments.length === 0 ? (
          <p className={styles.statusText}>目前尚無留言</p>
        ) : (
          <>
            {comments.slice(0, visibleCount).map((c, i) => (
              <div key={i} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentName}>
                    {c.website ? (
                      <a href={c.website} target="_blank" rel="noopener noreferrer">{c.name}</a>
                    ) : (
                      c.name
                    )}
                  </span>
                  <span className={styles.commentTime}>{formatDate(c.time)}</span>
                </div>
                <p className={getCommentClass(c.content)}>{c.content}</p>

                {c.replyContent && (
                  <div className={styles.replyBox}>
                    <div className={styles.replyHeader}>
                      <span>{c.replyName || '站長回覆'}</span>
                      <span className={styles.replyTime}>{formatDate(c.replyTime)}</span>
                    </div>
                    <p className={getCommentClass(c.replyContent)}>{c.replyContent}</p>
                  </div>
                )}
              </div>
            ))}

            {visibleCount < comments.length && (
              <div className={styles.loadMoreContainer}>
                <button onClick={() => setVisibleCount(v => v + 10)} className={styles.loadMoreBtn}>
                  顯示更多
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}