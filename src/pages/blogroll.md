---
title: 部落卷
description: 個人網頁名冊
---

import React, { useState, useMemo } from 'react';

export const BlogrollSearch = () => {
  const initialLinks = [
    { title: "13 的部落格", url: "http://www.yishantsai.com/" },
    { title: "All posts | 所有貼文 on ttheng's microblog. | 侃侃而隨想極短文。", url: "https://microblog.ttheng.com/" },
    { title: "Andy's Gamma", url: "https://blog.andy-hu.com/" },
    { title: "Aster", url: "https://gooseboop.com/" },
    { title: "A吉胖的部落格 on FatApple's blog", url: "https://fatapple0406.github.io/" },
    { title: "Bin'bin ㄟ跤跡", url: "https://trail.bearblog.dev/" },
    { title: "blog.dm4.tw", url: "https://blog.dm4.tw/" },
    { title: "Blog on Boring Game", url: "https://boringgameofficial.github.io/blog/" },
    { title: "Blog on Slownie", url: "https://blog.slownie.com/blog/" },
    { title: "Chang,Shih-Ting", url: "https://chang-shih-ting.com/" },
    { title: "CHS LI", url: "https://chs-li.com/" },
    { title: "Cytrogen 的个人博客", url: "https://cytrogen.icu/" },
    { title: "Daisy27.blog🌼", url: "https://daisy27.bearblog.dev/" },
    { title: "Eddie‘s Blog", url: "https://blog.gtisland.studio/" },
    { title: "Eo's Blog", url: "https://eoiiio.bearblog.dev/" },
    { title: "ERNE與他的老窮齋", url: "https://erne.bearblog.dev/" },
    { title: "Everen个人小站 Blog", url: "https://your-docusaurus-site.example.com/blog" },
    { title: "Feed Me, Haruo", url: "https://haruowang.vercel.app/" },
    { title: "Gou's Blog Blog", url: "https://gou935.com/blog" },
    { title: "HachiZen Blog", url: "https://hachizen-blog.vercel.app/blog" },
    { title: "Harry Chung", url: "https://harrychung.com/" },
    { title: "Hellen Murmur", url: "https://hellenmurmur.bearblog.dev/" },
    { title: "Hong-Sheng Huang's Blog", url: "https://hshuang.blog/" },
    { title: "I'm j2hongming", url: "https://j2hongming.github.io/" },
    { title: "It's小白不是小白 – It's小白不是小白", url: "https://itsxiaobai.github.io/" },
    { title: "KNOX ▲ LIVE WILD", url: "https://knoxyang.blogspot.com/" },
    { title: "Lorrain's SITE", url: "https://inkwell-y.blog/" },
    { title: "Matsuko Blog", url: "https://matsukozui.github.io/matsuko-blog/blog" },
    { title: "Meowjay的小窝", url: "https://meowjay.cc/" },
    { title: "Moongazer.net / Blog", url: "https://blog.moongazer.net/" },
    { title: "Neo's Blog", url: "https://neoisone.bearblog.dev/" },
    { title: "NovaDNG Studio", url: "https://novadng.studio/" },
    { title: "O'Oh 麵麵 – Blog", url: "https://oohmemen.com/blog/" },
    { title: "Opass: A Life Well Lived Blog", url: "https://www.opasschang.com/blog" },
    { title: "Pan's Random Note", url: "https://meihsinpan.substack.com/" },
    { title: "Parker Chang's Web", url: "https://www.parkerchang.life/" },
    { title: "Posts on chihyang.cc >_", url: "https://chihyang.cc/posts/" },
    { title: "Poya.School Blog", url: "https://poya.school/blog" },
    { title: "Pront Log", url: "https://prontlin.com/" },
    { title: "PuuBlog", url: "https://blog.mounpainter.com/" },
    { title: "RayrrrrrR", url: "https://rayrrrrrrr.bearblog.dev/" },
    { title: "RayShine 的部落格", url: "https://www.rayshineart.com/zh/blog" },
    { title: "Ricky 的生活記事本", url: "https://rickyblog.bearblog.dev/" },
    { title: "Shen Jing Blog", url: "https://shen-jing.github.io/blog" },
    { title: "Skychoapth.", url: "https://skyhong.tw/" },
    { title: "Stories on Jabee's Blog", url: "https://jabee.net/stories/" },
    { title: "StoryinSpirit - 遊樂靈的和平發源地", url: "https://storyinspirit.com/blog" },
    { title: "Those aren't written down are meant to be forgotten", url: "https://blog.wei-lee.me/" },
    { title: "Tobi Asai's blog", url: "https://asai.bearblog.dev/" },
    { title: "tux24 的個人網站", url: "https://tux24.xyz/" },
    { title: "TzuChun.Blog 全站 RSS Feed", url: "https://tzuchun.com/" },
    { title: "uima's site", url: "https://uimataso.com/" },
    { title: "WANcatServer", url: "https://wancat.cc/" },
    { title: "Ya-Xuan", url: "https://yaxuanhe.me/" },
    { title: "YoZ Blog", url: "https://www.yozblog.com/" },
    { title: "Yu Blog Blog", url: "https://chienyuc.blog/blog" },
    { title: "yunColorBlog.com", url: "https://yuncolorblog.com/" },
    { title: "| 首頁 | on Cheuk 的部落格 :p", url: "https://cheuk.blog/home/" },
    { title: "【The Last Child】", url: "https://zuzuthink.blogspot.com/" },
    { title: "一起和 Yoon 聊心事", url: "https://yoon.club/" },
    { title: "九把刀官方網站", url: "https://giddens.idv.tw/" },
    { title: "伊果的沒人看筆記本", url: "https://igouist.github.io/" },
    { title: "侃侃而談。", url: "https://blogg.ttheng.com/" },
    { title: "只贏", url: "https://onlywin.substack.com/" },
    { title: "安娜的自我探索與成長筆記", url: "https://blog.anna-yufeng.com/" },
    { title: "家醫科 陳文學醫師", url: "https://fm-chen.tw/" },
    { title: "小空間", url: "https://mia.piccina.casa/" },
    { title: "小米紀錄簿。", url: "https://hjhmi89.bearblog.dev/" },
    { title: "小麥的第二世界 Blog", url: "https://blog2.worldofwheat.cc/blog" },
    { title: "幽星隨想", url: "https://yuusei.bearblog.dev/" },
    { title: "愷開的部落格", url: "https://blog.kalan.dev/" },
    { title: "我的部落格", url: "https://e89295.com/blog/" },
    { title: "更新 on 亖亖的部落格", url: "https://blog.nufneb.com/log/" },
    { title: "樹懶得小天地", url: "https://sloth-nook.bearblog.dev/" },
    { title: "歡迎來到我的部落格 on PuzeLee", url: "https://puzelee.cc/" },
    { title: "水壺翔", url: "https://water-bottle-fly.bearblog.dev/" },
    { title: "派的心情抒發室", url: "https://pie-ye.org/" },
    { title: "皆米的記事本", url: "https://jai33snotes.com/" },
    { title: "綠橄欖筆記", url: "https://oliveassignment.xyz/" },
    { title: "羊大的部落格", url: "http://blog.lamb.tw/" },
    { title: "范剛哲的部落格", url: "https://fgzblog.com/zh-tw/" },
    { title: "蘇果的部落格", url: "https://soogoino.com/" },
    { title: "蟬噪林愈靜", url: "https://blog.linyuchin.com/" },
    { title: "西瓜生長日記 🍉", url: "https://watermelon.bearblog.dev/" },
    { title: "貼文的家o(〃＾▽＾〃)o on eeseo", url: "https://eeseoliz.net/posts/" },
    { title: "鍵盤美食家週記", url: "https://roakuo.com/" },
    { title: "鏡想的頭腦反射", url: "https://johnworker.bearblog.dev/" },
    { title: "關於我 on 亖亖的部落格", url: "https://blog.nufneb.com/about/" },
    { title: "阿標 ilovemovie", url: "https://ilovemovie.pika.page/" },
    { title: "陳建中｜Tân Kiàn-tiong", url: "https://www.kiantiong.com/" },
    { title: "雪榕 From Taiwan", url: "https://srfromtaiwan.bearblog.dev/" },
    { title: "雷歐 Revol.C 的部落格", url: "https://revolc.blog/" },
    { title: "首頁 on AngeCI’s Blog", url: "https://angeci.github.io/blog/zh/" },
    { title: "１１０號道路", url: "https://route110.blog/" },
    { title: "Derek Sivers", url: "https://sivers.org/" },
    { title: "Kev Quirk", url: "https://kevquirk.com/" },
    { title: "Leo's Blog", url: "https://leo3391.github.io/blog/" },
    { title: "Alex Hsu 徐小翔", url: "https://alexhsu.com/" },
    { title: "Alice Hsu's Blog", url: "http://alicehsu.blog/zh-tw/" },
    { title: "BlogBlog.Club 部落部落俱樂部 Blog", url: "https://blogblog.club/blog" },
    { title: "howmay_ Lettering & Logotype", url: "https://howmaywang.com/" },
    { title: "Hsun's Blog", url: "https://hsun.bearblog.dev/" },
    { title: "HwH's Blog", url: "https://hwhblog.bearblog.dev/" },
    { title: "I'm Marcus Blog", url: "https://www.immarcus.com/blog" },
    { title: "ikuka's room", url: "https://ikukaroom.com/" },
    { title: "Jaron Writes. Blog", url: "https://www.jaron.tw/blog/" },
    { title: "KevinOwO", url: "https://kevinowo.com/" },
    { title: "Leaftechblog", url: "https://www.leaftechblog.cloudns.biz/" },
    { title: "LQ7的創作與想像", url: "https://lq7.tw/" },
    { title: "NeEd", url: "https://need.noefly.cc/" },
    { title: "Noa's Blog", url: "https://noa.bearblog.dev/" },
    { title: "paullai.com", url: "https://paullai.com/" },
    { title: "Shuyu Pixelart", url: "https://shuyulin1127.com/" },
    { title: "Tian-Yan's Blog", url: "https://tianyanfeng.blog/" },
    { title: "Timo's blog", url: "https://timoblog.com/" },
    { title: "Wen的生產力實驗室", url: "https://www.wen-lab.tw/" },
    { title: "wilsonchao.com", url: "https://wilsonchao.com/" },
    { title: "Wiwi.Blog Blog", url: "https://wiwi.blog/blog" },
    { title: "YangBear'Blog ᓚᘏᗢ", url: "https://yangbear.bearblog.dev/" },
    { title: "廢文小天地 RSS", url: "https://trashposts.com/" },
    { title: "是 Ray 不是 Array", url: "https://israynotarray.com/" },
    { title: "資工小廢物 - JN", url: "https://blog.giveanornot.com/" },
    { title: "那些沒人在乎的事", url: "https://travlog.wei-lee.me/" },
    { title: "銓chuan的生活手札", url: "https://www.chuan0418.com/" },
    { title: "陳依琳 YI-LIN CHEN", url: "https://im1010ioio.dev/" },
    { title: "Shuo-jen Blog", url: "https://shuojen.com/blog" },
    { title: "Shuo-jen Photography", url: "https://shuojen.com/photoblog" },
    { title: "August Blue Games Blog", url: "https://augustblue.games/zh/blog" },
    { title: "Code and Me", url: "https://blog.kyomind.tw/" },
    { title: "Duran 的技術冶煉廠", url: "https://dog0416.blogspot.com/" },
    { title: "Home on ClixTW's Blog", url: "https://clixtw.github.io/" },
    { title: "Ivon的部落格", url: "https://ivonblog.com/" },
    { title: "Linux on 范剛哲的部落格", url: "https://fgzblog.com/zh-tw/categories/linux/" },
    { title: "Sheracaolity", url: "https://sheracaolity.ghost.io/" },
    { title: "Zeroplex 生活隨筆", url: "https://blog.zeroplex.tw/" },
    { title: "土石流防災－陳振宇的公職記事", url: "https://cychen59.blogspot.com/" },
    { title: "毛哥EM資訊密技", url: "https://emtech.cc/" },
    { title: "綠角財經筆記", url: "http://greenhornfinancefootnote.blogspot.com/" },
    { title: "魚之魷魂 SquidSpirit", url: "https://squidspirit.com/" },
  ];
  const [search, setSearch] = useState('');
  
  const filteredLinks = useMemo(() => {
    return initialLinks.filter(link => 
      link.title.toLowerCase().includes(search.toLowerCase()) || 
      link.url.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div>
      <input
        type="text"
        placeholder="🔍 搜尋部落格名稱或網址..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid var(--ifm-color-emphasis-300)',
          backgroundColor: 'var(--ifm-background-color)',
          color: 'var(--ifm-font-color-base)',
          fontSize: '1rem',
          outline: 'none',
        }}
      />
      <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
        {filteredLinks.map((link, idx) => (
          <li key={idx} style={{ marginBottom: '6px' }}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
          </li>
        ))}
      </ul>
      {filteredLinks.length === 0 && (
        <p style={{ color: 'var(--ifm-color-danger)', marginTop: '10px' }}>找不到相符的部落格 😢</p>
      )}
    </div>
  );
};

# 部落卷 `/blogroll`

*最後更新：2026-05-11*

<img src="/img/blogroll_logo.png" style={{ borderRadius: '0' }} alt="logo" /> 
▲ 我的部落格徽章，歡迎取用

:::info
本頁面收錄我的 [RSS](/blog/2025/09/16/rss) 訂閱清單（隨機順序）。來源就是到處在各個網站連來連去，只要看到有趣的就加進來；讀著讀著，那些令人驚豔的文章總會讓我不知不覺記住作者，然後忍不住也寫一篇帶原文連結的文章來表達支持，對我來說，這就是部落格最純粹丶迷人之處吧。
:::

<BlogrollSearch />