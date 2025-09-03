// preload/index.js
import { contextBridge, ipcRenderer } from 'electron'

// A minimal safe wrapper for ipcRenderer we can expose to renderer
const ipc = {
  send: (channel, ...args) => {
    // validate channel if you want a whitelist here
    ipcRenderer.send(channel, ...args)
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => {
    const wrapped = (event, ...args) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    // return an unsubscribe function
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
  once: (channel, listener) => ipcRenderer.once(channel, (event, ...args) => listener(...args)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}

// Expose a clean API under window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  ipc
})
