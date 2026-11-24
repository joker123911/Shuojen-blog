import React, { useState } from 'react';
import styles from './styles.module.css';

/**
 * YouTube façade：一開始只顯示縮圖，點擊後才載入播放器。
 * - 沒點的影片不會下載 YouTube 播放器的 JS（每支約 0.5–1 MB）
 * - 播放器使用 youtube-nocookie.com，按播放前不設定追蹤 cookie
 *
 * 用法（MDX）：
 *   import YouTube from '@site/src/components/YouTube';
 *   <YouTube id="影片 ID" title="影片標題" />
 */
export default function YouTube({ id, title = 'YouTube 影片' }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className={styles.container}>
      {playing ? (
        <iframe
          className={styles.frame}
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={styles.facade}
          onClick={() => setPlaying(true)}
          aria-label={`播放影片：${title}`}
        >
          <img
            className={styles.thumb}
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            width={480}
            height={360}
            loading="lazy"
            decoding="async"
          />
          <span className={styles.playIcon} aria-hidden="true">
            <svg viewBox="0 0 68 48" width="68" height="48">
              <path
                d="M66.5 7.7c-.8-2.9-3-5.2-5.9-6C55.3.3 34 .3 34 .3s-21.3 0-26.6 1.4c-2.9.8-5.1 3.1-5.9 6C.1 13 .1 24 .1 24s0 11 1.4 16.3c.8 2.9 3 5.2 5.9 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.6-1.4c2.9-.8 5.1-3.1 5.9-6 1.4-5.3 1.4-16.3 1.4-16.3s0-11-1.4-16.3z"
                fill="#f00"
              />
              <path d="M45 24 27 14v20z" fill="#fff" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
