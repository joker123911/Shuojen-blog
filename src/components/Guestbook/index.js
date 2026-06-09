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
  const [replyData, setReplyData] = useState({ name: '', content: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // --- 管理員狀態 ---
  const [adminKey, setAdminKey] = useState('');
  const [clickCount, setClickCount] = useState(0);

  // --- 互動狀態（回覆與編輯） ---
  const [replyingTo, setReplyingTo] = useState(null); 
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');     

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
                alert('身分驗證成功！歡迎回來，shuojen 🛡️');
              } else {
                alert('你是不是想刪我留言 (⁰⊖⁰)');
              }
            } catch (err) {
              alert('連線失敗，請檢查網路或 Worker 狀態。');
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

  const renderMarkdown = (text) => {
    if (!text) return text;

    if (isAsciiArt(text)) {
      return (
        <div style={{ 
          fontFamily: '"Cascadia Code", Consolas, "Courier New", monospace', 
          whiteSpace: 'pre', 
          overflowX: 'auto', 
          lineHeight: '1.25',
          fontSize: '0.9em',
          padding: '4px 0'
        }}>
          {text}
        </div>
      );
    }

    const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
    
    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        let url = match[2].trim();
        if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
          url = `https://${url}`;
        }
        return (
          <a key={index} href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ifm-color-primary)', textDecoration: 'underline' }}>
            {match[1]}
          </a>
        );
      }

      const splitRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~)/g;

      return (
        <span key={index}>
          {part.split(splitRegex).map((subPart, subIndex) => {
            if (!subPart) return null;
            
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return <code key={subIndex} style={{ backgroundColor: 'var(--ifm-color-emphasis-200)', padding: '2px 4px', borderRadius: '4px' }}>{subPart.slice(1, -1)}</code>;
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
  
  const getCommentClass = () => {
    return styles.commentBody;
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
        setAllComments(data);
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

  // --- 核心重構：強制限制最大兩層樹狀結構演算法 ---
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
        // 核心邏輯：不斷向上追溯，直到找到最頂層的根留言 (Level 1)
        let rootParent = map[String(c.parentId)];
        while (rootParent && rootParent.parentId && map[String(rootParent.parentId)]) {
          rootParent = map[String(rootParent.parentId)];
        }
        
        if (rootParent) {
          // 如果被回覆的目標「不是」最頂層根留言，代表這是更深層的回覆
          // 紀錄 immediateParent 的名稱，用來在前端渲染 FB 風格的 @提及 標籤
          const immediateParent = map[String(c.parentId)];
          if (immediateParent && String(immediateParent.id) !== String(rootParent.id)) {
            mapped.replyToName = immediateParent.name;
          }
          
          // 強制將該留言塞入第一層根留言的 children 中（直接扁平化對齊第二層）
          map[String(rootParent.id)].children.push(mapped);
        } else {
          roots.push(mapped);
        }
      }
    });

    // 主留言排序（新到舊）
    roots.sort((a, b) => new Date(b.time) - new Date(a.time));

    // 二層回覆排序（舊到新對話流）
    roots.forEach(root => {
      if (root.children) {
        root.children.sort((a, b) => new Date(a.time) - new Date(b.time));
      }
    });

    return roots;
  };

  const commentTree = buildCommentTree(displayComments);

  // --- 表單送出（一般留言） ---
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
      title: pageTitle,
      parentId: null
    };
    
    try {
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminKey ? { 'Authorization': adminKey } : {})
        },
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

  // --- 表單送出（回覆留言） ---
  const handleReplySubmit = async (e, parentComment) => {
    e.preventDefault();
    if (!adminKey && !replyData.name.trim()) return;
    if (!replyData.content.trim()) return;
    setLoading(true);

    let finalWebsite = replyData.website.trim();
    if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) finalWebsite = `https://${finalWebsite}`;

    const submitData = {
      name: adminKey ? 'shuojen' : replyData.name,
      website: adminKey ? '' : finalWebsite,
      content: replyData.content,
      slug: parentComment.slug,     
      title: parentComment.title,   
      parentId: String(parentComment.id) 
    };

    try {
      await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminKey ? { 'Authorization': adminKey } : {})
        },
        body: JSON.stringify(submitData),
      });
      alert('回覆已送出！');
      setReplyData({ name: '', content: '', website: '' });
      setReplyingTo(null);
      setTimeout(fetchComments, 500);
    } catch (error) {
      console.error("回覆錯誤:", error);
      alert('回覆失敗');
    } finally {
      setLoading(false);
    }
  };

  const startReply = (id) => {
    setReplyingTo(id);
    setReplyData({ name: '', content: '', website: '' });
  };

  const cancelReply = () => {
    setReplyingTo(null);
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
        fetchComments();
        setEditingId(null); 
        setEditContent('');
      } else {
        alert('修改失敗：金鑰錯誤或權限不足');
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

  // --- 遞迴渲染留言組件（最多至兩層） ---
  const renderCommentNode = (c, isChild = false) => {
    return (
      <div key={c.id} className={styles.commentNodeWrapper}>
        <div className={styles.commentItemInner}>
          <div className={styles.commentHeader}>
            <span className={styles.commentName}>
              {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer">{c.name}</a> : c.name}
              {c.isAdmin === 1 && <span className={styles.masterBadge}>站長</span>}
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
              
              <span style={{ marginLeft: '12px' }}>
                {!readOnly && (
                  <button onClick={() => startReply(c.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#0070f3', padding: '0 4px', fontSize: '0.9em' }}>
                    💬回覆
                  </button>
                )}
                {adminKey && (
                  <>
                    <button onClick={() => startEdit(c.id, c.content)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#0070f3', padding: '0 4px', fontSize: '0.9em' }}>
                      ✏️編輯
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#ff4081', padding: '0 4px', fontSize: '0.9em' }}>
                      🗑️刪除
                    </button>
                  </>
                )}
              </span>
            </span>
          </div>

          {editingId === c.id ? (
            <div style={{ marginTop: '10px' }}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                style={{ 
                  width: '100%', padding: '8px', borderRadius: '4px',
                  background: 'var(--ifm-background-color)', color: 'var(--ifm-font-color-base)',
                  border: '1px solid var(--ifm-color-emphasis-400)', fontFamily: 'inherit', resize: 'vertical'
                }}
              />
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button onClick={cancelEdit} style={{ marginRight: '8px', padding: '4px 12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--ifm-color-emphasis-500)', background: 'transparent', color: 'var(--ifm-font-color-base)' }}>取消</button>
                <button onClick={() => submitEdit(c.id)} style={{ padding: '4px 12px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: 'var(--ifm-color-primary)', color: '#fff' }}>儲存修改</button>
              </div>
            </div>
          ) : (
            <div className={getCommentClass()}>
              {/* FB/IG 風格：如果是被扁平化的深層回覆，前面加上帶有高亮效果的被回覆者標籤 */}
              {c.replyToName && (
                <span style={{ color: 'var(--ifm-color-primary)', fontWeight: '700', marginRight: '8px', userSelect: 'none' }}>
                  @{c.replyToName}
                </span>
              )}
              {renderMarkdown(c.content)}
            </div>
          )}

          {/* 內嵌回覆表單 */}
          {replyingTo === c.id && (
            <div className={styles.replyFormContainer}>
              <div style={{ marginBottom: '8px', fontSize: '0.9em', fontWeight: 'bold', color: 'var(--ifm-color-primary)' }}>
                回覆 @{c.name} {adminKey && '🛡️ (將以站長身分發言)'}
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
                <textarea
                  placeholder="輸入回覆內容（必填）支援 Markdown..." required
                  value={replyData.content} onChange={e => setReplyData({...replyData, content: e.target.value})}
                  rows={3}
                />
                <div style={{ textAlign: 'right' }}>
                  <button type="button" onClick={cancelReply} style={{ marginRight: '8px', padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--ifm-color-emphasis-500)', background: 'transparent', color: 'var(--ifm-font-color-base)' }}>取消</button>
                  <button type="submit" className={styles.submitBtn} style={{ display: 'inline-flex', padding: '6px 20px' }} disabled={loading}>
                    {loading ? '傳送中...' : '送出回覆'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* 渲染子留言（因為算法已扁平化，此處只會在第一層（Root）底下渲染一整列第二層的子留言，不會再無限縮進） */}
        {!isChild && c.children && c.children.length > 0 && (
          <div className={styles.commentChildren}>
            {c.children.map(child => renderCommentNode(child, true))}
          </div>
        )}
      </div>
    );
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
        ) : commentTree.length === 0 ? (
          <p className={styles.statusText}>目前尚無留言</p>
        ) : (
          <>
            <div className={styles.commentsListRoot}>
              {commentTree.slice(0, visibleCount).map(c => renderCommentNode(c, false))}
            </div>

            {visibleCount < commentTree.length && (
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