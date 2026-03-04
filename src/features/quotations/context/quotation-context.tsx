import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import type { Quotation } from '../data/schema'
import { toast } from 'sonner'

interface QuotationContextValue {
  quotations: Quotation[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const QuotationContext = createContext<QuotationContextValue | undefined>(undefined)

export function QuotationProvider({ children }: { children: ReactNode }) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.invoke('quotations:getAll')
        
        // Handle both array and object with data property
        const data = Array.isArray(result) ? result : (result?.data || result || [])
        
        // Validate and transform the data to match our schema
        const validatedData = data.map((item: any) => ({
          quotation_id: item.quotation_id,
          quotation_unique_id: item.quotation_unique_id || '',
          quotationno: item.quotationno || '',
          account_unique_id: item.account_unique_id || '',
          tax_amount: Number(item.tax_amount || 0),
          discount_amount: Number(item.discount_amount || 0),
          total_amount: Number(item.total_amount || 0),
          paid_amount: Number(item.paid_amount || 0),
          item_count: Number(item.item_count || 0),
          sale_type: item.sale_type || 'retail',
          quotation_items: Array.isArray(item.quotation_items) ? item.quotation_items : [],
          added_by: item.added_by || '',
          company_id: item.company_id || '1',
          branch_id: item.branch_id || '1',
          created_at: item.created_at || '',
          updated_at: item.updated_at || '',
        }))
        
        setQuotations(validatedData)
      } else {
        console.warn('Electron API not available')
        setQuotations([])
      }
    } catch (err) {
      console.error('Error loading quotations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load quotations')
      toast.error('Failed to load quotations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <QuotationContext.Provider value={{ 
      quotations, 
      isLoading, 
      error,
      refresh: load 
    }}>
      {children}
    </QuotationContext.Provider>
  )
}

export function useQuotationContext() {
  const ctx = useContext(QuotationContext)
  if (!ctx) throw new Error('useQuotationContext must be used within QuotationProvider')
  return ctx
}


