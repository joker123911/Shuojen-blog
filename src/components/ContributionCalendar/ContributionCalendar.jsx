import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import contributionData from '@site/src/data/contribution-data.json';

export default function ContributionCalendar() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  // --- 懸浮視窗 (Tooltip) 的狀態管理 ---
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, day: null });
  const hideTimeout = useRef(null);
  const scrollRef = useRef(null);

  // 初始化時自動捲動到最右邊（最新日期）
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const handleMouseEnter = (e, day) => {
    if (!day.posts || day.posts.length === 0) return;
    if (hideTimeout.current) clearTimeout(hideTimeout.current);

    const rect = e.target.getBoundingClientRect();
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      day: day
    });
  };

  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setTooltip(p => ({ ...p, show: false }));
    }, 250);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  };

  const handleTooltipMouseLeave = () => {
    setTooltip(p => ({ ...p, show: false }));
  };

  // --- 統計數據 ---
  const stats = useMemo(() => {
    const data = contributionData || {};
    const dates = Object.keys(data).sort();

    const totalPosts = dates.reduce((sum, date) => sum + (data[date]?.length || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(today.getDate() - 364);

    const yearPosts = dates.reduce((sum, date) => {
      const d = new Date(date);
      if (d >= oneYearAgo && d <= today) return sum + (data[date]?.length || 0);
      return sum;
    }, 0);

    let dailyStreak = 0;
    let tempDate = new Date(today);
    const todayStr = new Date(tempDate.getTime() - tempDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    if (!data[todayStr] || data[todayStr].length === 0) {
      tempDate.setDate(tempDate.getDate() - 1);
    }
    while (true) {
      const checkDateStr = new Date(tempDate.getTime() - tempDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      if (data[checkDateStr] && data[checkDateStr].length > 0) {
        dailyStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalPosts, yearPosts, dailyStreak };
  }, []);

  // --- 日曆網格計算（修正：從今天往前推一年，最新在右邊）---
  const { weeksArray, emptyColor, colorLevels, monthLabels } = useMemo(() => {
    const data = contributionData || {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 結尾：本週的週六（確保最新格子可見）
    const endDow = today.getDay(); // 0=日, 6=六
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - endDow));

    // 開頭：endOfWeek 往前推一年後，再往前對齊到週日
    const startOfRange = new Date(endOfWeek);
    startOfRange.setFullYear(startOfRange.getFullYear() - 1);
    startOfRange.setDate(startOfRange.getDate() + 1);
    const startDow = startOfRange.getDay();
    if (startDow !== 0) {
      startOfRange.setDate(startOfRange.getDate() - startDow);
    }

    const empty = isDark ? '#1e1e1e' : '#ebedf0';
    const levels = isDark
      ? ['#0e4429', '#006d32', '#26a641', '#39d353']
      : ['#9be9a8', '#40c463', '#30a14e', '#216e39'];

    const weeksList = [];
    const mLabels = [];
    let lastMonth = -1;
    const tempDate = new Date(startOfRange);
    let weekIndex = 0;

    while (tempDate <= endOfWeek) {
      const week = [];
      let weekStartMonth = -1;

      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(tempDate.getTime() - tempDate.getTimezoneOffset() * 60000);
        const dateStr = dateObj.toISOString().split('T')[0];
        if (d === 0) weekStartMonth = dateObj.getMonth();

        const isFuture = tempDate > today;
        const posts = (!isFuture && data[dateStr]) ? data[dateStr] : [];
        const count = posts.length;

        let color = empty;
        if (!isFuture) {
          if (count === 1) color = levels[0];
          else if (count === 2) color = levels[1];
          else if (count === 3) color = levels[2];
          else if (count >= 4) color = levels[3];
        } else {
          color = 'transparent'; // 未來的格子設為透明
        }

        const displayDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        week.push({ date: dateStr, displayDate, posts, count, color, isFuture });
        tempDate.setDate(tempDate.getDate() + 1);
      }

      weeksList.push(week);

      if (weekStartMonth !== lastMonth) {
        if (mLabels.length === 0 || weekIndex - mLabels[mLabels.length - 1].index > 2) {
          mLabels.push({ index: weekIndex, label: `${weekStartMonth + 1}月` });
          lastMonth = weekStartMonth;
        }
      }
      weekIndex++;
    }

    return { weeksArray: weeksList, emptyColor: empty, colorLevels: levels, monthLabels: mLabels };
  }, [isDark]);

  return (
    <div style={{
      padding: '20px',
      background: 'var(--ifm-background-surface-color)',
      borderRadius: '12px',
      border: '1px solid var(--ifm-color-emphasis-200)',
      fontFamily: 'var(--ifm-font-family-base)',
      margin: '20px 0',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      position: 'relative'
    }}>

      {/* 上方數據統計卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        {[
          { label: '過去一年文章', value: stats.yearPosts },
          { label: '累積所有文章', value: stats.totalPosts },
          { label: '天 連續發文', value: stats.dailyStreak }
        ].map((stat, idx) => (
          <div key={idx} style={{
            background: 'var(--ifm-background-color)', padding: '16px 12px', borderRadius: '8px',
            textAlign: 'center', border: '1px solid var(--ifm-color-emphasis-200)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--ifm-color-primary)', lineHeight: '1.2' }}>{stat.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', marginTop: '4px', fontWeight: '500' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 日曆網格區域（加上 ref 讓 useEffect 能 scroll 到最右）*/}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          paddingBottom: '10px',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        {/* 左側星期座標 */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '3px',
          marginTop: '20px', marginRight: '8px', paddingTop: '2px',
          flexShrink: 0
        }}>
          {['', '一', '', '三', '', '五', ''].map((dayStr, i) => (
            <div key={i} style={{
              height: '12px', width: '15px', fontSize: '10px',
              lineHeight: '12px', color: 'var(--ifm-color-emphasis-500)', textAlign: 'right'
            }}>
              {dayStr}
            </div>
          ))}
        </div>

        {/* 右側日曆格子與月份標籤 */}
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* 月份標籤 */}
          <div style={{ height: '20px', position: 'relative', width: `${weeksArray.length * 15}px` }}>
            {monthLabels.map((m, i) => (
              <span key={i} style={{
                position: 'absolute',
                left: `${m.index * 15}px`,
                fontSize: '11px',
                color: 'var(--ifm-color-emphasis-500)'
              }}>
                {m.label}
              </span>
            ))}
          </div>

          {/* 格子本體 */}
          <div style={{ display: 'flex', gap: '3px' }}>
            {weeksArray.map((week, wIdx) => (
              <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {week.map((day, dIdx) => (
                  <div
                    key={dIdx}
                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      width: '12px', height: '12px',
                      backgroundColor: day.color,
                      borderRadius: '2px',
                      cursor: day.count > 0 ? 'pointer' : 'default',
                      boxShadow: day.count > 0 ? 'inset 0 0 0 1px rgba(27,31,35,0.06)' : 'none',
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部圖例 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--ifm-color-emphasis-600)', marginTop: '15px', justifyContent: 'flex-end' }}>
        <span style={{ marginRight: '4px' }}>少</span>
        <div style={{ width: '12px', height: '12px', backgroundColor: emptyColor, borderRadius: '2px' }} />
        {colorLevels.map((color, idx) => (
          <div key={idx} style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }} />
        ))}
        <span style={{ marginLeft: '4px' }}>多</span>
      </div>

      {/* Tooltip */}
      {tooltip.show && tooltip.day && (
        <div
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
            background: 'var(--ifm-background-color)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: '6px',
            padding: '12px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            minWidth: '220px',
            maxWidth: '300px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--ifm-color-emphasis-500)', marginBottom: '8px' }}>
            {tooltip.day.displayDate}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tooltip.day.posts.map((post, i) => (
              <a
                key={i}
                href={post.url}
                style={{
                  fontSize: '14px',
                  color: 'var(--ifm-color-primary)',
                  textDecoration: 'none',
                  lineHeight: '1.4',
                  display: 'block',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
                {post.title}
              </a>
            ))}
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '6px 6px 0 6px',
            borderStyle: 'solid',
            borderColor: 'var(--ifm-background-color) transparent transparent transparent',
            filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.05))'
          }} />
        </div>
      )}
    </div>
  );
}