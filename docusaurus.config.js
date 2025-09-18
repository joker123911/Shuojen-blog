// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Shuo-jen Blog', // <-- 建議將這裡改成您的主要網站標題
  tagline: 'Hello',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://shuojen.site/',
  baseUrl: '/',

  // highlight-start
  // --- 修改重點 1：修正 GitHub 專案資訊 ---
  // 這裡需要填寫您自己的 GitHub 使用者名稱和倉庫名稱
  // 這對於後續的部署和 "Edit this page" 連結至關重要
  organizationName: 'joker123911', // 您的 GitHub 使用者名稱
  projectName: 'Shuojen-blog', // 您的 GitHub 倉庫名稱
  // highlight-end

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
          // highlight-start
          // --- 修改重點 2：更新 Edit URL ---
          // 讓「編輯此頁」連結指向您正確的倉庫
          // editUrl: 'https://github.com/joker123911/Shuojen-blog/tree/main/',
          // highlight-end
        },
        blog: false, // 維持停用 presets 中的 blog
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
        // === 這是您原本的「貼文」部落格 ===
        id: 'default',
        routeBasePath: 'blog',
        path: './blog',
        showReadingTime: true,
        blogTitle: '貼文與想法',
        blogDescription: '這裡是我的貼文與想法，歡迎訂閱 RSS！',
        // highlight-start
        // --- 修改重點 3：為「貼文」也加上側邊欄設定 ---
        blogSidebarTitle: '全部貼文',
        blogSidebarCount: 'ALL',
        // highlight-end
        feedOptions: {
          type: 'all',
          title: 'Shuo-jen Blog',
          description: '訂閱追蹤最新的貼文！',
          copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen ,Huang`,
          language: 'zh-TW',
        },
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
        editUrl: 'https://github.com/joker123911/Shuojen-blog/tree/main/', // <-- 同樣更新 Edit URL
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        // === 這是您新增的「攝影」作品集 ===
        id: 'photoblog', // ID 從 portfolio 改成 photoblog，與路徑統一
        routeBasePath: 'photoblog', // 路徑從 portfolio 改成 photoblog
        path: './photoblog', // 資料夾從 portfolio 改成 photoblog
        showReadingTime: false, // 攝影作品不需要閱讀時間
        blogSidebarTitle: '全部作品', // 標題改為「近期作品」
        blogSidebarCount: 'ALL',
        blogTitle: '攝影作品集',
        blogDescription: '光影紀錄。',
        feedOptions: {
          type: 'all',
          title: 'Shuo-jen Photography',
          description: '訂閱我的攝影紀錄。',
          copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen Huang`,
          language: 'zh-TW',
        },
        //editUrl: 'https://github.com/joker123911/Shuojen-blog/tree/main/', // <-- 同樣更新 Edit URL
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/me.webp',
      navbar: {
        // highlight-start
        // --- 修改重點 4：修正導覽列標題 ---
        // 移除了之前建議刪除的註解，並設定一個簡潔的標題
        title: 'Shuo-jen Huang',
        // highlight-end
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
          {to: '/blog',
          label: '貼文',
          position: 'left'},
          {
          to: '/photoblog', // <-- 路徑對應上面 plugins 的設定
          label: '攝影',
          position: 'left'},
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
              {
                label: '貼文',
                to: '/blog',
              },
              {
                label: '攝影',
                to: '/photoblog',
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
                // highlight-start
                // --- 額外修正：將這裡更新為您自己的 GitHub 倉庫 ---
                href: 'https://github.com/joker123911/Shuojen-blog',
                // highlight-end
              },
              // highlight-start
              // --- 在這裡新增您的兩個 RSS 連結 ---
              {
                label: '貼文 RSS',
                href: 'https://shuojen.site/blog/rss.xml',
              },
              {
                label: '攝影 RSS',
                href: 'https://shuojen.site/photoblog/rss.xml',
              },
              // --- 新增結束 ---
              // highlight-end
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Shuo-jen,Huang`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;