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
 * Electron на localhost/127.0.0.1: STOMP через same-origin (/ws → proxy на бэкенд).
 * На прод-домене (alcolock-test…) — wsUrl из config.json.
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

  if (configWsUrl?.trim()) {
    return configWsUrl.trim();
  }
  if (apiUrl?.trim()) {
    return buildWsUrlFromApiUrl(apiUrl);
  }
  return '';
}
