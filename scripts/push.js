const { spawn } = require('child_process');
const path = require('path');

// 判斷是否為 Windows 系統
const isWin = process.platform === 'win32';

// 根據系統選擇對應的腳本路徑
// 假設你已經把 push.bat 和 push.sh 移到了 scripts 資料夾內
const scriptPath = isWin 
  ? path.join(__dirname, 'push.bat') 
  : path.join(__dirname, 'push.sh');

const command = isWin ? scriptPath : 'sh';
const args = isWin ? [] : [scriptPath];

console.log(`🚀 正在執行推送腳本: ${scriptPath}...`);

// 執行腳本並繼承輸出流（讓你可以看到執行過程中的文字）
const processCall = spawn(command, args, { stdio: 'inherit', shell: true });

processCall.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ 推送完成！');
  } else {
    console.error(`❌ 腳本執行失敗，錯誤代碼: ${code}`);
  }
});