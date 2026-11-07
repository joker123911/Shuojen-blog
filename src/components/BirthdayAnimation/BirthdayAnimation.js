import React, { useState } from 'react';
import confetti from 'canvas-confetti';

/**
 * 格式化顯示的祝賀標題
 * 智慧加上慶祝 emoji（若已含有 emoji 則保持原樣）
 */
function formatWithEmoji(str) {
  if (!str) return '';
  const trimmed = str.trim();
  if (!trimmed) return '';

  // 檢查是否開頭或結尾已自帶常見 Emoji
  const hasEmoji = /^[\p{Extended_Pictographic}\u2600-\u27bf]/u.test(trimmed) ||
                   /[\p{Extended_Pictographic}\u2600-\u27bf]$/u.test(trimmed);
  if (hasEmoji) {
    return trimmed;
  }

  // 若包含「生日」，使用蛋糕 🎂，否則使用彩炮 🎉
  const emoji = trimmed.includes('生日') ? '🎂' : '🎉';
  return `${emoji} ${trimmed} ${emoji}`;
}

export default function BirthdayAnimation({
  name = 'ikuka',
  text = '',
  message = '祝福你事事順利充滿驚喜！',
  buttonText = '🎉 放彩條慶祝！',
  placeholder = '輸入想打的字（例如：祝小明生日快樂！、恭喜畢業！）',
  showInput = true,
}) {
  const [customText, setCustomText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const fireConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    const fire = (particleRatio, opts) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      fireConfetti();
    }
  };

  const defaultRawTitle = text || `🎂 祝 ${name} 生日快樂！🎂`;
  const displayTitle = customText.trim()
    ? formatWithEmoji(customText)
    : formatWithEmoji(defaultRawTitle);

  return (
    <div style={{
      textAlign: 'center',
      padding: '1.5rem 1rem',
      borderRadius: '16px',
      border: '1px solid var(--ifm-color-emphasis-200)',
      background: 'var(--ifm-card-background-color, var(--ifm-background-color))',
      color: 'var(--ifm-font-color-base)',
      margin: '1.5rem 0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      boxSizing: 'border-box'
    }}>
      {/* 祝賀標題（支援即時顯示自訂輸入內容） */}
      <div style={{
        fontSize: 'clamp(1.2rem, 4.5vw, 1.6rem)',
        fontWeight: 'bold',
        margin: '0 0 10px 0',
        lineHeight: '1.4',
        wordBreak: 'break-word',
        minHeight: '2.2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      }}>
        {displayTitle}
      </div>

      {message && (
        <p style={{
          fontSize: '1rem',
          marginBottom: '1.2rem',
          opacity: 0.85,
          lineHeight: '1.5'
        }}>
          {message}
        </p>
      )}

      {/* 自訂輸入框 */}
      {showInput && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '380px',
          margin: '0 auto 1.2rem auto',
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            aria-label="自訂祝賀文字"
            style={{
              width: '100%',
              padding: '9px 38px 9px 16px',
              fontSize: '0.95rem',
              borderRadius: '24px',
              border: `1.5px solid ${isFocused ? 'var(--ifm-color-primary, #ff4757)' : 'var(--ifm-color-emphasis-300, #ccc)'}`,
              background: 'var(--ifm-background-color, #fff)',
              color: 'var(--ifm-font-color-base, #333)',
              outline: 'none',
              textAlign: 'center',
              boxShadow: isFocused ? '0 0 0 3px rgba(255, 71, 87, 0.18)' : 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxSizing: 'border-box'
            }}
          />
          {customText && (
            <button
              type="button"
              onClick={() => setCustomText('')}
              title="清除自訂文字"
              aria-label="清除"
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ifm-color-emphasis-600, #888)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                lineHeight: 1,
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={fireConfetti}
        style={{
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 'bold',
          color: '#fff',
          backgroundColor: '#ff4757',
          border: 'none',
          borderRadius: '50px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(255, 71, 87, 0.3)',
          transition: 'transform 0.1s ease, box-shadow 0.15s ease'
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 71, 87, 0.4)')}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 71, 87, 0.3)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {buttonText}
      </button>
    </div>
  );
}
