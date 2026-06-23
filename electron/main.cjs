const { app, BrowserWindow, Menu, ipcMain, screen, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const OPERATOR_CHAT_POPUP_PATH = '/operator-chat-popup';
const AUTH_PATH = '/authorization';
const FALLBACK_APP_URL = 'http://alcolock-test.lsystems.ru/authorization';
const APP_DISPLAY_NAME = 'Информационная система «Алкозамок-М СМАРТ»';
const CHAT_DESKTOP_POPUP_CLOSED_EVENT_KEY = 'alcolock_desktop_operator_chat_popup_closed_v1';
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
const DESKTOP_SHELL_CHAT_CSS = `
  [class*="dockOpenWindowButton"] {
    display: none !important;
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

  [data-chat-layout-pinned="0"] [class*="chatHeader"] {
    -webkit-app-region: drag !important;
    cursor: grab !important;
  }

  [data-chat-layout-pinned="0"] [class*="chatHeader"]:active {
    cursor: grabbing !important;
  }

  [data-chat-layout-pinned="1"] [class*="chatHeader"] {
    -webkit-app-region: no-drag !important;
    cursor: default !important;
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

  [data-operator-chat-dock="1"] {
    top: 0 !important;
    bottom: auto !important;
  }

  [data-chat-panel-header-action="minimize"],
  [data-chat-panel-header-action="close"] {
    display: none !important;
  }
`;

let mainWindow = null;
let operatorChatPopupWindow = null;
let serverSetupWindow = null;
let serverSetupChangeMode = false;

function resolveAppIconPath() {
  const candidates = [
    path.join(__dirname, 'app-icon.ico'),
    path.join(__dirname, 'app-icon.png'),
    path.join(app.getAppPath(), 'app-icon-512.png'),
    path.join(app.getAppPath(), 'app-icon.png'),
    path.join(app.getAppPath(), 'app-icon.ico'),
    path.join(process.resourcesPath, 'app-icon-512.png'),
    path.join(process.resourcesPath, 'app-icon.png'),
    path.join(process.resourcesPath, 'app-icon.ico'),
    path.join(process.resourcesPath, 'favicon-32x32.png'),
    path.join(__dirname, '..', 'public', 'favicon-32x32.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getAppIconImage() {
  const iconPath = resolveAppIconPath();
  if (!iconPath) return null;
  const image = nativeImage.createFromPath(iconPath);
  return image.isEmpty() ? null : image;
}

function getWindowIconOptions() {
  const icon = getAppIconImage();
  return icon ? { icon } : {};
}

function applyAppIcon() {
  const icon = getAppIconImage();
  if (!icon) return;
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon);
  }
}

function applyWindowIcon(win) {
  if (!win || win.isDestroyed()) return;
  const icon = getAppIconImage();
  if (icon) {
    win.setIcon(icon);
  }
}

function installWindowIcon(win) {
  applyWindowIcon(win);
  if (!win || win.isDestroyed()) return;
  win.webContents.on('page-favicon-updated', () => {
    applyWindowIcon(win);
    injectPageFavicon(win);
  });
}

function injectPageFavicon(win) {
  if (!win || win.isDestroyed()) return;
  const iconPath = resolveAppIconPath();
  if (!iconPath) return;

  try {
    const iconBuffer = fs.readFileSync(iconPath);
    const mimeType = iconPath.toLowerCase().endsWith('.ico') ? 'image/x-icon' : 'image/png';
    const dataUrl = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
    void win.webContents.executeJavaScript(
      `(function () {
        let link = document.querySelector('link[rel*="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = ${JSON.stringify(dataUrl)};
      })();`,
      true,
    );
  } catch {
    /* ignore */
  }
}

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

function getHostFromUrl(rawUrl) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
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

function getActiveServerBaseUrl() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const url = new URL(mainWindow.webContents.getURL());
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return `${url.protocol}//${url.host}`;
      }
    } catch {
      /* ignore */
    }
  }
  return '';
}

