'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('robcoDesktop', Object.freeze({
  wallpaper: Object.freeze({
    read: () => ipcRenderer.invoke('wallpaper', 'read'),
    save: value => ipcRenderer.invoke('wallpaper', 'save', value),
    choose: () => ipcRenderer.invoke('wallpaper', 'choose'),
    restore: () => ipcRenderer.invoke('wallpaper', 'restore')
  }),
  search: Object.freeze({
    overlay: active => ipcRenderer.invoke('vaultnet:control', 'search-overlay', active),
    restoreBrowserFocus: () => ipcRenderer.invoke('vaultnet:control', 'focus'),
    onOpen: callback => {
      const listener = () => callback();
      ipcRenderer.on('system-search:open', listener);
      return () => ipcRenderer.removeListener('system-search:open', listener);
    }
  }),
  openExternal: url => ipcRenderer.invoke('open-external', url),
  browser: Object.freeze({
    navigate: url => ipcRenderer.invoke('vaultnet:control', 'navigate', url),
    back: () => ipcRenderer.invoke('vaultnet:control', 'back'),
    forward: () => ipcRenderer.invoke('vaultnet:control', 'forward'),
    reload: () => ipcRenderer.invoke('vaultnet:control', 'reload'),
    home: () => ipcRenderer.invoke('vaultnet:control', 'home'),
    close: () => ipcRenderer.invoke('vaultnet:control', 'close'),
    state: () => ipcRenderer.invoke('vaultnet:control', 'state'),
    layout: bounds => ipcRenderer.invoke('vaultnet:control', 'layout', bounds),
    onState: callback => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('vaultnet:state', listener);
      return () => ipcRenderer.removeListener('vaultnet:state', listener);
    },
    onAddress: callback => {
      const listener = () => callback();
      ipcRenderer.on('vaultnet:address', listener);
      return () => ipcRenderer.removeListener('vaultnet:address', listener);
    }
  })
}));
