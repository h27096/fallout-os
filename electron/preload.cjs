'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('robcoDesktop', Object.freeze({
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