function getConfiguredServerBaseUrl() {
  const appUrl = readConfiguredAppUrl();
  if (appUrl) {
    try {
      const url = new URL(appUrl);
      return `${url.protocol}//${url.host}`;
    } catch {
      return String(appUrl).replace(/\/authorization\/?$/, '');
    }
  }
  return getActiveServerBaseUrl();
}

function openServerChangeDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  if (serverSetupWindow && !serverSetupWindow.isDestroyed()) {
    serverSetupWindow.focus();
    return;
  }

  createServerSetupWindow({ mode: 'change' });
}

function installAppMenu() {
  const template = [
    {
      label: 'Сменить сервер',
      submenu: [
        {
          label: 'Сменить сервер',
          click: openServerChangeDialog,
        },
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

function createServerSetupHtml(defaultUrl, options = {}) {
  const isChangeMode = options.mode === 'change';
  const title = isChangeMode ? 'Сменить сервер' : 'Введите адрес сервера';
  const description = isChangeMode
    ? 'Текущий адрес указан ниже. После смены сервера потребуется повторный вход в систему.'
    : 'Адрес сохраняется на этом компьютере. При следующих запусках приложение откроется автоматически.';
  const submitLabel = isChangeMode ? 'Сменить сервер' : 'Подключиться';
  const cancelButton = isChangeMode
    ? '<button id="cancel" type="button" class="secondary">Отмена</button>'
    : '';

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
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }
    .actions button {
      flex: 1;
      height: 44px;
      margin-top: 0;
      border: 0;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    #submit {
      background: #667a8a;
      color: #fff;
    }
    button.secondary {
      background: #eceff1;
      color: #455a64;
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
    <h1>${title}</h1>
    <p>${description}</p>
    <label for="serverUrl">Адрес сервера</label>
    <input id="serverUrl" name="serverUrl" autocomplete="url" value="${escapeHtml(defaultUrl)}" placeholder="https://server-company.ru" />
    <div class="actions">
      ${cancelButton}
      <button id="submit" type="submit">${submitLabel}</button>
    </div>
    <div class="error" id="error"></div>
  </form>
  <script>
    const form = document.getElementById('form');
    const input = document.getElementById('serverUrl');
    const error = document.getElementById('error');
    const submit = document.getElementById('submit');
    const cancel = document.getElementById('cancel');

    if (cancel) {
      cancel.addEventListener('click', () => window.close());
    }

    (async () => {
      try {
        const isChangeMode = ${JSON.stringify(isChangeMode)};
        const url = isChangeMode
          ? await window.alcolockDesktopSetup.getCurrentServerUrl()
          : await window.alcolockDesktopSetup.getDefaultServerUrl();
        if (url) input.value = url;
      } catch {}
    })();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      submit.disabled = true;
      if (cancel) cancel.disabled = true;
      try {
        await window.alcolockDesktopSetup.saveServerUrl(input.value);
      } catch (err) {
        error.textContent = err && err.message ? err.message : 'Не удалось сохранить адрес сервера';
        submit.disabled = false;
        if (cancel) cancel.disabled = false;
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
    ...getWindowIconOptions(),
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
      applyWindowIcon(mainWindow);
      injectPageFavicon(mainWindow);
      void mainWindow.webContents.insertCSS(CHAT_CONTROL_LABEL_FIX_CSS);
      void mainWindow.webContents.insertCSS(DESKTOP_SHELL_CHAT_CSS);
    }
  });
  installZoomShortcuts(mainWindow);
  installOperatorPopupWindowOpenHandler(mainWindow);
  installWindowIcon(mainWindow);
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.loadURL(appUrl);
  mainWindow.on('close', (event) => {
    if (serverSetupChangeMode && serverSetupWindow && !serverSetupWindow.isDestroyed()) {
      event.preventDefault();
      serverSetupWindow.focus();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
      operatorChatPopupWindow.close();
    }
  });
}

function createServerSetupWindow(options = {}) {
  const mode = options.mode === 'change' ? 'change' : 'initial';
  serverSetupChangeMode = mode === 'change';
  const defaultUrl =
    mode === 'change' ? getConfiguredServerBaseUrl() : readDefaultSetupAppUrl();
  console.log(`[electron] opening server setup window (${mode}), default: ${defaultUrl}`);
  serverSetupWindow = new BrowserWindow({
    ...getWindowIconOptions(),
    width: 540,
    height: 420,
    minWidth: 460,
    minHeight: 360,
    resizable: false,
    maximizable: false,
    show: false,
    parent:
      mode === 'change' && mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    modal: mode === 'change' && mainWindow && !mainWindow.isDestroyed(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  serverSetupWindow.setMenuBarVisibility(false);
  installZoomShortcuts(serverSetupWindow);
  installWindowIcon(serverSetupWindow);
  serverSetupWindow.once('ready-to-show', () => {
    if (serverSetupWindow && !serverSetupWindow.isDestroyed()) {
      serverSetupWindow.show();
      serverSetupWindow.focus();
    }
  });
  serverSetupWindow.on('closed', () => {
    const wasChangeMode = mode === 'change';
    serverSetupWindow = null;
    serverSetupChangeMode = false;
    if (wasChangeMode && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  serverSetupWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(createServerSetupHtml(defaultUrl, { mode }))}`,
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
    ...getWindowIconOptions(),
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
      void operatorChatPopupWindow.webContents.insertCSS(DESKTOP_SHELL_CHAT_CSS);
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      const script = `
        try {
          localStorage.removeItem('alcolock_operator_chat_popup_active_v1');
          localStorage.setItem(${JSON.stringify(CHAT_DESKTOP_POPUP_CLOSED_EVENT_KEY)}, String(Date.now()));
          window.dispatchEvent(new Event(${JSON.stringify(CHAT_DESKTOP_POPUP_CLOSED_EVENT_KEY)}));
        } catch {}
      `;
      void mainWindow.webContents.executeJavaScript(script, true);
    }
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

ipcMain.handle('operator-chat-popup:close', () => {
  if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
    operatorChatPopupWindow.close();
  }
});

ipcMain.handle('server-config:get-default-url', () => readDefaultSetupAppUrl());

ipcMain.handle('server-config:get-current-url', () => getConfiguredServerBaseUrl());

ipcMain.handle('server-config:save-url', async (_event, serverUrl) => {
  const appUrl = normalizeServerInput(serverUrl);
  if (!appUrl) {
    throw new Error('Введите корректный адрес, например https://alcolock-test.lsystems.ru');
  }

  const previousHost = getHostFromUrl(readConfiguredAppUrl() || readDefaultSetupAppUrl());
  const savedAppUrl = persistUserAppUrl(appUrl);
  const nextHost = getHostFromUrl(savedAppUrl);

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (serverSetupWindow && !serverSetupWindow.isDestroyed()) {
      serverSetupWindow.close();
    }

    if (previousHost === nextHost) {
      mainWindow.show();
      mainWindow.focus();
      return savedAppUrl;
    }

    if (operatorChatPopupWindow && !operatorChatPopupWindow.isDestroyed()) {
      operatorChatPopupWindow.close();
    }
    await mainWindow.webContents.session.clearStorageData();
    mainWindow.loadURL(savedAppUrl);
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();
    return savedAppUrl;
  }

  if (serverSetupWindow && !serverSetupWindow.isDestroyed()) {
    serverSetupWindow.close();
  }

  createMainWindow();
  return savedAppUrl;
});

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME);
  const iconPath = resolveAppIconPath();
  console.log(`[electron] app icon: ${iconPath || 'not found'}`);
  if (process.platform === 'win32') {
    app.setAppUserModelId('ru.alcolocks.operator');
  }
  applyAppIcon();
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
