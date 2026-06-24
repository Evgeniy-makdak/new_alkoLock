const { dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

const STARTUP_CHECK_DELAY_MS = 45_000;
const CHECK_TIMEOUT_MS = 25_000;

let parentWindowGetter = () => null;
let logFn = console.log;
let enabled = false;
let startupTimer = null;
let updateReadyVersion = '';
let manualCheckPending = false;
let activeUpdateUrl = '';

function getParentWindow() {
  const win = parentWindowGetter();
  if (win && !win.isDestroyed()) {
    return win;
  }
  return null;
}

function log(message) {
  logFn(`[electron:auto-update] ${message}`);
}

function isPortableRuntime() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE);
}

function normalizeUpdateBaseUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return '';
  return trimmed;
}

function humanizeUpdateError(error, updateUrl) {
  const raw = error instanceof Error ? error.message : String(error);

  if (/valid semver version.*undefined/i.test(raw)) {
    return [
      'Сервер обновлений не вернул корректный файл latest.yml.',
      '',
      `Проверьте в браузере: ${updateUrl}/latest.yml`,
      '',
      'Сейчас по этому адресу, скорее всего, открывается HTML-страница приложения, а не YAML с версией.',
      'Для работы автообновления на сервер нужно выложить latest.yml и Setup.exe.',
      '',
      'Локальный тест: yarn electron:releases:serve и переменная ELECTRON_UPDATE_URL=http://127.0.0.1:8799',
    ].join('\n');
  }

  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(raw)) {
    return `Не удалось подключиться к серверу обновлений:\n${updateUrl}`;
  }

  return raw;
}

function showManualError(error, updateUrl = '') {
  const parent = getParentWindow();
  const message = error instanceof Error ? error.message : String(error);
  void dialog.showMessageBox(parent ?? undefined, {
    type: 'error',
    title: 'Проверка обновлений',
    message: 'Не удалось проверить обновления',
    detail: humanizeUpdateError(error, updateUrl),
    buttons: ['OK'],
  });
}

async function promptDownload(info) {
  const parent = getParentWindow();
  const result = await dialog.showMessageBox(parent ?? undefined, {
    type: 'info',
    title: 'Доступно обновление',
    message: `Доступна новая версия ${info.version}`,
    detail:
      'Скачать обновление сейчас? После загрузки приложение можно перезапустить для установки поверх текущей версии.',
    buttons: ['Скачать', 'Позже'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (result.response === 0) {
    log(`downloading ${info.version}`);
    await autoUpdater.downloadUpdate();
  }
}

async function promptInstall(info) {
  const parent = getParentWindow();
  const version = info?.version || updateReadyVersion || 'новая';
  const result = await dialog.showMessageBox(parent ?? undefined, {
    type: 'info',
    title: 'Обновление загружено',
    message: `Версия ${version} готова к установке`,
    detail: 'Перезапустить приложение и установить обновление поверх текущей версии?',
    buttons: ['Перезапустить', 'Позже'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (result.response === 0) {
    log(`installing ${version}`);
    autoUpdater.quitAndInstall(false, true);
  }
}

function attachAutoUpdaterEvents() {
  autoUpdater.on('checking-for-update', () => {
    log('checking for update');
  });

  autoUpdater.on('update-not-available', (info) => {
    log(`no update (current ${info?.version || 'unknown'})`);
    if (manualCheckPending) {
      manualCheckPending = false;
      const parent = getParentWindow();
      void dialog.showMessageBox(parent ?? undefined, {
        type: 'info',
        title: 'Проверка обновлений',
        message: 'Установлена актуальная версия',
        detail: `Текущая версия: ${info?.version || require('./package.json').version}`,
        buttons: ['OK'],
      });
    }
  });

  autoUpdater.on('update-available', (info) => {
    manualCheckPending = false;
    log(`update available: ${info.version}`);
    void promptDownload(info);
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Number(progress?.percent || 0).toFixed(1);
    log(`download ${percent}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateReadyVersion = info?.version || '';
    log(`update downloaded: ${updateReadyVersion}`);
    void promptInstall(info);
  });

  autoUpdater.on('error', (error) => {
    log(`error: ${error?.message || error}`);
    if (manualCheckPending) {
      manualCheckPending = false;
      showManualError(error, activeUpdateUrl);
    }
  });
}

function createDesktopAutoUpdater(options = {}) {
  parentWindowGetter = options.getParentWindow || (() => null);
  logFn = options.log || console.log;
  enabled = false;
  updateReadyVersion = '';

  if (!options.isPackaged) {
    log('disabled in development mode');
    return createController(false);
  }

  if (options.skipUpdate === true || process.env.ELECTRON_SKIP_UPDATE === '1') {
    log('disabled via ELECTRON_SKIP_UPDATE');
    return createController(false);
  }

  if (isPortableRuntime()) {
    log('disabled for portable build');
    return createController(false);
  }

  if (process.platform !== 'win32') {
    log(`disabled on platform ${process.platform} (Windows NSIS only for now)`);
    return createController(false);
  }

  const updateUrl = normalizeUpdateBaseUrl(options.updateUrl);
  if (!updateUrl) {
    log('disabled: updateUrl is not configured');
    return createController(false);
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.setFeedURL({
    provider: 'generic',
    url: updateUrl,
  });

  attachAutoUpdaterEvents();
  enabled = true;
  activeUpdateUrl = updateUrl;
  log(`enabled, feed ${updateUrl}`);

  return createController(true);
}

function createController(isEnabled) {
  return {
    isEnabled: () => isEnabled,
    start() {
      if (!isEnabled) return;
      if (startupTimer) {
        clearTimeout(startupTimer);
      }
      startupTimer = setTimeout(() => {
        void checkForUpdates({ manual: false, reason: 'startup' });
      }, STARTUP_CHECK_DELAY_MS);
    },
    checkForUpdates,
    quitAndInstallIfReady,
  };
}

async function checkForUpdates({ manual = false, reason = 'manual' } = {}) {
  if (!enabled) {
    if (manual) {
      const parent = getParentWindow();
      await dialog.showMessageBox(parent ?? undefined, {
        type: 'info',
        title: 'Проверка обновлений',
        message: 'Автообновление недоступно',
        detail:
          'Обновление через интернет доступно только для установленной (NSIS) версии приложения с настроенным updateUrl.',
        buttons: ['OK'],
      });
    }
    return null;
  }

  log(`check started (${reason})`);
  if (manual) {
    manualCheckPending = true;
  }

  try {
    const result = await Promise.race([
      autoUpdater.checkForUpdates(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Превышено время ожидания ответа сервера обновлений')), CHECK_TIMEOUT_MS);
      }),
    ]);

    return result;
  } catch (error) {
    manualCheckPending = false;
    log(`check failed: ${error?.message || error}`);
    if (manual) {
      showManualError(error, activeUpdateUrl);
    }
    return null;
  }
}

function quitAndInstallIfReady() {
  if (!enabled || !updateReadyVersion) {
    return false;
  }
  autoUpdater.quitAndInstall(false, true);
  return true;
}

module.exports = {
  createDesktopAutoUpdater,
  normalizeUpdateBaseUrl,
};
