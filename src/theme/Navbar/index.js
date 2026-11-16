import React from 'react';
import Navbar from '@theme-original/Navbar';
import EightBitHud from '@site/src/components/EasterEggs/eightbit/Hud';

// 包住原本的導覽列：8-bit 彩蛋開著時，在導覽列下方加上遊戲 HUD
export default function NavbarWrapper(props) {
  return (
    <>
      <Navbar {...props} />
      <EightBitHud />
    </>
  );
}
