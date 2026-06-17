const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const fs = require('fs');
const path = require('path');

const OPERATOR_CHAT_POPUP_PATH = '/operator-chat-popup';
const AUTH_PATH = '/authorization';
const FALLBACK_APP_URL = 'http://localhost/authorization';
const CHAT_CONTROL_LABEL_FIX_CSS = `
  [class*="usersSelectContainer"] .MuiFormControl-root > .MuiBox-root,
  [class*="transferRow"] .MuiFormControl-root > .MuiBox-root {
    opacity: 1 !important;
  }

  [class*="usersSelectContainer"] .MuiFormControl-root > .MuiBox-root > span.MuiBox-root,
  [class*="transferRow"] .MuiFormControl-root > .MuiBox-root > span.MuiBox-root {
    background: #ffffff !important;
    background-color: #ffffff !important;
    background-image: none !important;
    box-shadow: 0 0 0 4px #ffffff !important;
    border-radius: 4px !important;
    opacity: 1 !important;
    z-index: 5 !important;
  }

  html[data-theme="dark"] [class*="usersSelectContainer"] .MuiFormControl-root > .MuiBox-root > span.MuiBox-root,
  html[data-theme="dark"] [class*="transferRow"] .MuiFormControl-root > .MuiBox-root > span.MuiBox-root {
    background: #1e1e1e !important;
    background-color: #1e1e1e !important;
    box-shadow: 0 0 0 4px #1e1e1e !important;
  }
`;
const OPERATOR_CHAT_POPUP_TRANSPARENCY_CSS = `
  html,
  body,
  #root,
  #root > div,
  main {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
  }

  body {
    overflow: hidden !important;
  }

  .MuiCssBaseline-root {
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
  }

  [class*="chatHeader"] {
    -webkit-app-region: drag !important;
    cursor: grab !important;
  }

  [class*="chatHeader"]:active {
    cursor: grabbing !important;
  }

  [class*="headerActions"],
  [class*="chatHeader"] button,
  [class*="chatHeader"] input,
  [class*="chatHeader"] textarea,
  [class*="chatHeader"] select,
  [class*="chatHeader"] [role="button"],
  [class*="chatHeader"] svg {
    -webkit-app-region: no-drag !important;
  }
`;

let mainWindow = null;
let operatorChatPopupWindow = null;
let serverSetupWindow = null;

function clampZoomLevel(level) {
  return Math.min(5, Math.max(-4, level));
}

function changeWindowZoom(win, delta) {
  if (!win || win.isDestroyed()) return;
  const webContents = win.webContents;
  webContents.setZoomLevel(clampZoomLevel(webContents.getZoomLevel() + delta));
}

function resetWindowZoom(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents.setZoomLevel(0);
}

function installZoomShortcuts(win) {
  win.webContents.on('before-input-event', (event, input) => {
    if (!input.control && !input.meta) return;
    const key = String(input.key || '').toLowerCase();

    if (key === '+' || key === '=' || key === 'numadd') {
      event.preventDefault();
      changeWindowZoom(win, 0.5);
      return;
    }

    if (key === '-' || key === '_' || key === 'numsub') {
      event.preventDefault();
      changeWindowZoom(win, -0.5);
      return;
    }

    if (key === '0' || key === 'num0') {
      event.preventDefault();
      resetWindowZoom(win);
    }
  });
}

function normalizeAppUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed;
}

function readJsonConfig(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function routeUrlFromAppUrl(baseUrl, routePath) {
  try {
    const url = new URL(baseUrl);
    url.pathname = routePath.startsWith('/') ? routePath : `/${routePath}`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
  }
}

function toAuthorizationUrl(raw) {
  const normalized = normalizeAppUrl(raw);
  if (!normalized) return '';
  return routeUrlFromAppUrl(normalized, AUTH_PATH);
}

function normalizeServerInput(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return toAuthorizationUrl(withProtocol);
}

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'app.config.json');
}

function readLaunchOverrideAppUrl() {
  const arg = process.argv.find((item) => item.startsWith('--app-url='));
  const fromArg = toAuthorizationUrl(arg ? arg.slice('--app-url='.length) : '');
  if (fromArg) return fromArg;

  const fromEnv = toAuthorizationUrl(process.env.ELECTRON_APP_URL);
  if (fromEnv) return fromEnv;

  return '';
}

function readConfiguredAppUrl() {
  const fromLaunchOverride = readLaunchOverrideAppUrl();
  if (fromLaunchOverride) return fromLaunchOverride;

  const userConfig = readJsonConfig(getUserConfigPath());
  const fromUserConfig = toAuthorizationUrl(userConfig?.appUrl);
  if (fromUserConfig) return fromUserConfig;

  return '';
}

