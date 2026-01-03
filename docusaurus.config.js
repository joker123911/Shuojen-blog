// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Shuo-jen Blog',
  tagline: 'Hello',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },

  url: 'https://shuojen.site/',
  baseUrl: '/',

  organizationName: 'joker123911',
  projectName: 'Shuojen-blog',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
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
        feedOptions: {
          type: 'all',
          title: 'Shuo-jen Blog',
          description: '訂閱追蹤最新的貼文！',
          copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen Huang`,
          language: 'zh-TW',
        },
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        id: 'photoblog',
        // 還原為 photoblog，確保你的 RSS 路徑不變
        routeBasePath: 'photoblog',
        path: './photoblog',
        showReadingTime: false,
        blogSidebarTitle: '全部作品',
        blogSidebarCount: 'ALL',
        archiveBasePath: 'photo-archive',
        blogTitle: '攝影作品集',
        blogDescription: '光影紀錄。',
        feedOptions: {
          type: 'all',
          title: 'Shuo-jen Photography',
          description: '訂閱我的攝影紀錄。',
          copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen Huang`,
          language: 'zh-TW',
        },
      },
    ],
    [
    require.resolve("@easyops-cn/docusaurus-search-local"),
          {
            hashed: true,
            language:["en", "zh"],
          },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/me.webp',
      navbar: {
        title: 'Shuo-Jen Huang',
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
          // --- 新增連結 ---
          {to: '/use', label: '愛用', position: 'left'},
          {to: '/now', label: '近況', position: 'left'},
          // ----------------
          {to: '/blog',
          label: '貼文',
          position: 'left'},
          {
            to: '/blog/archive',
            position: 'left',
            label: '貼文列表',
          },
          {
          // 修改重點：指向改名後的頁面 photography
          to: '/photography',
          label: '攝影',
          position: 'left'},
          {
            // 指向插件產生的攝影列表
            to: '/photoblog/photo-archive',
            position: 'left',
            label: '攝影列表',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: '站內連結',
            items: [
              {
                label: '興趣',
                to: '/docs/intro',
              },
              // --- 新增頁尾連結 ---
              {
                label: '愛用',
                to: '/use',
              },
              {
                label: '近況',
                to: '/now',
              },
              // ------------------
              {
                label: '貼文',
                to: '/blog',
              },
              {
                label: '攝影',
                // 同步修正為新的頁面路徑
                to: '/photography',
              },
            ],
          },
          {
            title: '當雲端用',
            items: [
              {
                label: 'YouTube',
                href: 'https://www.youtube.com/@janiturtle',
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
                href: 'https://shuojen.site/blog/rss.xml',
              },
              {
                label: '攝影 RSS',
                // 維持原本路徑
                href: 'https://shuojen.site/photoblog/rss.xml',
              },
            ],
          },
        ],
        // highlight-start
        // --- 修改重點：在此處加入了不蒜子的顯示 HTML ---
        copyright: `
        <div style="display: flex; justify-content: center; align-items: center;">
          <span>Copyright © ${new Date().getFullYear()} Shuo-jen Huang.</span>
          <a href="https://shuojen.site" style="margin-left: 10px; display: flex;">
            <img src="https://visitor-badge.laobi.icu/badge?page_id=shuojen.site&left_text=Visitors&left_color=black&right_color=gray" alt="visitor badge"/>
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