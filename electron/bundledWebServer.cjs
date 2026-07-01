const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const httpProxy = require('http-proxy');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveWebDistPath() {
  const candidates = [
    path.join(__dirname, 'web-dist'),
    path.join(process.resourcesPath || '', 'web-dist'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}

function createBundledWebServer(getBackendBaseUrl) {
  const webDistPath = resolveWebDistPath();
  if (!webDistPath) {
    return null;
  }

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
  });

  const proxy = httpProxy.createProxyServer({
    ws: true,
    changeOrigin: true,
    secure: false,
    agent: httpsAgent,
  });

  proxy.on('error', (error, req, res) => {
    const target = resolveBackendTarget();
    console.error(
      `[electron:web] proxy error target=${target} path=${req?.url || ''}:`,
      error?.message || error,
    );
    if (res && !res.headersSent && typeof res.writeHead === 'function') {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Backend unavailable');
    }
  });

  const resolveBackendTarget = () => {
    const raw = getBackendBaseUrl?.();
    if (!raw) return '';
    return String(raw).replace(/\/+$/, '');
  };

  const shouldProxyToBackend = (pathname) =>
    pathname.startsWith('/api') ||
    pathname.startsWith('/ws') ||
    pathname.startsWith('/oauth') ||
    pathname.startsWith('/actuator');

  const sendStatic = (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(filePath).pipe(res);
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const backendTarget = resolveBackendTarget();

    if (backendTarget && shouldProxyToBackend(url.pathname)) {
      const targetHost = (() => {
        try {
          return new URL(backendTarget).host;
        } catch {
          return '';
        }
      })();
      proxy.web(req, res, {
        target: backendTarget,
        secure: false,
        changeOrigin: true,
        agent: httpsAgent,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        headers: targetHost ? { host: targetHost } : undefined,
      });
      return;
    }

    if (!backendTarget && shouldProxyToBackend(url.pathname)) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Backend URL is not configured');
      return;
    }

    let relativePath = decodeURIComponent(url.pathname);
    if (relativePath === '/' || relativePath === '') {
      relativePath = '/index.html';
    }

    const filePath = path.join(webDistPath, relativePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendStatic(res, filePath);
      return;
    }

    const indexPath = path.join(webDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      sendStatic(res, indexPath);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const backendTarget = resolveBackendTarget();
    if (backendTarget && url.pathname.startsWith('/ws')) {
      proxy.ws(req, socket, head, {
        target: backendTarget,
        secure: false,
        changeOrigin: true,
        agent: httpsAgent,
        cookieDomainRewrite: '',
      });
      return;
    }
    socket.destroy();
  });

  let port = 0;
  let baseUrl = '';

  const start = () =>
    new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        const backendTarget = resolveBackendTarget();
        console.log(`[electron:web] bundled UI at ${baseUrl}, backend proxy → ${backendTarget || '(not set)'}`);
        resolve(baseUrl);
      });
    });

  const stop = () =>
    new Promise((resolve) => {
      server.close(() => resolve());
    });

  const getAuthorizationUrl = () => `${baseUrl}/authorization`;

  const getBaseUrl = () => baseUrl;

  return {
    webDistPath,
    start,
    stop,
    getAuthorizationUrl,
    getBaseUrl,
  };
}

module.exports = {
  createBundledWebServer,
  resolveWebDistPath,
};
