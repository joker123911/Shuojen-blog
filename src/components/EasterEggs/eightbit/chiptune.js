// 用 Web Audio 的方波即時合成紅白機風格的短音效，不需要任何音檔。
// 只會在訪客按完秘技時播放（瀏覽器允許由按鍵觸發的聲音），音量刻意壓低。

const C4 = 261.63;
const G4 = 392.0;
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;

/** 進入 8-bit：快速往上爬的大三和弦琶音 */
export const POWER_UP = [
  [G4, 0.055], [C5, 0.055], [E5, 0.055], [G5, 0.055], [C6, 0.055], [E6, 0.26],
];

/** 離開 8-bit：一路往下掉的 GAME OVER */
export const POWER_DOWN = [
  [G5, 0.11], [E5, 0.11], [C5, 0.11], [G4, 0.11], [null, 0.06], [C4, 0.38],
];

/**
 * @param {[number | null, number][]} notes [頻率 Hz（null 為休止）, 秒數]
 * @param {number} volume 0~1
 */
export function playChiptune(notes, volume = 0.05) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    let t = ctx.currentTime + 0.02;
    for (const [freq, dur] of notes) {
      if (freq) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);
        const env = ctx.createGain();
        env.gain.setValueAtTime(1, t);
        // 每個音尾端留一點空隙並快速收音，避免爆音、聽起來也更有顆粒感
        env.gain.setValueAtTime(1, t + dur * 0.85);
        env.gain.linearRampToValueAtTime(0, t + dur * 0.95);
        osc.connect(env);
        env.connect(master);
        osc.start(t);
        osc.stop(t + dur);
      }
      t += dur;
    }
    const totalMs = (t - ctx.currentTime) * 1000 + 300;
    setTimeout(() => ctx.close().catch(() => {}), totalMs);
  } catch {
    // 沒有聲音也不影響彩蛋本身
  }
}
