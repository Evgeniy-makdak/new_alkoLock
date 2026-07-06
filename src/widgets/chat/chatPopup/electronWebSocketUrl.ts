import { isElectronChatShell } from './chatShellEnvironment';

function isLocalDevHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function useElectronSameOriginWebSocket(): boolean {
  return (
    typeof window !== 'undefined' &&
    isElectronChatShell() &&
    isLocalDevHostname(window.location.hostname)
  );
}

function buildWsUrlFromApiUrl(apiUrl: string): string {
  const base = apiUrl.trim().replace(/\/+$/, '');
  const wsBase = base.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
  return `${wsBase}/ws/websocket`;
}

/**
 * Electron (не localhost): выровнять wsUrl под фактический origin страницы.
 * — {DOMAIN} в config.json может подставить чужой хост;
 * — ws:// на удалённом nginx даёт 403, браузер при этом ходит на wss://.
 */
export function alignElectronWebSocketWithPageOrigin(wsUrl: string): string {
  if (typeof window === 'undefined' || !isElectronChatShell()) return wsUrl;
  if (isLocalDevHostname(window.location.hostname)) return wsUrl;

  try {
    const page = new URL(window.location.origin);
    const target = new URL(wsUrl);

    if (target.hostname !== page.hostname) {
      target.hostname = page.hostname;
      target.port = page.port;
    }

    if (target.protocol === 'ws:' && !isLocalDevHostname(target.hostname)) {
      target.protocol = 'wss:';
      if (target.port === '80' || target.port === page.port) {
        target.port = '';
      }
    }

    return target.toString().replace(/\/$/, '');
  } catch {
    return wsUrl;
  }
}

/**
 * Electron на удалённом сервере: apiUrl/wsUrl по window.location, не по DEFAULT_DOMAIN.
 */
export function resolveElectronRemoteUiEndpoints(merged: {
  apiUrl: string;
  wsUrl: string;
}): { apiUrl: string; wsUrl: string } | null {
  if (typeof window === 'undefined' || !isElectronChatShell()) return null;
  if (isLocalDevHostname(window.location.hostname)) return null;

  const pageOrigin = window.location.origin.replace(/\/$/, '');
  let apiUrl = merged.apiUrl;
  let wsUrl = merged.wsUrl;

  try {
    const apiHost = new URL(apiUrl).hostname;
    if (apiHost !== window.location.hostname) {
      apiUrl = `${pageOrigin}/`;
      const wsPath = new URL(merged.wsUrl).pathname || '/ws/websocket';
      wsUrl = `wss://${window.location.host}${wsPath}`;
    }
  } catch {
    apiUrl = `${pageOrigin}/`;
    wsUrl = `wss://${window.location.host}/ws/websocket`;
  }

  return {
    apiUrl,
    wsUrl: alignElectronWebSocketWithPageOrigin(wsUrl),
  };
}

/**
 * Electron на localhost/127.0.0.1: STOMP через same-origin (/ws → proxy на бэкенд).
 * На прод-домене — wsUrl из config.json, выровненный под origin страницы.
 */
export function resolveChatWebSocketUrl(apiConfig: {
  apiUrl: string;
  wsUrl: string;
}): string {
  const { apiUrl, wsUrl: configWsUrl } = apiConfig;

  if (useElectronSameOriginWebSocket()) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/websocket`;
  }

  let wsUrl = '';
  if (configWsUrl?.trim()) {
    wsUrl = configWsUrl.trim();
  } else if (apiUrl?.trim()) {
    wsUrl = buildWsUrlFromApiUrl(apiUrl);
  }

  if (!wsUrl) return '';

  return alignElectronWebSocketWithPageOrigin(wsUrl);
}
