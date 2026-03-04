// Type definitions for Electron API

interface IpcRenderer {
  invoke(channel: string, ...args: any[]): Promise<any>;
  send(channel: string, ...args: any[]): void;
  on(channel: string, listener: (...args: any[]) => void): () => void;
  removeAllListeners(channel: string): void;
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: IpcRenderer;
    };
  }
}

export {};
