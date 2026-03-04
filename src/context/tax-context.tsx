import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface TaxProviderProps {
  children: ReactNode
  defaultTaxRate?: number
  storageKey?: string
}

type TaxProviderState = {
  taxRate: number
  setTaxRate: (rate: number) => void
  calculateTax: (amount: number) => number
  getTaxRate: () => number
}

const initialState: TaxProviderState = {
  taxRate: 0,
  setTaxRate: () => null,
  calculateTax: () => 0,
  getTaxRate: () => 0,
}

const TaxProviderContext = createContext<TaxProviderState>(initialState)

export function TaxProvider({
  children,
  defaultTaxRate = 0,
  storageKey = 'vite-ui-tax-rate',
  ...props
}: TaxProviderProps) {
  const [taxRate, _setTaxRate] = useState<number>(defaultTaxRate)
  const [, setIsInitialized] = useState(false)

  // Load tax rate from database on initialization
  useEffect(() => {
    const loadTaxRate = async () => {
      try {
        // Try to load from database first
        if (window.electronAPI?.getSystemSetting) {
          const dbTaxRate = await window.electronAPI.getSystemSetting('sales_tax_rate')
          if (dbTaxRate !== null) {
            const parsedRate = parseFloat(dbTaxRate)
            if (!isNaN(parsedRate)) {
              _setTaxRate(parsedRate)
              localStorage.setItem(storageKey, parsedRate.toString())
              setIsInitialized(true)
              return
            }
          }
        }
        
        // Fallback to localStorage
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedRate = parseFloat(stored)
          if (!isNaN(parsedRate)) {
            _setTaxRate(parsedRate)
            setIsInitialized(true)
            return
          }
        }
        
        // Use default
        _setTaxRate(defaultTaxRate)
        setIsInitialized(true)
      } catch (error) {
        console.error('Error loading tax rate:', error)
        // Fallback to localStorage
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedRate = parseFloat(stored)
          if (!isNaN(parsedRate)) {
            _setTaxRate(parsedRate)
          }
        }
        setIsInitialized(true)
      }
    }

    loadTaxRate()
  }, [defaultTaxRate, storageKey])

  const setTaxRate = (newTaxRate: number) => {
    // Validate tax rate (0-100%)
    const validatedRate = Math.max(0, Math.min(100, newTaxRate))
    localStorage.setItem(storageKey, validatedRate.toString())
    _setTaxRate(validatedRate)
    
    // Save to database via IPC
    if (window.electronAPI?.setSystemSetting) {
      window.electronAPI.setSystemSetting('sales_tax_rate', validatedRate.toString())
    }
  }

  const calculateTax = (amount: number): number => {
    return (amount * taxRate) / 100
  }

  const getTaxRate = (): number => {
    return taxRate
  }

  const value = {
    taxRate,
    setTaxRate,
    calculateTax,
    getTaxRate,
  }

  return (
    <TaxProviderContext.Provider {...props} value={value}>
      {children}
    </TaxProviderContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTax = () => {
  const context = useContext(TaxProviderContext)

  if (context === undefined)
    throw new Error('useTax must be used within a TaxProvider')

  return context
}
