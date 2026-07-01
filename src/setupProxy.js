const fs = require('fs');
const path = require('path');

const { createProxyMiddleware } = require('http-proxy-middleware');

const DEFAULT_DOMAIN = 'alcolock-test.lsystems.ru';

function readDevWsProxyTarget() {
  if (process.env.REACT_APP_DEV_API_PROXY) {
    return process.env.REACT_APP_DEV_API_PROXY.replace(/\/$/, '');
  }

  try {
    const configPath = path.join(__dirname, '../public/config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    let apiUrl = String(config.apiUrl || '').trim();
    apiUrl = apiUrl.split('{DOMAIN}').join(DEFAULT_DOMAIN);
    apiUrl = apiUrl.split('YOUR_SERVER_HOST').join(DEFAULT_DOMAIN);
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      return apiUrl.replace(/\/+$/, '');
    }
  } catch {
    /* ignore */
  }

  return 'http://localhost:8080';
}

/**
 * Только CRA dev-server. Проксирует STOMP WebSocket с localhost на бэкенд из config.json.
 * Нужно для Electron на http://localhost (same-origin WS вместо прямого wss://… → 403).
 * Production build и PWA этот файл не используют.
 */
module.exports = function setupProxy(app) {
  const target = readDevWsProxyTarget();

  app.use(
    '/ws',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      secure: true,
    }),
  );
};
