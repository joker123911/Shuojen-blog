const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('js-yaml'); // 確保環境中有安裝 js-yaml 以精準控制格式

const targets = [
  path.join(__dirname, '../blog'),
  path.join(__dirname, '../photoblog')
];

// 取得台灣目前時間 (UTC+8)
const now = new Date();
const offset = 8; 
const twNow = new Date(now.getTime() + offset * 3600 * 1000);
const todayStr = twNow.toISOString().split('T')[0];
// 格式化為 YYYY-MM-DDTHH:mm:ss+08:00 (移除毫秒)
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
        // 將文章日期轉換為台灣時間的 YYYY-MM-DD 格式
        let datePart = '';
        if (targetDate instanceof Date) {
          // 加上 8 小時偏移以取得台灣日期的 YYYY-MM-DD
          const twDate = new Date(targetDate.getTime() + offset * 3600 * 1000);
          datePart = twDate.toISOString().split('T')[0];
        } else {
          datePart = String(targetDate).split('T')[0];
        }

        // 如果是今天，更新為執行當下的最新完整時間
        if (datePart === todayStr) {
          // 取得目前檔案內的時間字串 (用於比對是否有變動)
          const existingDateStr = (data.date instanceof Date) 
            ? new Date(data.date.getTime() + offset * 3600 * 1000).toISOString().split('.')[0] + '+08:00' 
            : String(data.date);

          // 只要目前時間跟檔案時間不同，就寫入新的時間 (達到每次執行都更新)
          if (existingDateStr !== currentFullTime) {
            data.date = currentFullTime;
            saveFile(filePath, parsed.content, data, file, `同步為最新時間: ${currentFullTime}`);
          }
        } 
        // 如果是未來日期且尚未包含時間字串，則補上凌晨時間
        else if (datePart > todayStr && !String(targetDate).includes('T')) {
          data.date = `${datePart}T00:00:01+08:00`;
          saveFile(filePath, parsed.content, data, file, `補上預排發布時間`);
        }
      }
    }
  });
}

/**
 * 儲存檔案並強制套用圖片中的 YAML 格式：
 * 1. 字串強制使用單引號
 * 2. 陣列使用流模式 [val1, val2]
 * 3. 特別處理：移除 date 欄位的引號
 */
function saveFile(filePath, content, data, file, msg) {
  const newContent = matter.stringify(content, data, {
    engines: {
      yaml: {
        stringify: (obj) => {
          let yamlStr = yaml.dump(obj, {
            quotingType: "'",    // 使用單引號
            forceQuotes: true,   // 強制對所有值加上引號
            flowLevel: 1         // 讓 tags 顯示為 ['movie', 'fun'] 的陣列格式
          });

          // 使用正則表達式尋找 date: '...' 並移除該行的單引號
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