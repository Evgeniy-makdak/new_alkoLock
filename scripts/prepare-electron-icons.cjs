const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const favicon32 = path.join(root, 'public', 'favicon-32x32.png');
const favicon16 = path.join(root, 'public', 'favicon-16x16.png');
const electronDir = path.join(root, 'electron');
const tmp256 = path.join(electronDir, '.icon-tmp-256.png');
const iconPng = path.join(electronDir, 'app-icon.png');
const icon512 = path.join(electronDir, 'app-icon-512.png');
const iconIco = path.join(electronDir, 'app-icon.ico');

for (const file of [favicon32, favicon16]) {
  if (!fs.existsSync(file)) {
    console.error(`[electron:icons] Не найден ${file}`);
    process.exit(1);
  }
}

const sharp = (args) =>
  execFileSync('npx', ['--yes', 'sharp-cli', ...args.split(' ').filter(Boolean)], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
  });

sharp(`resize 256 256 -i "${favicon32}" -o "${tmp256}" --kernel nearest`);
sharp(`resize 256 256 -i "${favicon32}" -o "${iconPng}" --kernel nearest`);
sharp(`resize 512 512 -i "${favicon32}" -o "${icon512}" --kernel nearest`);

const icoBuffer = execFileSync('npx', ['--yes', 'png-to-ico', iconPng], {
  cwd: root,
  shell: true,
  stdio: ['ignore', 'pipe', 'inherit'],
  maxBuffer: 10 * 1024 * 1024,
});

fs.writeFileSync(iconIco, icoBuffer);
fs.rmSync(tmp256, { force: true });

const magic = icoBuffer.slice(0, 4).toString('hex');
if (magic !== '00000100') {
  console.error(`[electron:icons] Некорректный ICO (${magic})`);
  process.exit(1);
}

console.log(`[electron:icons] Иконки подготовлены из public/favicon-*.png (${icoBuffer.length} bytes)`);
