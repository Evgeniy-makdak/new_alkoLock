const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alcolockDesktop', {
  openOperatorChatPopup(payload) {
    return ipcRenderer.invoke('operator-chat-popup:open', payload);
  },
  closeCurrentWindow() {
    return ipcRenderer.invoke('operator-chat-popup:close-current');
  },
  closeOperatorChatPopup() {
    return ipcRenderer.invoke('operator-chat-popup:close');
  },
  setPopupBounds(bounds) {
    return ipcRenderer.invoke('operator-chat-popup:set-bounds', bounds);
  },
  onZoomChanged(callback) {
    const channel = 'operator-chat-popup:zoom-changed';
    const listener = () => {
      callback();
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  /** Получить токен из основного окна для передачи в popup */
  getAuthToken() {
    return ipcRenderer.invoke('operator-chat-popup:get-auth-token');
  },
  /** Выбранный филиал из основного окна (localStorage OFFICE) */
  getSelectedBranchState() {
    return ipcRenderer.invoke('operator-chat-popup:get-selected-branch');
  },
});

contextBridge.exposeInMainWorld('alcolockDesktopSetup', {
  getDefaultServerUrl() {
    return ipcRenderer.invoke('server-config:get-default-url');
  },
  getCurrentServerUrl() {
    return ipcRenderer.invoke('server-config:get-current-url');
  },
  saveServerUrl(serverUrl) {
    return ipcRenderer.invoke('server-config:save-url', serverUrl);
  },
});
