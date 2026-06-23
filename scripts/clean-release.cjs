const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');
if (!fs.existsSync(releaseDir)) {
  process.exit(0);
}

for (const entry of fs.readdirSync(releaseDir, { withFileTypes: true })) {
  const target = path.join(releaseDir, entry.name);
  if (entry.isDirectory()) {
    fs.rmSync(target, { recursive: true, force: true });
    continue;
  }

  if (/\.(exe|blockmap|yml|yaml)$/i.test(entry.name)) {
    fs.rmSync(target, { force: true });
  }
}

console.log('[electron:clean] Папка release очищена');
