import React from 'react';
import OriginalCopyright from '@theme-original/Footer/Copyright';
import VisitCounter from '@site/src/components/VisitCounter';
import styles from './styles.module.css';

// 包住原本的版權文字，旁邊加上自架的瀏覽數徽章（取代第三方 visitor-badge）
export default function FooterCopyright(props) {
  return (
    <div className={styles.row}>
      <OriginalCopyright {...props} />
      <VisitCounter />
    </div>
  );
}
