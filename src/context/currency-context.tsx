import { createContext, useContext, useState, ReactNode } from 'react'

type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'PKR'

interface CurrencyProviderProps {
  children: ReactNode
  defaultCurrency?: Currency
  storageKey?: string
}

type CurrencyProviderState = {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatAmount: (amount: number) => string
  getCurrencySymbol: () => string
}

const initialState: CurrencyProviderState = {
  currency: 'USD',
  setCurrency: () => null,
  formatAmount: () => '',
  getCurrencySymbol: () => '$',
}

const CurrencyProviderContext = createContext<CurrencyProviderState>(initialState)

const currencyConfig = {
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  EUR: { symbol: '€', locale: 'de-DE', code: 'EUR' },
  GBP: { symbol: '£', locale: 'en-GB', code: 'GBP' },
  INR: { symbol: '₹', locale: 'en-IN', code: 'INR' },
  JPY: { symbol: '¥', locale: 'ja-JP', code: 'JPY' },
  PKR: { symbol: '₨', locale: 'en-PK', code: 'PKR' },
} as const

export function CurrencyProvider({
  children,
  defaultCurrency = 'PKR',
  storageKey = 'vite-ui-currency',
  ...props
}: CurrencyProviderProps) {
  const [currency, _setCurrency] = useState<Currency>(
    () => (localStorage.getItem(storageKey) as Currency) || defaultCurrency
  )

  const setCurrency = (newCurrency: Currency) => {
    localStorage.setItem(storageKey, newCurrency)
    _setCurrency(newCurrency)
    
    // Save to database via IPC
    if (window.electronAPI?.setSystemSetting) {
      window.electronAPI.setSystemSetting('currency', newCurrency)
    }
  }

  const formatAmount = (amount: number): string => {
    const config = currencyConfig[currency]
    // Check if the amount is a whole number
    const isWholeNumber = amount % 1 === 0
    
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: isWholeNumber ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const getCurrencySymbol = (): string => {
    return currencyConfig[currency].symbol
  }

  const value = {
    currency,
    setCurrency,
    formatAmount,
    getCurrencySymbol,
  }

  return (
    <CurrencyProviderContext.Provider {...props} value={value}>
      {children}
    </CurrencyProviderContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCurrency = () => {
  const context = useContext(CurrencyProviderContext)

  if (context === undefined)
    throw new Error('useCurrency must be used within a CurrencyProvider')

  return context
}

export { currencyConfig }
export type { Currency }