function readDefaultSetupAppUrl() {
  const fromLaunchOverride = readLaunchOverrideAppUrl();
  if (fromLaunchOverride) return fromLaunchOverride;

  const configCandidates = [
    path.join(process.cwd(), 'electron', 'app.config.json'),
    path.join(process.cwd(), 'app.config.json'),
    path.join(path.dirname(process.execPath), 'app.config.json'),
    path.join(process.resourcesPath || '', 'app.config.json'),
  ];

  for (const filePath of configCandidates) {
    const config = readJsonConfig(filePath);
    const fromConfig = toAuthorizationUrl(config?.appUrl);
    if (fromConfig) return fromConfig;
  }

  return FALLBACK_APP_URL;
}

function getAppUrl() {
  return readConfiguredAppUrl() || readDefaultSetupAppUrl();
}

function persistUserAppUrl(appUrl) {
  const normalized = toAuthorizationUrl(appUrl);
  if (!normalized) {
    throw new Error('Некорректный адрес сервера');
  }
  try {
    fs.mkdirSync(path.dirname(getUserConfigPath()), { recursive: true });
    fs.writeFileSync(getUserConfigPath(), JSON.stringify({ appUrl: normalized }, null, 2), 'utf8');
    return normalized;
  } catch (error) {
    throw new Error(error?.message || 'Не удалось сохранить адрес сервера');
  }
}

function resetSavedServerAndOpenSetup() {
  try {
    fs.rmSync(getUserConfigPath(), { force: true });
  } catch {
    /* ignore */
  }
  if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
    operatorChatPopupWindow.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  if (!serverSetupWindow || serverSetupWindow.isDestroyed()) {
    createServerSetupWindow();
  } else {
    serverSetupWindow.focus();
  }
}

function installAppMenu() {
  const template = [
    {
      label: 'Alcolocks Operator',
      submenu: [
        {
          label: 'Сменить сервер',
          click: resetSavedServerAndOpenSetup,
        },
        { type: 'separator' },
        { role: 'quit', label: 'Выход' },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'resetZoom', label: 'Сбросить масштаб' },
        { role: 'zoomIn', label: 'Увеличить масштаб' },
        { role: 'zoomOut', label: 'Уменьшить масштаб' },
        { type: 'separator' },
        { role: 'reload', label: 'Обновить' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createServerSetupHtml(defaultUrl) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Настройка сервера</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      background: #f3f6f8;
      color: #263238;
    }
    .card {
      width: 460px;
      padding: 28px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 18px 45px rgba(38, 50, 56, 0.18);
    }
    h1 {
      margin: 0 0 10px;
      font-size: 22px;
      font-weight: 600;
    }
    p {
      margin: 0 0 20px;
      line-height: 1.45;
      color: #607d8b;
      font-size: 14px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: #455a64;
    }
    input {
      width: 100%;
      height: 44px;
      padding: 0 12px;
      border: 1px solid #cfd8dc;
      border-radius: 8px;
      font-size: 15px;
      outline: none;
    }
    input:focus {
      border-color: #667a8a;
      box-shadow: 0 0 0 3px rgba(102, 122, 138, 0.16);
    }
    button {
      width: 100%;
      height: 44px;
      margin-top: 18px;
      border: 0;
      border-radius: 8px;
      background: #667a8a;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.7;
      cursor: default;
    }
    .error {
      min-height: 18px;
      margin-top: 10px;
      color: #d32f2f;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <form class="card" id="form">
    <h1>Введите адрес сервера</h1>
    <p>Адрес сохраняется на этом компьютере. При следующих запусках приложение откроется автоматически.</p>
    <label for="serverUrl">Адрес сервера</label>
    <input id="serverUrl" name="serverUrl" autocomplete="url" value="${escapeHtml(defaultUrl)}" placeholder="https://server-company.ru" />
    <button id="submit" type="submit">Подключиться</button>
    <div class="error" id="error"></div>
  </form>
  <script>
    const form = document.getElementById('form');
    const input = document.getElementById('serverUrl');
    const error = document.getElementById('error');
    const submit = document.getElementById('submit');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      try {
        await window.alcolockDesktopSetup.saveServerUrl(input.value);
      } catch (err) {
        error.textContent = err && err.message ? err.message : 'Не удалось сохранить адрес сервера';
        submit.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

function clampToDisplay(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizePopupBounds(bounds) {
  const display = screen.getDisplayNearestPoint({
    x: Number.isFinite(bounds.left) ? bounds.left : 0,
    y: Number.isFinite(bounds.top) ? bounds.top : 0,
  });
  const area = display.workArea;
  const width = Math.max(320, Math.round(bounds.outerW || 620));
  const height = Math.max(240, Math.round(bounds.outerH || 720));
  return {
    width,
    height,
    x: clampToDisplay(Math.round(bounds.left ?? area.x + 80), area.x, area.x + area.width - 80),
    y: clampToDisplay(Math.round(bounds.top ?? area.y + 80), area.y, area.y + area.height - 80),
  };
}

function parseWindowOpenFeatures(features) {
  if (typeof features !== 'string' || !features.trim()) return {};
  return features.split(',').reduce((acc, item) => {
    const [rawKey, rawValue] = item.split('=');
    const key = rawKey?.trim();
    const value = Number(rawValue);
    if (!key || !Number.isFinite(value)) return acc;
    if (key === 'width') acc.outerW = value;
    if (key === 'height') acc.outerH = value;
    if (key === 'left') acc.left = value;
    if (key === 'top') acc.top = value;
    return acc;
  }, {});
}

function isOperatorChatPopupUrl(rawUrl) {
  try {
    return new URL(rawUrl).pathname === OPERATOR_CHAT_POPUP_PATH;
  } catch {
    return typeof rawUrl === 'string' && rawUrl.includes(OPERATOR_CHAT_POPUP_PATH);
  }
}

function installOperatorPopupWindowOpenHandler(win) {
  win.webContents.setWindowOpenHandler((details) => {
    if (!isOperatorChatPopupUrl(details.url)) {
      return { action: 'allow' };
    }

    createOperatorChatPopupWindow({
      url: details.url,
      lock: parseWindowOpenFeatures(details.features),
    });
    return { action: 'deny' };
  });
}

function createMainWindow() {
  const appUrl = getAppUrl();
  console.log(`[electron] loading main window: ${appUrl}`);
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[electron] failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
  });
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      void mainWindow.webContents.insertCSS(CHAT_CONTROL_LABEL_FIX_CSS);
    }
  });
  installZoomShortcuts(mainWindow);
  installOperatorPopupWindowOpenHandler(mainWindow);
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(appUrl);
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
      operatorChatPopupWindow.close();
    }
  });
}

