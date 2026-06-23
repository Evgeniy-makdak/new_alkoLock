const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const targetDir = path.join(__dirname, '..', 'electron', 'web-dist');

if (!fs.existsSync(buildDir)) {
  console.error('[electron:prepare] Сначала выполните yarn build');
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(buildDir, targetDir, { recursive: true });
console.log(`[electron:prepare] Скопировано в ${targetDir}`);
