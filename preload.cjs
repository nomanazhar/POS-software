const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  reload: () => ipcRenderer.invoke('app:reload'),
  openDevTools: () => ipcRenderer.invoke('app:openDevTools'),
  getSystemSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSystemSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSystemSettings: () => ipcRenderer.invoke('settings:getAll'),
  // Real-time stock & reservation APIs
  getAvailableStock: (productUniqueId) => ipcRenderer.invoke('stock:available', productUniqueId),
  createReservation: (payload) => ipcRenderer.invoke('reservation:create', payload),
  updateReservationQty: (payload) => ipcRenderer.invoke('reservation:updateQty', payload),
  cancelReservation: (reservationId) => ipcRenderer.invoke('reservation:cancel', reservationId),
  completeBillReservations: (payload) => ipcRenderer.invoke('reservation:completeBill', payload),
  
  // Database export/import functionality
  exportDatabase: () => ipcRenderer.invoke('database:export'),
  importDatabase: (filePath, options) => ipcRenderer.invoke('database:import', { filePath, options }),
  validateDatabaseFile: (filePath) => ipcRenderer.invoke('database:validateFile', filePath),
  getDatabaseStats: () => ipcRenderer.invoke('database:getStats'),
  selectDatabaseFile: () => ipcRenderer.invoke('database:selectFile'),
}); 