// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'shuojen.site',
  tagline: 'Hello',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://shuojen.site/',
  baseUrl: '/',

  organizationName: 'facebook',
  projectName: 'docusaurus',

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
        blogTitle: 'shuojen.site',
        blogDescription: '這裡是我的貼文與想法，歡迎訂閱 RSS！',
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
        routeBasePath: 'photoblog',
        path: './photoblog',
        showReadingTime: true,
        blogSidebarTitle: 'Recent posts',
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
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/me.webp',
      navbar: {
        // highlight-start
        // --- 修改開始: 將 title 這一行刪除 ---
        // title: 'Shuo-jen Huang', // <--- 刪除或註解掉這一行
        // --- 修改結束 ---
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
              {
                label: '貼文 RSS',
                href: 'https://shuojen.site/blog/rss.xml',
              },
              {
                label: '攝影 RSS',
                href: 'https://shuojen.site/photoblog/rss.xml',
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