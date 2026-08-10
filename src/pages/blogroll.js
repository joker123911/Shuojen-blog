import React from 'react';
import Layout from '@theme/Layout';
import BlogrollGrid from '@site/src/components/Blogroll/BlogrollGrid';

export default function BlogrollPage() {
  return (
    <Layout title="部落卷" description="個人網頁名冊">
      <main className="container margin-vert--lg" style={{ maxWidth: '1200px', paddingLeft: '16px', paddingRight: '16px' }}>
        <style>{`
          @media (max-width: 600px) {
            .blogroll-header-title {
              font-size: 1.8rem !important;
            }
            .blogroll-header-title code {
              font-size: 1.2rem !important;
            }
            .blogroll-code-block {
              max-width: 100%;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-all;
            }
          }
        `}</style>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="blogroll-header-title" style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            部落卷 <code style={{ fontSize: '1.8rem', verticalAlign: 'middle' }}>/blogroll</code>
          </h1>

          <div style={{ display: 'inline-block', textAlign: 'center', margin: '1rem 0', maxWidth: '100%' }}>
            <img src="/img/blogroll_logo.png" style={{ borderRadius: '0', maxWidth: '100%', height: 'auto' }} alt="logo" />
            <div style={{ marginTop: '0.8rem' }}>
              <pre className="blogroll-code-block" style={{ display: 'inline-block', padding: '6px 16px', margin: 0, fontSize: '0.85rem' }}>
                <code>![shuojen的徽章](https://shuojen.com/logo.png)</code>
              </pre>
              <p style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)', marginTop: '0.5rem' }}>
                ▲ 我的部落格徽章，歡迎自行取用或直連
              </p>
            </div>
          </div>
        </div>

        <div className="theme-admonition theme-admonition-info alert alert--info margin-bottom--lg" role="alert">
          <div className="admonition-heading">
            <h5><span className="admonition-icon">ℹ️</span> 資訊</h5>
          </div>
          <div className="admonition-content">
            <p style={{ margin: 0 }}>
              本頁面自動同步我的 <a href="/blog/2025/09/16/rss">RSS</a> 訂閱名冊。來源就是到處在各個網站連來連去，只要看到有趣的就加進來；讀著讀著，那些令人驚豔的文章總會讓我不知不覺記住作者，然後忍不住也寫一篇帶原文連結的文章來表達支持，對我來說，這就是部落格最純粹、迷人之處吧。
            </p>
          </div>
        </div>

        <BlogrollGrid />
      </main>
    </Layout>
  );
}
