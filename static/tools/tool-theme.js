// 小工具頁（static/*.html）共用的 Tailwind 主題。
// 每頁在 Tailwind Play CDN 之後載入：
//   <script src="https://cdn.tailwindcss.com/3.4.17"></script>
//   <script src="/tools/tool-theme.js"></script>
// 外框（卡片、標題列、頁尾）和表單元件都定義在這裡，改這個檔案就能一次調整所有工具頁。
// 成語迷宮 game.html 有自己的風格，不使用這個檔案。
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Roboto Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [
    function ({ addComponents, theme }) {
      const c = (path) => theme(`colors.${path}`);
      const sm = `@media (min-width: ${theme('screens.sm')})`;
      const md = `@media (min-width: ${theme('screens.md')})`;

      addComponents({
        // 整頁：淺灰底、內容置中
        '.tool-page': {
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem 0.75rem',
          backgroundColor: c('slate.50'),
          color: c('slate.800'),
          '-webkit-font-smoothing': 'antialiased',
          [md]: { padding: '3rem 1.5rem' },
        },
        // 白色主卡片（寬度由各頁用 max-w-* 決定）
        '.tool-card': {
          width: '100%',
          backgroundColor: '#fff',
          border: `1px solid ${c('slate.100')}`,
          borderRadius: '1.5rem',
          boxShadow: theme('boxShadow.2xl'),
          padding: '1.25rem',
          [sm]: { padding: '2rem', borderRadius: '2rem' },
          [md]: { padding: '2.5rem' },
        },
        // 標題列：色塊圖示 + 標題 + 說明，右側可放按鈕
        '.tool-header': {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          paddingBottom: '1.5rem',
          marginBottom: '1.75rem',
          borderBottom: `1px solid ${c('slate.100')}`,
        },
        '.tool-header-main': {
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flex: '1 1 auto',
          minWidth: '0',
        },
        '.tool-header-actions': {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        },
        '.tool-icon': {
          width: '3rem',
          height: '3rem',
          flexShrink: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '1rem',
          backgroundColor: c('indigo.600'),
          color: '#fff',
          fontSize: '1.25rem',
          boxShadow: `0 10px 15px -3px ${c('indigo.200')}, 0 4px 6px -4px ${c('indigo.200')}`,
        },
        '.tool-title': {
          margin: '0',
          fontSize: '1.25rem',
          lineHeight: '1.4',
          fontWeight: '700',
          letterSpacing: '-0.01em',
          color: c('slate.800'),
          [md]: { fontSize: '1.5rem' },
        },
        '.tool-subtitle': {
          margin: '0.125rem 0 0',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: c('slate.500'),
        },
        // 區塊小標題
        '.tool-section-title': {
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: '0 0 0.75rem',
          fontSize: '0.875rem',
          fontWeight: '700',
          color: c('slate.700'),
        },
        // 灰底區塊（設定、輸入區）
        '.tool-panel': {
          backgroundColor: c('slate.50'),
          border: `1px solid ${c('slate.100')}`,
          borderRadius: '1rem',
          padding: '1rem',
          [sm]: { padding: '1.25rem' },
        },
        '.tool-label': {
          display: 'block',
          marginBottom: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: '700',
          color: c('slate.500'),
        },
        '.tool-input': {
          width: '100%',
          padding: '0.625rem 0.875rem',
          fontSize: '0.875rem',
          color: c('slate.700'),
          backgroundColor: '#fff',
          border: `1px solid ${c('slate.200')}`,
          borderRadius: '0.75rem',
          outline: 'none',
          transition: 'border-color .15s, box-shadow .15s',
          '&:focus': {
            borderColor: c('indigo.500'),
            boxShadow: `0 0 0 3px ${c('indigo.100')}`,
          },
          '&::placeholder': { color: c('slate.400') },
        },
        // 按鈕：主要（實心紫）、次要（灰）、外框
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.125rem',
          fontSize: '0.875rem',
          fontWeight: '700',
          lineHeight: '1.25rem',
          borderRadius: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color .15s, color .15s, border-color .15s, transform .1s',
          '&:active:not(:disabled)': { transform: 'scale(0.98)' },
          '&:disabled': { opacity: '0.5', cursor: 'not-allowed' },
        },
        '.btn-primary': {
          backgroundColor: c('indigo.600'),
          color: '#fff',
          boxShadow: `0 4px 6px -1px ${c('indigo.100')}`,
          '&:hover:not(:disabled)': { backgroundColor: c('indigo.700') },
        },
        '.btn-secondary': {
          backgroundColor: c('slate.100'),
          color: c('slate.600'),
          '&:hover:not(:disabled)': { backgroundColor: c('slate.200') },
        },
        '.btn-outline': {
          backgroundColor: '#fff',
          color: c('slate.600'),
          border: `1px solid ${c('slate.200')}`,
          '&:hover:not(:disabled)': { borderColor: c('indigo.300'), color: c('indigo.600') },
        },
        '.btn-lg': {
          padding: '0.875rem 1.5rem',
          fontSize: '1rem',
          borderRadius: '1rem',
        },
        // 頁尾：© Shuojen.com · 回小工具（· 其他動作）
        '.tool-footer': {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.375rem 0.75rem',
          marginTop: '2rem',
          fontSize: '0.75rem',
          letterSpacing: '0.025em',
          color: c('slate.400'),
          '& a, & button': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: c('slate.500'),
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            textDecorationColor: c('slate.300'),
            transition: 'color .15s',
          },
          '& a:hover, & button:hover': { color: c('indigo.600'), textDecorationColor: c('indigo.300') },
        },
        '.tool-footer-sep': { color: c('slate.300') },
      });
    },
  ],
};
