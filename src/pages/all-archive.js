// src/pages/all-archive.js

import React from 'react';
import Link from '@docusaurus/Link';
import { usePluginData } from '@docusaurus/useGlobalData';
import { PageMetadata } from '@docusaurus/theme-common';
import { useDateTimeFormat } from '@docusaurus/theme-common/internal';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

// --- 輔助元件：單一年份區塊 ---
function Year({ year, posts }) {
  const dateTimeFormat = useDateTimeFormat({
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  const formatDate = (lastUpdated) => {
    try {
      return dateTimeFormat.format(new Date(lastUpdated));
    } catch (e) {
      console.warn('❌ 日期格式錯誤:', lastUpdated, e);
      return lastUpdated;
    }
  };

  return (
    <>
      <Heading as="h3" id={year}>
        {year}
      </Heading>
      <ul>
        {posts.map((post, idx) => (
          <li key={post.metadata.permalink ?? idx}>
            <Link to={post.metadata.permalink ?? '#'}>
              {formatDate(post.metadata.date)} - {post.metadata.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

// --- 輔助元件：年份群組區塊 ---
function YearsSection({ years }) {
  return (
    <section className="margin-vert--lg">
      <div className="container">
        <div className="row">
          {years.map((_props, idx) => (
            <div key={idx} className="col col--3 margin-vert--lg">
              <Year {..._props} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- 將文章依年份分組 ---
function listPostsByYears(blogPosts) {
  const postsByYear = blogPosts.reduce((posts, post) => {
    const rawDate = post.metadata?.date;
    const d = new Date(rawDate);

    if (isNaN(d)) {
      console.warn('⚠️ 無效日期:', rawDate, post);
      return posts;
    }

    const year = d.getFullYear();
    const yearPosts = posts.get(year) ?? [];
    yearPosts.push(post);
    posts.set(year, yearPosts);
    return posts;
  }, new Map());

  return Array.from(postsByYear, ([year, posts]) => ({
    year,
    posts,
  })).sort((a, b) => b.year - a.year);
}

// --- 主要頁面元件 ---
export default function AllArchivePage() {
  // 讀取兩個部落格 plugin 的資料
  const defaultBlogData = usePluginData(
    'docusaurus-plugin-content-blog',
    'default'
  );
  const photoBlogData = usePluginData(
    'docusaurus-plugin-content-blog',
    'photoblog'
  );

  // 安全取得 blogPosts
  const defaultBlogPosts = defaultBlogData?.blogPosts ?? [];
  const photoBlogPosts = photoBlogData?.blogPosts ?? [];

  // Debug log
  console.log('📝 defaultBlogPosts:', defaultBlogPosts);
  console.log('📷 photoBlogPosts:', photoBlogPosts);

  // 合併並依日期排序（新 → 舊）
  const allPosts = [...defaultBlogPosts, ...photoBlogPosts];
  allPosts.sort(
    (a, b) => Date.parse(b.metadata?.date) - Date.parse(a.metadata?.date)
  );

  console.log('📚 allPosts (合併後):', allPosts);

  // 依年份分組
  const years = listPostsByYears(allPosts);

  console.log('📆 years (分組後):', years);

  const title = '所有內容彙整';
  const description = '所有貼文與攝影作品的完整封存列表。';

  return (
    <>
      <PageMetadata title={title} description={description} />
      <Layout>
        <header className="hero hero--primary">
          <div className="container">
            <Heading as="h1" className="hero__title">
              {title}
            </Heading>
            <p className="hero__subtitle">{description}</p>
          </div>
        </header>
        <main>
          {years.length > 0 ? (
            <YearsSection years={years} />
          ) : (
            <div className="container margin-vert--lg">
              <p>⚠️ 沒有找到任何文章，請檢查 blog plugin 設定或文章 front matter。</p>
            </div>
          )}
        </main>
      </Layout>
    </>
  );
}
