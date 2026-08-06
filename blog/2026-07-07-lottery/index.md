---
title: '樂透模擬器'
tags: ['fun', 'game']
date: 2026-07-07
rss_date: '2026-07-07T17:44:43+08:00'
---

import { useState, useRef } from 'react';

export const LottoSimulatorInline = () => {
  // 參考 image_67b268.png 的真實數據更新：包含單注獎金
  const PRIZES = {
    '頭獎': { amt: 490957298, desc: '中6碼' },
    '貳獎': { amt: 1260935, desc: '中5碼+特別號' },
    '參獎': { amt: 61724, desc: '中5碼' },
    '肆獎': { amt: 14964, desc: '中4碼+特別號' },
    '伍獎': { amt: 2000, desc: '中4碼' },
    '陸獎': { amt: 1000, desc: '中3碼+特別號' },
    '柒獎': { amt: 400, desc: '中2碼+特別號' },
    '普獎': { amt: 400, desc: '中3碼' }
  };

  const [budget, setBudget] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isJackpot, setIsJackpot] = useState(false);
  
  const stateRef = useRef({
    count: 0,
    totalSpent: 0,
    totalWon: 0,
    totalTax: 0,
    stats: { '頭獎': 0, '貳獎': 0, '參獎': 0, '肆獎': 0, '伍獎': 0, '陸獎': 0, '柒獎': 0, '普獎': 0 },
    winningMain: new Set(),
    specialNumber: 0
  });

  const [displayState, setDisplayState] = useState(null);
  const animationRef = useRef(null);

  function sample(min, max, count) {
    let pool = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    let res = [];
    for (let i = 0; i < count; i++) {
      let idx = Math.floor(Math.random() * pool.length);
      res.push(pool.splice(idx, 1)[0]);
    }
    return res;
  }

  const initGame = () => {
    const draw = sample(1, 49, 7);
    stateRef.current = {
      count: 0,
      totalSpent: 0,
      totalWon: 0,
      totalTax: 0,
      stats: { '頭獎': 0, '貳獎': 0, '參獎': 0, '肆獎': 0, '伍獎': 0, '陸獎': 0, '柒獎': 0, '普獎': 0 },
      winningMain: new Set(draw.slice(0, 6)),
      specialNumber: draw[6]
    };
    setIsJackpot(false);
  };

  const startLoop = (currentBudget) => {
    const infiniteMode = currentBudget <= 0;
    // 嚴格依據 50 元一注進行無條件捨去計算最大可買張數
    const maxTickets = infiniteMode ? Infinity : Math.floor(currentBudget / 50);
    const chunk = 25000;
    let jackpotHit = false;

    const loop = () => {
      const data = stateRef.current;

      for (let i = 0; i < chunk; i++) {
        if (data.count >= maxTickets) {
          setDisplayState({ ...data, winningList: Array.from(data.winningMain).sort((a, b) => a - b) });
          setIsRunning(false);
          setTimeout(() => {
            alert('模擬結束：預算已用盡，未能抱回頭獎。');
          }, 50);
          return;
        }

        data.count++;
        data.totalSpent += 50;

        const myDraw = sample(1, 49, 6);
        let matchedCount = 0;
        let hasSpecial = false;

        for (let num of myDraw) {
          if (data.winningMain.has(num)) matchedCount++;
          if (num === data.specialNumber) hasSpecial = true;
        }

        if (matchedCount === 6) {
          data.stats['頭獎']++;
          data.totalWon += PRIZES['頭獎'].amt;
          data.totalTax += Math.floor(PRIZES['頭獎'].amt * 0.204);
          jackpotHit = true;
          break;
        } else if (matchedCount === 5) {
          if (hasSpecial) { 
            data.stats['貳獎']++; 
            data.totalWon += PRIZES['貳獎'].amt; 
            data.totalTax += Math.floor(PRIZES['貳獎'].amt * 0.204);
          }
          else { 
            data.stats['參獎']++; 
            data.totalWon += PRIZES['參獎'].amt; 
            data.totalTax += Math.floor(PRIZES['參獎'].amt * 0.204);
          }
        } else if (matchedCount === 4) {
          if (hasSpecial) { 
            data.stats['肆獎']++; 
            data.totalWon += PRIZES['肆獎'].amt; 
            data.totalTax += Math.floor(PRIZES['肆獎'].amt * 0.204);
          }
          else { data.stats['伍獎']++; data.totalWon += PRIZES['伍獎'].amt; }
        } else if (matchedCount === 3) {
          if (hasSpecial) { data.stats['陸獎']++; data.totalWon += PRIZES['陸獎'].amt; }
          else { data.stats['普獎']++; data.totalWon += PRIZES['普獎'].amt; }
        } else if (matchedCount === 2 && hasSpecial) {
          data.stats['柒獎']++;
          data.totalWon += PRIZES['柒獎'].amt;
        }
      }

      setDisplayState({ ...data, winningList: Array.from(data.winningMain).sort((a, b) => a - b) });

      if (jackpotHit) {
        setIsRunning(false);
        setIsJackpot(true);
        setTimeout(() => {
          alert(`🎉 🎉 🎉 恭喜中頭獎！！！ 🎉 🎉 🎉\n共花了 ${data.totalSpent.toLocaleString()} 元！`);
        }, 50);
      } else {
        animationRef.current = requestAnimationFrame(loop);
      }
    };

    animationRef.current = requestAnimationFrame(loop);
  };

  const buyFullMeal = () => {
    cancelAnimationFrame(animationRef.current);
    setIsRunning(false);

    // 若尚未初始化開獎號碼，先隨機開一期
    let currentWinningMain, currentSpecialNumber;
    if (stateRef.current.winningMain.size === 0) {
      const draw = sample(1, 49, 7);
      currentWinningMain = new Set(draw.slice(0, 6));
      currentSpecialNumber = draw[6];
    } else {
      currentWinningMain = stateRef.current.winningMain;
      currentSpecialNumber = stateRef.current.specialNumber;
    }

    // 大樂透 49 選 6 全餐（13,983,816注）必中的各獎項精確注數
    const fullMealStats = {
      '頭獎': 1,
      '貳獎': 6,
      '參獎': 252,
      '肆獎': 630,
      '伍獎': 12915,
      '陸獎': 17220,
      '柒獎': 172200,
      '普獎': 229600
    };

    let totalWon = 0;
    let totalTax = 0;

    Object.keys(PRIZES).forEach(k => {
      const cnt = fullMealStats[k];
      const amt = PRIZES[k].amt;
      totalWon += cnt * amt;
      if (amt > 5000) {
        totalTax += cnt * Math.floor(amt * 0.204);
      }
    });

    const totalSpent = 13983816 * 50;

    stateRef.current = {
      count: 13983816,
      totalSpent: totalSpent,
      totalWon: totalWon,
      totalTax: totalTax,
      stats: fullMealStats,
      winningMain: currentWinningMain,
      specialNumber: currentSpecialNumber
    };

    setDisplayState({ ...stateRef.current, winningList: Array.from(currentWinningMain).sort((a, b) => a - b) });
    setIsJackpot(true);

    setTimeout(() => {
      alert(`月光，送給你`);
    }, 50);
  };

  const toggleSimulation = () => {
    if (isRunning) {
      cancelAnimationFrame(animationRef.current);
      setIsRunning(false);
    } else {
      const numericBudget = parseInt(budget) || 0;
      // 限制不足 50 元的單注低預算輸入
      if (numericBudget > 0 && numericBudget < 50) {
        alert(`❌ 餘額不足：大樂透每注為 50 元，您的預算 (${numericBudget} 元) 不足購買 1 注！`);
        return;
      }

      const maxTickets = numericBudget <= 0 ? Infinity : Math.floor(numericBudget / 50);
      if (stateRef.current.count === 0 || isJackpot || stateRef.current.count >= maxTickets) {
        initGame();
        setDisplayState(null);
      }
      setIsRunning(true);
      startLoop(numericBudget);
    }
  };

  const resetSimulation = () => {
    cancelAnimationFrame(animationRef.current);
    setIsRunning(false);
    initGame();
    setDisplayState(null);
    setBudget(0);
  };

  const net = displayState ? displayState.totalWon - displayState.totalTax - displayState.totalSpent : 0;
  // 正確的 ROI 投資報酬率公式：(淨損益 / 總投入成本) * 100%
  const roi = displayState && displayState.totalSpent > 0 
    ? ((net / displayState.totalSpent) * 100).toFixed(2) 
    : '0.00';

  return (
    <div style={{ 
      fontFamily: 'var(--ifm-font-family-base)', 
      backgroundColor: 'var(--ifm-card-background-color, var(--ifm-background-surface-color))', 
      border: '1px solid var(--ifm-border-color)', 
      borderRadius: 'var(--ifm-card-border-radius, 8px)', 
      padding: '15px', 
      maxWidth: '100%', 
      margin: '20px auto', 
      color: 'var(--ifm-font-color-base)',
      boxSizing: 'border-box'
    }}>
      <h3 style={{ color: 'var(--ifm-color-danger)', textAlign: 'center', marginTop: 0 }}>大樂透開獎模擬器</h3>
      
      <div style={{ 
        backgroundColor: 'var(--ifm-alert-background-color, rgba(255, 186, 0, 0.1))', 
        borderLeft: '4px solid var(--ifm-color-warning)', 
        padding: '12px', 
        marginBottom: '15px', 
        fontSize: '0.9em', 
        borderRadius: '0 4px 4px 0',
        color: 'var(--ifm-font-color-base)'
      }}>
        <strong>【本期開獎基準獎金】</strong><br/>
        • 頭獎：4.90 億元 | 貳獎：126 萬元 | 參獎：6.1 萬元 <br/>
        • 肆獎：1.4 萬元 | 伍獎：2,000 元 | 陸/柒/普獎：400~1,000 元
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>請輸入模擬預算（元）：</label>
        <input 
          type="number" 
          value={budget} 
          onChange={(e) => setBudget(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
          disabled={isRunning}
          style={{ 
            width: '100%', 
            padding: '8px', 
            backgroundColor: 'var(--ifm-background-color)',
            color: 'var(--ifm-font-color-base)',
            border: '1px solid var(--ifm-border-color)', 
            borderRadius: '4px', 
            boxSizing: 'border-box' 
          }}
        />
        <small style={{ display: 'block', marginTop: '4px', color: 'var(--ifm-color-emphasis-600)' }}>* 每注金額為 50 元。輸入 0 代表無限模式，直到中頭獎為止。</small>
      </div>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: '10px', 
        marginBottom: '20px' 
      }}>
        <button 
          onClick={toggleSimulation} 
          style={{ 
            backgroundColor: isRunning ? 'var(--ifm-color-danger)' : isJackpot ? 'var(--ifm-color-success)' : 'var(--ifm-color-primary)', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 16px', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            borderRadius: '4px', 
            cursor: 'pointer',
            flex: '1 1 auto',
            maxWidth: '150px',
            textAlign: 'center'
          }}
        >
          {isRunning ? '暫停模擬' : isJackpot ? '重新開始模擬' : '開始模擬'}
        </button>
        <button 
          onClick={buyFullMeal} 
          disabled={isJackpot}
          style={{ 
            backgroundColor: isJackpot ? 'var(--ifm-color-emphasis-400)' : '#e0a800', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 16px', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            borderRadius: '4px', 
            cursor: isJackpot ? 'default' : 'pointer',
            flex: '1 1 auto',
            maxWidth: '150px',
            textAlign: 'center'
          }}
        >
          幫我打一張全餐
        </button>
        <button 
          onClick={resetSimulation} 
          style={{ 
            backgroundColor: 'var(--ifm-color-emphasis-600)', 
            color: '#fff', 
            border: 'none', 
            padding: '10px 16px', 
            fontSize: '14px', 
            fontWeight: 'bold', 
            borderRadius: '4px', 
            cursor: 'pointer',
            flex: '1 1 auto',
            maxWidth: '100px',
            textAlign: 'center'
          }}
        >
          重設
        </button>
      </div>

      {displayState && (
        <div style={{ borderTop: '2px dashed var(--ifm-border-color)', paddingTop: '15px' }}>
          <p style={{ margin: '5px 0', fontSize: '1em', lineHeight: '1.4' }}>
            <b>本期模擬獎號：</b>
            <span style={{ color: 'var(--ifm-color-danger)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{displayState.winningList.join(', ')}</span> 
            <span style={{ margin: '0 4px', color: 'var(--ifm-border-color)' }}>|</span>特別號：
            <span style={{ color: 'var(--ifm-color-warning)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>[{displayState.specialNumber}]</span>
          </p>

          <h4 style={{ margin: '20px 0 10px 0' }}>📋 投資損益摘要表</h4>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', marginBottom: '20px' }}>
            <table style={{ width: '100%', minWidth: '340px', borderCollapse: 'collapse', fontSize: '0.95em' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--ifm-color-emphasis-200)', borderBottom: '2px solid var(--ifm-border-color)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>會計項目</th>
                  <th style={{ padding: '10px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>數值 / 金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid var(--ifm-border-color)' }}>實際成功投注注數</td>
                  <td style={{ padding: '10px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>{displayState.count.toLocaleString()} 注</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid var(--ifm-border-color)' }}>總投注成本 (支出)</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--ifm-color-danger)', fontWeight: 'bold', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>
                    -{displayState.totalSpent.toLocaleString()} 元
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid var(--ifm-border-color)' }}>中獎總彩金 (收入)</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--ifm-color-success)', fontWeight: 'bold', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>
                    +{displayState.totalWon.toLocaleString()} 元
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid var(--ifm-border-color)' }}>中獎所得稅金 (支出)</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: 'var(--ifm-color-danger)', fontWeight: 'bold', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>
                    -{displayState.totalTax.toLocaleString()} 元
                  </td>
                </tr>
                <tr style={{ backgroundColor: 'var(--ifm-color-emphasis-100)', fontWeight: 'bold' }}>
                  <td style={{ padding: '10px', border: '1px solid var(--ifm-border-color)' }}>淨損益 (Net Profit)</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: net > 0 ? 'var(--ifm-color-success)' : net < 0 ? 'var(--ifm-color-danger)' : 'inherit', border: '1px solid var(--ifm-border-color)', fontSize: '1.05em', whiteSpace: 'nowrap' }}>
                    {net > 0 ? '+' : ''}{net.toLocaleString()} 元
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid var(--ifm-border-color)' }}>投資報酬率 (ROI)</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', border: '1px solid var(--ifm-border-color)', color: parseFloat(roi) > 0 ? 'var(--ifm-color-success)' : parseFloat(roi) < 0 ? 'var(--ifm-color-danger)' : 'inherit', whiteSpace: 'nowrap' }}>
                    {roi} %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h4 style={{ margin: '15px 0 10px 0' }}>📊 各獎項詳細明細表</h4>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '580px', borderCollapse: 'collapse', fontSize: '0.9em' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--ifm-color-emphasis-200)', borderBottom: '2px solid var(--ifm-border-color)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>獎項</th>
                  <th style={{ padding: '8px', textAlign: 'left', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>中獎條件</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>單注獎金</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>您的中獎注數</th>
                  <th style={{ padding: '8px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>小計彩金</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(PRIZES).map(k => {
                  const myCount = displayState.stats[k];
                  const subtotal = myCount * PRIZES[k].amt;
                  return (
                    <tr key={k} style={{ 
                      backgroundColor: myCount > 0 ? 'var(--ifm-alert-background-color, rgba(0,0,0,0.03))' : 'transparent',
                      fontWeight: myCount > 0 ? 'bold' : 'normal'
                    }}>
                      <td style={{ padding: '8px', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>{k}</td>
                      <td style={{ padding: '8px', border: '1px solid var(--ifm-border-color)', color: 'var(--ifm-color-emphasis-600)', whiteSpace: 'nowrap' }}>{PRIZES[k].desc}</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>${PRIZES[k].amt.toLocaleString()}</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', color: myCount > 0 ? 'var(--ifm-color-primary)' : 'inherit', whiteSpace: 'nowrap' }}>
                        {myCount.toLocaleString()} 次
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid var(--ifm-border-color)', whiteSpace: 'nowrap' }}>${subtotal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


前幾天峻寶寶跟我提到一個同事都會固定買樂透。讓我想玩玩大樂透開獎模擬器！可以直接在下方輸入期望投入的預算，或直接輸入 0 開啟無限模式（直到中頭獎），體驗一下富豪的感覺。

其實一直買直到中頭獎又剛好獨得的話，真的有機會賺錢的，可惜我沒有那麼多現金。想學《與龍共舞》的大陸雞買一張全餐也是可以，雖然穩賠，但是很帥。（可以請省港旗兵用打字機幫忙打一張就好）

:::info
本模擬器獎金參考[(第 115000067 期大樂透)](https://lotto.ctbcbank.com/result_all.htm#02), 並假設獎項皆為玩家獨得。單注中獎金額超過 5,000 元者，已自動扣除 20.4% 稅金（20% 扣繳稅額 + 0.4% 印花稅）。
:::

<LottoSimulatorInline />