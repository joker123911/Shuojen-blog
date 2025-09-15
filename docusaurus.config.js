// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Site',
  tagline: 'Hello',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://shuojen.shuojen.blog/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // 請記得將這裡換成您自己的 GitHub 倉庫連結
        },
        // 重要的第一步：將 presets 中的 blog 設定設定為 false 或直接移除
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  // highlight-start
  // 新增 plugins 區塊來分別設定您的部落格和作品集
  plugins: [
    [
      '@docusaurus/plugin-content-blog',
      {
        // --- 這是您原本的部落格 ---
        id: 'default', // 使用 'default' ID 代表這是主要的部落格
        routeBasePath: 'blog', // 網站上的路徑 /blog
        path: './blog', // 讀取根目錄下的 blog 資料夾

        // 以下是從您原本 presets 中搬過來的設定
        showReadingTime: true,
        feedOptions: {
          type: ['rss', 'atom'],
          xslt: true,
        },
        onInlineTags: 'warn',
        onInlineAuthors: 'warn',
        onUntruncatedBlogPosts: 'warn',
      },
    ],
    [
      '@docusaurus/plugin-content-blog',
      {
        // --- 這是您新增的攝影作品集 ---
        id: 'photoblog', // 給它一個獨一無二的 ID
        routeBasePath: 'photoblog', // 網站上的路徑 /portfolio
        path: './photoblog', // 讀取根目錄下的 portfolio 資料夾

        // 您可以為作品集設定不同的選項
        showReadingTime: true, // 攝影作品通常不需要顯示閱讀時間
        blogSidebarTitle: 'Recent posts',
        blogSidebarCount: 'ALL',
      },
    ],
  ],
  // highlight-end

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/me.webp',
      navbar: {
        title: 'Shuo-jen Huang',
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
          to: '/photoblog',
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
                href: 'https://github.com/facebook/docusaurus',
              },
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
