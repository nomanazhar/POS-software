import { useCurrency } from '@/context/currency-context'

interface CurrencyCellProps {
  amount: number
  className?: string
  showColor?: boolean
  invertColor?: boolean
}

export function CurrencyCell({ amount, className = '', showColor = false, invertColor = false }: CurrencyCellProps) {
  const { formatAmount } = useCurrency()
  
  const formatted = formatAmount(amount)
  
  if (showColor) {
    let color: string
    if (invertColor) {
      color = amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-gray-600'
    } else {
      color = amount > 0 ? 'text-red-600' : amount < 0 ? 'text-green-600' : 'text-gray-600'
    }
    return <div className={`text-left font-medium ${color} ${className}`}>{formatted}</div>
  }
  
  return <div className={`text-left font-medium ${className}`}>{formatted}</div>
}
