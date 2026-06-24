#!/usr/bin/env node
/**
 * Локальный HTTP-сервер для проверки electron-updater.
 * Кладёт в release/ файлы Setup + latest.yml и запускает:
 *   node scripts/serve-desktop-releases.cjs
 * Затем в установленном приложении укажите updateUrl:
 *   http://127.0.0.1:8799
 * или задайте ELECTRON_UPDATE_URL=http://127.0.0.1:8799
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.DESKTOP_RELEASES_HOST || '127.0.0.1';
const PORT = Number(process.env.DESKTOP_RELEASES_PORT || 8799);
const ROOT = path.resolve(__dirname, '..', 'release');

const MIME = {
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
  '.dmg': 'application/octet-stream',
  '.zip': 'application/zip',
};

function listArtifacts() {
  if (!fs.existsSync(ROOT)) {
    return [];
  }
  return fs
    .readdirSync(ROOT)
    .filter((name) => /\.(yml|yaml|exe|blockmap|dmg|zip)$/i.test(name))
    .sort();
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, safePath === path.sep ? 'index.txt' : safePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (urlPath === '/' || urlPath === '') {
    const files = listArtifacts();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      [
        'Desktop releases test server',
        `URL: http://${HOST}:${PORT}`,
        '',
        'Files:',
        ...files.map((name) => `  /${name}`),
        '',
        'Put latest.yml and Setup.exe into release/ before testing.',
      ].join('\n'),
    );
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  const files = listArtifacts();
  console.log(`[desktop-releases] http://${HOST}:${PORT}`);
  console.log(`[desktop-releases] folder: ${ROOT}`);
  if (files.length === 0) {
    console.warn('[desktop-releases] release/ is empty — run electron:dist:win first');
  } else {
    console.log('[desktop-releases] artifacts:', files.join(', '));
  }
});
