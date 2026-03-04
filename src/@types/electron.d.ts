// Type definitions for Electron API

export {};

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      // Add other Electron API methods as needed
    };
  }
}
