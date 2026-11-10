import React from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import {
  useBlogTagsPostsPageTitle,
  useDateTimeFormat,
} from '@docusaurus/theme-common/internal';
import BlogLayout from '@theme/BlogLayout';
import BlogListPaginator from '@theme/BlogListPaginator';
import SearchMetadata from '@theme/SearchMetadata';
import Unlisted from '@theme/ContentVisibility/Unlisted';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

/* 標籤頁改為「標題列表」：只列出日期與標題，讓讀者自己點選文章。
   blog 與 photoblog 共用。 */

/* 從 tag-post-index 插件（docusaurus.config.js）取得此標籤的全部文章；
   取不到時退回本頁分頁內的文章。 */
function useAllTagPosts(tag, items) {
  const index = usePluginData('tag-post-index');
  const indices = index?.tags?.[tag.permalink];
  if (!indices) {
    return {
      posts: items.map(({content: {metadata: m}}) => ({
        title: m.title,
        permalink: m.permalink,
        date: m.date,
      })),
      complete: false,
    };
  }
  return {
    posts: indices.map((i) => {
      const [title, permalink, date] = index.posts[i];
      return {title, permalink, date};
    }),
    complete: true,
  };
}

function PostList({posts}) {
  const dateTimeFormat = useDateTimeFormat({
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  });
  return (
    <ul className={styles.postList}>
      {posts.map(({permalink, title, date}) => {
        return (
          <li key={permalink} className={styles.postItem}>
            <time dateTime={date} className={styles.postDate}>
              {dateTimeFormat.format(new Date(date))}
            </time>
            <Link to={permalink} className={styles.postTitle}>
              {title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TagPostListPage({tag, items, sidebar, listMetadata}) {
  const title = useBlogTagsPostsPageTitle(tag);
  const {posts, complete} = useAllTagPosts(tag, items);
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogTagPostListPage,
      )}>
      <PageMetadata title={title} description={tag.description} />
      <SearchMetadata tag="blog_tags_posts" />
      <BlogLayout sidebar={sidebar}>
        {tag.unlisted && <Unlisted />}
        <header className="margin-bottom--lg">
          <Heading as="h1">{title}</Heading>
          {tag.description && <p>{tag.description}</p>}
          <Link href={tag.allTagsPath}>
            <Translate
              id="theme.tags.tagsPageLink"
              description="The label of the link targeting the tag list page">
              View All Tags
            </Translate>
          </Link>
        </header>
        <PostList posts={posts} />
        {!complete && <BlogListPaginator metadata={listMetadata} />}
      </BlogLayout>
    </HtmlClassNameProvider>
  );
}

export default function BlogTagsPostsPage(props) {
  return <TagPostListPage {...props} />;
}
