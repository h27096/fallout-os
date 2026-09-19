'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('robcoDesktop', Object.freeze({
  openExternal: url => ipcRenderer.invoke('open-external', url)
}));
