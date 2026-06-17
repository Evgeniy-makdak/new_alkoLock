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
});

contextBridge.exposeInMainWorld('alcolockDesktopSetup', {
  getDefaultServerUrl() {
    return ipcRenderer.invoke('server-config:get-default-url');
  },
  saveServerUrl(serverUrl) {
    return ipcRenderer.invoke('server-config:save-url', serverUrl);
  },
});
