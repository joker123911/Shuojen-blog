import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import Guestbook from '@site/src/components/Guestbook';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';

export default function FooterWrapper(props) {
  const { isBlogPostPage, metadata } = useBlogPost();

  return (
    <>
      <Footer {...props} />

      {/* 單篇文章頁可留言；列表頁只顯示該篇留言（唯讀）。
          同一頁多個留言板會共用 Guestbook 內的全站留言快取，只發一次請求 */}
      <div style={{ marginTop: '3rem' }}>
        <Guestbook readOnly={!isBlogPostPage} postSlug={metadata.permalink} />
      </div>
    </>
  );
}
