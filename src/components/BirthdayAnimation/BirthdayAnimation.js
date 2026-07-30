import React from 'react';
import confetti from 'canvas-confetti';

export default function BirthdayAnimation({ name = 'ikuka' }) {
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

  return (
    <div style={{
      textAlign: 'center',
      padding: '1.5rem 1rem',
      borderRadius: '16px',
      border: '1px solid var(--ifm-color-emphasis-200)',
      background: 'var(--ifm-card-background-color, var(--ifm-background-color))',
      color: 'var(--ifm-font-color-base)',
      margin: '1.5rem 0',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    }}>
      {/* 使用一般 div 代替 h2，避免觸發 Docusaurus 標題的全局邊框樣式 */}
      <div style={{
        fontSize: 'clamp(1.2rem, 4.5vw, 1.6rem)',
        fontWeight: 'bold',
        margin: '0 0 10px 0',
        lineHeight: '1.4',
        wordBreak: 'break-word'
      }}>
        🎂 祝 {name} 生日快樂！🎂
      </div>

      <p style={{
        fontSize: '1rem',
        marginBottom: '1.2rem',
        opacity: 0.85,
        lineHeight: '1.5'
      }}>
        祝福你事事順利充滿驚喜！
      </p>

      <button
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
          transition: 'transform 0.1s ease'
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🎉 放彩條慶祝！
      </button>
    </div>
  );
}