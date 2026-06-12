// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Shuo-jen Blog',
  staticDirectories: ['static', 'photoblog'],
  tagline: 'Hello',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
    experimental_faster: true,
  },

  scripts: [
    {
      src: 'https://cloud.umami.is/script.js',
      'data-website-id': '45021ff8-89a4-45a9-a0ba-e6352cb94d3c',
      defer: true,
    },
  ],

  url: 'https://shuojen.com',
  baseUrl: '/',
  // 建議將 trailingSlash 設定為 false，避免產生帶有結尾斜線的重複 URL 或導致 RSS 解析路徑問題
  trailingSlash: false,

  organizationName: 'joker123911',
  projectName: 'Shuojen-blog',

  onBrokenLinks: 'throw',
  markdown: {
      hooks: {
        onBrokenMarkdownLinks: 'warn',
      },
    },

  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false, // 禁用預設 blog 以使用下方的多重 blog 外掛
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'default',
        routeBasePath: 'blog',
        path: './blog',
        showReadingTime: true,
        blogTitle: '貼文',
        blogDescription: '這裡是我的貼文與想法，歡迎訂閱 RSS！',
        blogSidebarTitle: '全部貼文',
        blogSidebarCount: 'ALL',
        archiveBasePath: 'archive',
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
        feedOptions: {
          type: 'all',
          title: 'Shuo-jen Blog',
          description: '訂閱最新的貼文！',
          copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen Huang`,
          language: 'zh-TW',
          createFeedItems: async (params) => {
            const {blogPosts, defaultCreateFeedItems, ...rest} = params;
            const localizedPosts = blogPosts.map((post) => {
              const customRssDate = post.frontMatter.rss_date;
              if (customRssDate) {
                return {
                  ...post,
                  metadata: {
                    ...post.metadata,
                    date: customRssDate,
                  },
                };
              }
              return post;
            });
            return defaultCreateFeedItems({
              blogPosts: localizedPosts,
              ...rest,
            });
          },
        },
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'ignore',
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'photoblog',
        routeBasePath: 'photoblog',
        path: './photoblog',
        showReadingTime: false,
        blogSidebarTitle: '全部作品',
        blogSidebarCount: 'ALL',
        archiveBasePath: 'photo-archive',
        blogTitle: '攝影集',
        blogDescription: '日常紀錄。',
        remarkPlugins: [remarkMath],
        rehypePlugins: [rehypeKatex],
        feedOptions: {
          type: 'all',
          title: 'Shuo-jen Photography',
          description: '訂閱攝影紀錄。',
          copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen Huang`,
          language: 'zh-TW',
          createFeedItems: async (params) => {
            const {blogPosts, defaultCreateFeedItems, ...rest} = params;
            const localizedPosts = blogPosts.map((post) => {
              const customRssDate = post.frontMatter.rss_date;
              if (customRssDate) {
                return {
                  ...post,
                  metadata: {
                    ...post.metadata,
                    date: customRssDate,
                  },
                };
              }
              return post;
            });
            return defaultCreateFeedItems({
              blogPosts: localizedPosts,
              ...rest,
            });
          },
        },
        onUntruncatedBlogPosts: 'ignore',
      },
    ],
    [
      './src/plugins/rss-absolute-urls',
      {
         blogPostIds: ['default', 'photoblog'],
      },
    ],
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        language:["en", "zh"],
      },
    ],
    'docusaurus-plugin-image-zoom',
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      zoom: {
        selector: '.markdown img, .markdown picture img',
        background: {
          light: 'rgba(255, 255, 255, 0.9)',
          dark: 'rgba(0, 0, 0, 0.9)',
        },
        config: {
          margin: 24,
          scrollOffset: 0,
        },
      },
      metadata: [
        {name: 'description', content: 'Shuo-jen 的個人部落格，分享電影動漫、攝影紀錄、小工具開發與生活隨筆。'},
        {name: 'keywords', content: 'Shuo-jen, 土木工程, 攝影, Docusaurus, 部落格, 台北, 西洋棋, 魔術方塊, 演唱會, 電影, 動漫'},
        {name: 'author', content: 'Shuo-jen Huang'},
        {name: 'robots', content: 'index, follow'},
      ],
      image: 'img/me.webp',
      navbar: {
        title: '',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: '興趣',
          },
          {to: '/use', label: '愛用', position: 'left'},
          {to: '/now', label: '近況', position: 'left'},
          {to: '/blog', label: '貼文', position: 'left'},
          {to: '/blog/archive',label: '貼文列表',position: 'left'},
          {to: '/random',label: '隨機貼文',position: 'left'},
          {to: '/photography',label: '攝影集',position: 'left'},
          {to: '/photoblog/photo-archive',label: '攝影列表',position: 'left'},
          {to: '/about',label: '關於',position: 'left'},
          {to: '/tool',label: '小工具',position: 'left'},
          {to: '/blogroll',label: '部落卷',position: 'left'},
          {to: '/guestbook',label: '留言板',position: 'left'},
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '站內連結',
            items: [
              { label: '興趣', to: '/docs/intro' },
              { label: '愛用', to: '/use' },
              { label: '近況', to: '/now' },
              { label: '貼文', to: '/blog' },
              { label: '攝影集', to: '/photography' },
              { label: '關於', to: '/about' },
              { label: '部落卷', to: '/blogroll' },
              { label: '留言板', to: '/guestbook' },
            ],
          },
          {
            title: '當雲端用',
            items: [
              {
                label: 'YouTube',
                href: 'https://www.youtube.com/@shuojen',
              },
            ],
          },
          {
            title: '更多',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/joker123911/Shuojen-blog',
              },
              {
                label: '貼文 RSS',
                href: 'https://shuojen.com/blog/rss.xml',
              },
              {
                label: '攝影 RSS',
                href: 'https://shuojen.com/photoblog/rss.xml',
              },
            ],
          },
        ],
        copyright: `
        <div style="display: flex; justify-content: center; align-items: center;">
          <span>Copyright © ${new Date().getFullYear()} Shuo-jen Huang</span>
          <a href="https://shuojen.com" style="margin-left: 10px; display: flex;">
            <img src="https://visitor-badge.laobi.icu/badge?page_id=shuojen.site&left_text=Visits&left_color=black&right_color=gray" alt="visitor badge"/>
          </a>
        </div>
        `,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;