"use strict";(self.webpackChunkmy_blog=self.webpackChunkmy_blog||[]).push([["34823"],{37176(e,i,t){t.r(i),t.d(i,{default:()=>o});var a=t(74848),r=t(96540),n=t(10898),l=t(516),s=t(95310);function o(){let{siteConfig:{baseUrl:e}}=(0,n.A)(),[i,t]=(0,r.useState)(""),o=" \u25BC\u30FB\u1D25\u30FB\u25BC \u6B61\u8FCE\u4F86\u5230 shuo-jen \u7684\u90E8\u843D\u683C \u25BC\u30FB\u1D25\u30FB\u25BC ";return(0,r.useEffect)(()=>{let e=0,i=setInterval(()=>{e<=o.length?(t(o.substring(0,e)),e++):clearInterval(i)},80);return()=>clearInterval(i)},[]),(0,a.jsxs)(l.A,{description:"Shuo-jen \u7684\u500B\u4EBA\u90E8\u843D\u683C",children:[(0,a.jsx)("style",{children:`
          .gallery-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 60px);
            width: 100%;
            padding: 40px 20px;
            box-sizing: border-box;
            overflow: hidden;
          }
          
          .gallery-sidebar {
            width: 100%;
            max-width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin-bottom: 30px;
            box-sizing: border-box;
          }
          
          .gallery-title {
            font-size: clamp(1.2rem, 2.5vw, 1.6rem);
            font-weight: 500;
            font-family: "jfOpenHuninn", var(--ifm-font-family-base); 
            line-height: 1.5;
            color: var(--ifm-font-color-base);
            margin: 0;
            white-space: nowrap; 
            display: inline-block;
          }

          .typewriter-cursor {
            display: inline-block;
            width: 8px;
            height: 1.1em;
            background-color: var(--ifm-font-color-base);
            vertical-align: text-bottom;
            margin-left: 4px;
            animation: blink 1s step-end infinite;
          }

          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }

          .gallery-content {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            flex: 1;
            max-height: 65vh;
          }

          .gallery-image {
            max-width: 85vw;
            max-height: 55vh;
            width: auto;
            height: auto;
            object-fit: contain;
            image-rendering: pixelated;
            image-rendering: crisp-edges;
            transform: scale(1.3);
            transform-origin: center center;
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
          }

          .gallery-image:hover {
            transform: scale(1.38);
          }

          @media (max-width: 768px) {
            .gallery-wrapper {
              padding: 20px 8px;
              min-height: calc(100vh - 60px);
            }
            .gallery-sidebar {
              margin-bottom: 20px;
              padding: 0 4px;
            }
            .gallery-title {
              font-size: clamp(0.75rem, 4.2vw, 1.2rem);
              white-space: nowrap;
            }
            .gallery-image {
              max-width: 90vw;
              max-height: 45vh;
              transform: scale(1.1);
            }
            .gallery-image:hover {
              transform: scale(1.15);
            }
          }
        `}),(0,a.jsxs)("main",{className:"gallery-wrapper",children:[(0,a.jsx)("div",{className:"gallery-sidebar",children:(0,a.jsxs)("div",{className:"gallery-title",children:[i,(0,a.jsx)("span",{className:"typewriter-cursor"})]})}),(0,a.jsx)("div",{className:"gallery-content",children:(0,a.jsx)(s.A,{to:"/about",children:(0,a.jsx)("img",{src:e+"img/knight_5x.gif",alt:"Knight GIF",className:"gallery-image",onDragStart:e=>e.preventDefault()})})})]})]})}}}]);