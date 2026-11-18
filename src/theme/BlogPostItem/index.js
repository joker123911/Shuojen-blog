import React from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import BlogPostItem from '@theme-original/BlogPostItem';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import styles from './styles.module.css';

/**
 * 正式站的草稿（frontmatter 的 draftPreview，見 docusaurus.config.js）：
 * - 站長（<html data-site-admin>）看到的跟一般文章一樣，上方多一條「草稿」橫幅。
 * - 其他人只看到「找不到這篇文章」，頁面也加上 noindex。
 * 注意這只是隱藏：內容還是在網頁原始碼裡。
 */
export default function BlogPostItemWrapper(props) {
  const { metadata, isBlogPostPage } = useBlogPost();
  if (!metadata.frontMatter.draftPreview) return <BlogPostItem {...props} />;

  return (
    <>
      {isBlogPostPage && (
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
      )}
      {isBlogPostPage && (
        <div className={styles.locked}>
          <h1>找不到這篇文章</h1>
          <p>
            這篇文章還沒發佈。回到<Link to="/blog">貼文列表</Link>。
          </p>
        </div>
      )}
      <div className={styles.draft}>
        {isBlogPostPage && (
          <div className="alert alert--warning margin-bottom--md" role="alert">
            <strong>草稿</strong>：這篇還沒發佈，只有站長看得到。
          </div>
        )}
        <BlogPostItem {...props} />
      </div>
    </>
  );
}
