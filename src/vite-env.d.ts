/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
      on: (channel: string, listener: (...args: any[]) => void) => void
      reload: () => Promise<void>
      openDevTools: () => Promise<void>
      getSystemSetting: (key: string) => Promise<string | null>
      setSystemSetting: (key: string, value: string) => Promise<{ success: boolean }>
      getAllSystemSettings: () => Promise<Array<{ setting_key: string; setting_value: string; updated_at: string }>>
      // Real-time stock & reservation APIs
      getAvailableStock: (productUniqueId: string) => Promise<any>
      createReservation: (payload: any) => Promise<any>
      updateReservationQty: (payload: { reservationId: string; newQuantity: number }) => Promise<any>
      cancelReservation: (reservationId: string) => Promise<any>
      completeBillReservations: (payload: { billId: string | number | null; terminalId?: string }) => Promise<any>

      // Database export/import functionality
      exportDatabase: () => Promise<any>
      importDatabase: (filePath: string, options?: any) => Promise<any>
      validateDatabaseFile: (filePath: string) => Promise<any>
      getDatabaseStats: () => Promise<any>
      selectDatabaseFile: () => Promise<any>
    }
  }
}

export {}
