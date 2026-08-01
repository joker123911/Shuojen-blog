import React, { useState, useEffect } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home() {
  const { siteConfig: { baseUrl } } = useDocusaurusContext();
  
  // 打字機動畫 State
  const [typedTitle, setTypedTitle] = useState('');
  const fullTitle = " ▼・ᴥ・▼ 歡迎來到 shuo-jen 的部落格 ▼・ᴥ・▼ ";

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i <= fullTitle.length) {
        setTypedTitle(fullTitle.substring(0, i));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 80);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <Layout description="Shuo-jen 的個人部落格">
      <style>
        {`
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
        `}
      </style>

      <main className="gallery-wrapper">
        <div className="gallery-sidebar">
          <div className="gallery-title">
            {typedTitle}
            <span className="typewriter-cursor"></span>
          </div>
        </div>

        <div className="gallery-content">
          <Link to="/about">
            <img 
              src={baseUrl + 'img/knight_5x.gif'}
              alt="Knight GIF"
              className="gallery-image"
              onDragStart={(e) => e.preventDefault()}
            />
          </Link>
        </div>
      </main>
    </Layout>
  );
}