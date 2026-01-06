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

  // 判斷是否為圖案的邏輯：換行次數大於 10 就視為圖案
  const getCommentClass = (content) => {
    if (!content) return styles.commentBody;
    const lineCount = content.split('\n').length;
    return lineCount > 10
      ? `${styles.commentBody} ${styles.asciiArt}`
      : styles.commentBody;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
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
      const sortedData = data.sort((a, b) => new Date(b.time) - new Date(a.time));
      setComments(sortedData);
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
    setLoading(true);
    let finalWebsite = formData.website.trim();
    if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) {
      finalWebsite = `https://${finalWebsite}`;
    }
    const submitData = { ...formData, website: finalWebsite };
    try {
      await fetch(GAS_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(submitData),
      });
      alert('留言已送出，待審核後顯示');
      setFormData({ name: '', content: '', website: '' });
    } catch (error) {
      alert('送出失敗');
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
          <p className={styles.statusText}>載入中</p>
        ) : comments.length === 0 ? (
          <p className={styles.statusText}>目前尚無核准的留言</p>
        ) : (
          <>
            {comments.slice(0, visibleCount).map((c, i) => (
              <div key={i} className={styles.commentItem}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentName}>
                    {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer">{c.name}</a> : c.name}
                  </span>
                  <span className={styles.commentTime}>{formatDate(c.time)}</span>
                </div>
                {/* 使用判斷邏輯套用 CSS Class */}
                <p className={getCommentClass(c.content)}>{c.content}</p>

                {c.replyContent && (
                  <div className={styles.replyBox}>
                    <div className={styles.replyHeader}>
                      <span>{c.replyName || '站長回覆'}</span>
                      <span className={styles.replyTime}>{formatDate(c.replyTime)}</span>
                    </div>
                    {/* 回覆內容也套用同樣的判斷 */}
                    <p className={getCommentClass(c.replyContent)}>{c.replyContent}</p>
                  </div>
                )}
              </div>
            ))}

            {visibleCount < comments.length && (
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