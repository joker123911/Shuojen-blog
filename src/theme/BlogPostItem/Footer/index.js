import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import Guestbook from '@site/src/components/Guestbook';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';

export default function FooterWrapper(props) {
  const { isBlogPostPage, metadata } = useBlogPost();

  return (
    <>
      <Footer {...props} />

      {/* 只在單篇文章頁顯示留言板；列表頁每篇都掛會讓同一頁重複抓取全站留言 */}
      {isBlogPostPage && (
        <div style={{ marginTop: '3rem' }}>
          <Guestbook postSlug={metadata.permalink} />
        </div>
      )}
    </>
  );
}
