// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Shuo-jen Blog',
  tagline: 'Hello',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },

  // 新增：Plausible Analytics 腳本
  headTags: [
    {
      tagName: 'script',
      attributes: {
        async: true,
        src: 'https://plausible.io/js/pa-otIEX7MxW0xE1WZ_7-i9j.js',
      },
    },
    {
      tagName: 'script',
      innerHTML: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`,
    },
  ],

  // 修改：正式切換至新網域
  url: 'https://shuojen.com/',
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
        // --- 新增：SEO Sitemap 設定 ---
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
      // --- 新增：有利於 SEO 的 Metadata ---
      metadata: [
        {name: 'description', content: 'Shuo-jen 的個人部落格，分享土木工程、攝影紀錄、程式開發與生活隨筆。'},
        {name: 'keywords', content: 'Shuo-jen, 土木工程, 攝影, Docusaurus, 部落格, 台北, 橋梁工程'},
        {name: 'author', content: 'Shuo-jen Huang'},
        {name: 'robots', content: 'index, follow'},
      ],
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
          {to: '/use', label: '愛用', position: 'left'},
          {to: '/now', label: '近況', position: 'left'},
          {to: '/blog', label: '貼文', position: 'left'},
          {
            to: '/blog/archive',
            position: 'left',
            label: '貼文列表',
          },
          {
            to: '/photography',
            label: '攝影集',
            position: 'left'
          },
          {
            to: '/photoblog/photo-archive',
            position: 'left',
            label: '攝影列表',
          },
          {
            to: '/guestbook',
            label: '留言板',
            position: 'left'
          },
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
          <span>Copyright © ${new Date().getFullYear()} Shuo-jen Huang.</span>
          <a href="https://shuojen.com" style="margin-left: 10px; display: flex;">
            <img src="https://visitor-badge.laobi.icu/badge?page_id=shuojen.site&left_text=Visitors&left_color=black&right_color=gray" alt="visitor badge"/>
          </a>
        </div>
        `,
        // 上方的 page_id 已改回 shuojen.site，以延續舊有的統計數字。
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;