function createServerSetupWindow() {
  const defaultAppUrl = readDefaultSetupAppUrl();
  console.log(`[electron] opening server setup window, default: ${defaultAppUrl}`);
  serverSetupWindow = new BrowserWindow({
    width: 540,
    height: 420,
    minWidth: 460,
    minHeight: 360,
    resizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  serverSetupWindow.setMenuBarVisibility(false);
  installZoomShortcuts(serverSetupWindow);
  serverSetupWindow.once('ready-to-show', () => {
    if (serverSetupWindow && !serverSetupWindow.isDestroyed()) {
      serverSetupWindow.show();
      serverSetupWindow.focus();
    }
  });
  serverSetupWindow.on('closed', () => {
    serverSetupWindow = null;
  });
  serverSetupWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(createServerSetupHtml(''))}`,
  );
}

function createOperatorChatPopupWindow(payload = {}) {
  const appUrl = payload.url || routeUrlFromAppUrl(getAppUrl(), OPERATOR_CHAT_POPUP_PATH);
  console.log(`[electron] loading operator chat popup: ${appUrl}`);
  const bounds = normalizePopupBounds(payload.lock || {});

  if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
    operatorChatPopupWindow.setBounds(bounds, false);
    operatorChatPopupWindow.focus();
    return;
  }

  operatorChatPopupWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    movable: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  operatorChatPopupWindow.setMenuBarVisibility(false);
  operatorChatPopupWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `[electron] failed to load popup ${validatedURL}: ${errorCode} ${errorDescription}`,
      );
    },
  );
  operatorChatPopupWindow.webContents.on('did-finish-load', () => {
    if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
      void operatorChatPopupWindow.webContents.insertCSS(OPERATOR_CHAT_POPUP_TRANSPARENCY_CSS);
      void operatorChatPopupWindow.webContents.insertCSS(CHAT_CONTROL_LABEL_FIX_CSS);
      operatorChatPopupWindow.setBackgroundColor('#00000000');
    }
  });
  installZoomShortcuts(operatorChatPopupWindow);
  installOperatorPopupWindowOpenHandler(operatorChatPopupWindow);
  operatorChatPopupWindow.once('ready-to-show', () => {
    if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
      operatorChatPopupWindow.show();
      operatorChatPopupWindow.focus();
    }
  });
  operatorChatPopupWindow.on('closed', () => {
    operatorChatPopupWindow = null;
  });
  operatorChatPopupWindow.loadURL(appUrl);
}

ipcMain.handle('operator-chat-popup:open', (_event, payload) => {
  createOperatorChatPopupWindow(payload);
});

ipcMain.handle('operator-chat-popup:close-current', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.handle('server-config:get-default-url', () => readDefaultSetupAppUrl());

ipcMain.handle('server-config:save-url', (_event, serverUrl) => {
  const appUrl = normalizeServerInput(serverUrl);
  if (!appUrl) {
    throw new Error('Введите корректный адрес, например https://alcolock-test.lsystems.ru');
  }

  const savedAppUrl = persistUserAppUrl(appUrl);
  if (serverSetupWindow && !serverSetupWindow.isDestroyed()) {
    serverSetupWindow.close();
  }
  createMainWindow();
  return savedAppUrl;
});

app.whenReady().then(() => {
  installAppMenu();

  if (readConfiguredAppUrl()) {
    createMainWindow();
  } else {
    createServerSetupWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (readConfiguredAppUrl()) {
        createMainWindow();
      } else {
        createServerSetupWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
