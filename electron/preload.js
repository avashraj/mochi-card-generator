const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  generateCards: (text) => ipcRenderer.invoke('gemini:generate', text),
  saveCards: (cards) => ipcRenderer.invoke('cards:save', cards),
})
