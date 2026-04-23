import React from 'react';
import Footer from '@theme-original/BlogPostItem/Footer';
import Guestbook from '@site/src/components/Guestbook';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';

export default function FooterWrapper(props) {
  // 修正處：抓取 metadata
  const { isBlogPostPage, metadata } = useBlogPost();
  const postSlug = metadata.permalink; // 這才是文章真正的路徑

  return (
    <>
      <Footer {...props} />

      <div style={{ marginTop: '3rem' }}>
        {/* 修正處：將文章專屬的 slug 傳給留言板 */}
        <Guestbook readOnly={!isBlogPostPage} postSlug={postSlug} />
      </div>
    </>
  );
}