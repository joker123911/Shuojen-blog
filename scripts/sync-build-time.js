const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml'); 

const targets = [
  path.join(__dirname, '../blog'),
  path.join(__dirname, '../photoblog')
];

// 取得台灣目前時間 (UTC+8)
const now = new Date();
const offset = 8; 
const twNow = new Date(now.getTime() + offset * 3600 * 1000);
const todayStr = twNow.toISOString().split('T')[0];
// 格式化為 YYYY-MM-DDTHH:mm:ss+08:00
const currentFullTime = twNow.toISOString().split('.')[0] + '+08:00';

function processFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      processFiles(filePath);
      return;
    }

    if (file.endsWith('.md') || file.endsWith('.mdx')) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(fileContent);
      const data = parsed.data;
      
      let targetDate = data.date;
      if (!targetDate) {
        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) targetDate = dateMatch[1];
      }

      if (targetDate) {
        let datePart = '';
        let hasSpecificTime = false;

        if (targetDate instanceof Date) {
          const twDate = new Date(targetDate.getTime() + offset * 3600 * 1000);
          const isoStr = twDate.toISOString();
          datePart = isoStr.slice(0, 10);
          hasSpecificTime = targetDate.getUTCHours() !== 0 || targetDate.getUTCMinutes() !== 0;
        } else {
          const dateStr = String(targetDate);
          datePart = dateStr.slice(0, 10);
          hasSpecificTime = dateStr.includes('T') || dateStr.includes(' ') || dateStr.length > 10;
        }

        // 如果 front matter 已經有 rss_date，代表已經設定過精確發布時間
        if (data.rss_date) {
          hasSpecificTime = true;
        }

        // 如果原本的 date 包含精確時間，但尚未設定 rss_date，則進行分開
        if (hasSpecificTime && !data.rss_date) {
          let originalDateStr = '';
          if (data.date instanceof Date) {
            const twDate = new Date(data.date.getTime() + offset * 3600 * 1000);
            originalDateStr = twDate.toISOString().split('.')[0] + '+08:00';
          } else {
            originalDateStr = String(data.date).replace(' ', 'T');
          }
          data.rss_date = originalDateStr;
          data.date = datePart;
          saveFile(filePath, parsed.content, data, file, `分開 date 和 rss_date`);
        }
        // 如果是今天且尚未設定精確的 RSS 發布時間
        else if (datePart === todayStr && !hasSpecificTime) {
          data.date = datePart;
          data.rss_date = currentFullTime;
          saveFile(filePath, parsed.content, data, file, `初次設定今日發布時間: ${currentFullTime}`);
        } 
        // 如果是未來日期且尚未設定精確的 RSS 發布時間
        else if (datePart > todayStr && !hasSpecificTime) {
          data.date = datePart;
          data.rss_date = `${datePart}T00:00:01+08:00`;
          saveFile(filePath, parsed.content, data, file, `補上預排發布時間`);
        }
      }
    }
  });
}

/**
 * 儲存檔案並強制套用 YAML 格式
 */
function saveFile(filePath, content, data, file, msg) {
  const newContent = matter.stringify(content, data, {
    engines: {
      yaml: {
        stringify: (obj) => {
          let yamlStr = yaml.dump(obj, {
            quotingType: "'", 
            forceQuotes: true, 
            flowLevel: 1 
          });

          // 移除 date 欄位的引號，保持 YAML 時間格式相容性
          return yamlStr.replace(/^date:\s*'(.+)'$/m, 'date: $1');
        }
      }
    }
  });
  
  fs.writeFileSync(filePath, newContent);
  console.log(`✅ [RSS 補完] ${file} -> ${msg}`);
}

console.log(`🔍 正在檢查文章... (今日: ${todayStr})`);
targets.forEach(target => processFiles(target));