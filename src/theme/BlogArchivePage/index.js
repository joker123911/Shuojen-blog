import React, {useState} from 'react';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';
import {PageMetadata} from '@docusaurus/theme-common';
import {useDateTimeFormat} from '@docusaurus/theme-common/internal';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

/* 歷年文章：上方為年份跳轉列與標籤列，下方依年份列出全部文章標題 */

function groupPostsByYear(blogPosts) {
  const byYear = new Map();
  for (const post of blogPosts) {
    const year = post.metadata.date.split('-')[0];
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(post);
  }
  // blogPosts 本身已由新到舊排序，Map 會保留插入順序
  return Array.from(byYear, ([year, posts]) => ({year, posts}));
}

function collectTags(blogPosts) {
  const byPermalink = new Map();
  for (const {metadata} of blogPosts) {
    for (const tag of metadata.tags) {
      const entry = byPermalink.get(tag.permalink);
      if (entry) entry.count += 1;
      else byPermalink.set(tag.permalink, {...tag, count: 1});
    }
  }
  return Array.from(byPermalink.values()).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-TW'),
  );
}

function YearNav({years}) {
  return (
    <nav className={styles.yearNav} aria-label="年份">
      {years.map(({year}) => (
        <a key={year} href={`#${year}`} className={styles.yearLink}>
          {year}
        </a>
      ))}
    </nav>
  );
}

function TagCloud({tags}) {
  // 標籤預設收合，點「標籤」展開（與攝影集的篩選列相同）
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.tagSection}>
      <button
        type="button"
        className={`${styles.tagToggle} ${open ? styles.tagToggleOpen : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="archive-tag-panel"
      >
        標籤
        <span className={styles.tagToggleCount}>{tags.length}</span>
        <span className={styles.tagToggleArrow} aria-hidden="true">▾</span>
      </button>
      <div
        id="archive-tag-panel"
        className={`${styles.tagPanel} ${open ? styles.tagPanelOpen : ''}`}
        inert={!open}
      >
        <div className={styles.tagCloud}>
          {tags.map((tag) => (
            <Link key={tag.permalink} to={tag.permalink} className={styles.tagChip}>
              {tag.label}
              <span className={styles.tagCount}>{tag.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function YearSection({year, posts}) {
  const dateTimeFormat = useDateTimeFormat({
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
  return (
    <section className={styles.yearSection}>
      <Heading as="h2" id={year} className={styles.yearHeading}>
        {year}
        <span className={styles.yearCount}>{posts.length} 篇</span>
      </Heading>
      <ul className={styles.postList}>
        {posts.map(({metadata}) => (
          <li key={metadata.permalink} className={styles.postItem}>
            <time dateTime={metadata.date} className={styles.postDate}>
              {dateTimeFormat.format(new Date(metadata.date))}
            </time>
            <Link to={metadata.permalink} className={styles.postTitle}>
              {metadata.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function BlogArchive({archive}) {
  const title = translate({
    id: 'theme.blog.archive.title',
    message: 'Archive',
    description: 'The page & hero title of the blog archive page',
  });
  const description = translate({
    id: 'theme.blog.archive.description',
    message: 'Archive',
    description: 'The page & hero description of the blog archive page',
  });
  const {blogPosts} = archive;
  const years = groupPostsByYear(blogPosts);
  const tags = collectTags(blogPosts);
  return (
    <>
      <PageMetadata title={title} description={description} />
      <Layout>
        <main className="container margin-vert--lg">
          <div className={styles.wrapper}>
            <Heading as="h1" className={styles.pageTitle}>
              歷年文章
              <span className={styles.totalCount}> · {blogPosts.length} 篇</span>
            </Heading>
            {years.length > 0 && <YearNav years={years} />}
            {tags.length > 0 && <TagCloud tags={tags} />}
            {years.map((y) => (
              <YearSection key={y.year} {...y} />
            ))}
          </div>
        </main>
      </Layout>
    </>
  );
}
