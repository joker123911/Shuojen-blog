const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. 設定只掃描 blog 資料夾
const targetDirectory = path.join(__dirname, '../blog');

// 支援的舊圖片格式
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png'];

// 遞迴取得所有檔案
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

async function optimizeImages() {
  console.log('🖼️ 開始執行圖片最佳化處理...');
  
  const allFiles = getAllFiles(targetDirectory);
  const imageFiles = [];
  const markdownFiles = [];

  // 1. 分類檔案 (圖片 vs Markdown)
  allFiles.forEach(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    if (SUPPORTED_EXTS.includes(ext)) {
      imageFiles.push(filePath);
    } else if (ext === '.md' || ext === '.mdx') {
      markdownFiles.push(filePath);
    }
  });

  let optimizedCount = 0;

  // 2. 處理圖片轉檔與壓縮
  for (const imgPath of imageFiles) {
    const ext = path.extname(imgPath);
    const webpPath = imgPath.slice(0, -ext.length) + '.webp';

    // 如果這個檔案已經被轉過 webp 了，就跳過
    if (fs.existsSync(webpPath)) continue;

    try {
      // 核心壓縮邏輯：最大寬度 600px，轉為 WebP (品質 80)
      await sharp(imgPath)
        .resize({ width: 600, withoutEnlargement: true }) // withoutEnlargement 確保原本比 600 小的圖不會被強制放大變模糊
        .webp({ quality: 80, effort: 6 }) // effort: 6 能用稍多一點點的 CPU 時間換取更小的檔案體積
        .toFile(webpPath);

      // 轉檔成功後，刪除原本肥大的 JPG/PNG 檔案，幫硬碟瘦身
      fs.unlinkSync(imgPath);
      
      console.log(`✅ 已壓縮並轉換：${path.basename(imgPath)} -> ${path.basename(webpPath)}`);
      optimizedCount++;
    } catch (err) {
      console.error(`❌ 處理圖片失敗 ${imgPath}:`, err);
    }
  }

  // 3. 更新 Markdown 檔案裡的連結
  // 找出所有 Markdown 裡面的 .jpg / .jpeg / .png 並改成 .webp
  let updatedMdCount = 0;
  
  markdownFiles.forEach(mdPath => {
    let content = fs.readFileSync(mdPath, 'utf8');
    let hasChanges = false;

    // 替換 Markdown 語法: ![alt](image.jpg) -> ![alt](image.webp)
    const newContent = content
      .replace(/(!\[.*?\]\()([^)]+?\.(?:jpe?g|png))(\))/gi, (match, p1, p2, p3) => {
        hasChanges = true;
        return p1 + p2.replace(/\.(?:jpe?g|png)$/i, '.webp') + p3;
      })
      // 替換 HTML 語法: <img src="image.jpg"> -> <img src="image.webp">
      .replace(/(src=["'])([^"']+?\.(?:jpe?g|png))(["'])/gi, (match, p1, p2, p3) => {
        hasChanges = true;
        return p1 + p2.replace(/\.(?:jpe?g|png)$/i, '.webp') + p3;
      });

    if (hasChanges) {
      fs.writeFileSync(mdPath, newContent, 'utf8');
      updatedMdCount++;
    }
  });

  console.log('==================================================');
  if (optimizedCount === 0) {
    console.log('ℹ️ 找不到需要壓縮的舊圖片，目前所有圖片都已是最佳化狀態！');
  } else {
    console.log(`🎉 太棒了！共壓縮了 ${optimizedCount} 張圖片，並自動更新了 ${updatedMdCount} 篇 Markdown 文章。`);
    console.log('💡 所有舊的 JPG/PNG 檔案皆已安全刪除！');
  }
  console.log('==================================================');
}

// 執行主程式
optimizeImages();