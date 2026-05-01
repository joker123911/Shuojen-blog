import React from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import PaginatorNavLink from '@theme/PaginatorNavLink';
import Link from '@docusaurus/Link';

export default function BlogPostPaginator(props) {
  const {nextItem, prevItem} = props;

  return (
    <>
      <style>
        {`
          .custom-pagination-container {
            display: flex;
            gap: var(--ifm-spacing-horizontal);
            width: 100%;
            margin: 2rem 0;
            padding: 0;
            align-items: stretch;
          }
          .custom-pagination-item {
            flex: 1; /* 確保三個區塊絕對均分 1:1:1 */
            display: flex;
            min-width: 0;
          }
          .custom-pagination-item > * {
            width: 100%;
          }

          /* 直接套用 Docusaurus 內建的 class，只覆蓋置中對齊 */
          .custom-random-link {
            display: flex;
            flex-direction: column;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
          }

          /* 覆蓋 Docusaurus 預設，允許文字自然換行，避免單字被不自然切斷 */
          .custom-pagination-container .pagination-nav__link {
            white-space: normal !important;
            word-break: keep-all !important;
            overflow-wrap: anywhere !important;
            height: 100%;
          }
          .custom-pagination-container .pagination-nav__link * {
            white-space: normal !important;
          }

          /* 手機版適配：螢幕小於 768px */
          @media (max-width: 768px) {
            .custom-pagination-container {
              gap: 0.5rem; /* 縮小按鈕之間的間距 */
            }
            
            /* 縮小按鈕內邊距，把空間留給文字 */
            .custom-pagination-container .pagination-nav__link {
              padding: 0.5rem !important; 
            }

            /* 同步微調所有按鈕的字體大小，避免擁擠 */
            .custom-pagination-container .pagination-nav__sublabel {
              font-size: 0.75rem !important;
              margin-bottom: 0.15rem !important;
            }
            .custom-pagination-container .pagination-nav__label {
              font-size: 0.9rem !important;
            }
          }
        `}
      </style>
      <nav
        className="docusaurus-mt-lg"
        aria-label={translate({
          id: 'theme.blog.post.paginator.navAriaLabel',
          message: 'Blog post page navigation',
          description: 'The ARIA label for the blog posts pagination',
        })}>
        
        <div className="custom-pagination-container">
          {/* 較新一篇 */}
          <div className="custom-pagination-item">
            {prevItem ? (
              <PaginatorNavLink
                {...prevItem}
                subLabel={
                  <Translate
                    id="theme.blog.post.paginator.newerPost"
                    message="較新一篇"
                  />
                }
              />
            ) : (
              /* 若無文章則保留透明佔位符，維持排版平衡 */
              <div style={{ border: '1px solid transparent', width: '100%' }} />
            )}
          </div>

          {/* 隨機閱讀 (中間按鈕) */}
          <div className="custom-pagination-item">
            <Link
              to="/random"
              className="pagination-nav__link custom-random-link"
            >
              {/* 直接使用 Docusaurus 內建的 class，保證字體大小與顏色 100% 相同 */}
              <div className="pagination-nav__sublabel">
                貼文扭蛋機
              </div>
              <div className="pagination-nav__label">
                隨機閱讀
              </div>
            </Link>
          </div>

          {/* 較舊一篇 */}
          <div className="custom-pagination-item">
            {nextItem ? (
              <PaginatorNavLink
                {...nextItem}
                subLabel={
                  <Translate
                    id="theme.blog.post.paginator.olderPost"
                    message="較舊一篇"
                  />
                }
                isNext
              />
            ) : (
              <div style={{ border: '1px solid transparent', width: '100%' }} />
            )}
          </div>
        </div>
      </nav>
    </>
  );
}