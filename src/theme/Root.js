import React from 'react';
import EasterEggs from '@site/src/components/EasterEggs';

// Docusaurus 的最外層元件，換頁時不會重新掛載，適合放全站常駐的功能
export default function Root({children}) {
  return (
    <>
      {children}
      <EasterEggs />
    </>
  );
}
