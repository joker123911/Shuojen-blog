import React, {useEffect} from 'react';
import {toggleMode, useEasterEggMode} from './modeStore';
import {hasModifier, isEditable, keyName} from './keyboard';
import './eightbit/eightbit.css';

/**
 * 全站彩蛋（由 src/theme/Root.js 掛載到每一頁）：在頁面上（非輸入框）輸入 Konami 秘技 ↑↑↓↓←→←→BA，
 * 整個網站切換成紅白機橫向卷軸遊戲風格。再輸入一次，或點左下角的按鈕即可恢復。
 * 導覽列下方的 HUD 由 src/theme/Navbar 掛上。
 */

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export default function EasterEggs() {
  const mode = useEasterEggMode();

  // 保留最近 10 個按鍵（連同按下當時的捲動位置），與秘技完全相同就觸發
  useEffect(() => {
    let recent = [];
    const onKeyDown = (e) => {
      if (e.repeat || hasModifier(e)) return;
      if (isEditable(e.target)) return;
      recent.push({key: keyName(e), scrollY: window.scrollY});
      if (recent.length > KONAMI.length) recent.shift();
      if (recent.length === KONAMI.length && recent.every(({key}, i) => key === KONAMI[i])) {
        const {scrollY} = recent[0];
        recent = [];
        toggleMode('eightbit', {restoreScrollY: scrollY});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (mode !== 'eightbit') return null;

  return (
    <>
      {/* 站在地面上的小狗（站長的吉祥物 ▼・ᴥ・▼） */}
      <span className="eightbit-player" aria-hidden="true" />
      <button
        type="button"
        className="eightbit-exit"
        onClick={() => toggleMode('eightbit')}
        title="離開 8-bit 模式（再輸入一次秘技也可以）">
        <span className="eightbit-coin" aria-hidden="true" />
        離開 8-BIT
      </button>
    </>
  );
}
