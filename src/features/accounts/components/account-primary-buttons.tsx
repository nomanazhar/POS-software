import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, FileText } from 'lucide-react'
import { useAccountContext } from '../context/account-context'
import { recalculateAccountBalances } from '../data/data'
import { toast } from 'sonner'
import { useState } from 'react'

export function AccountPrimaryButtons() {
  const { openCreateDialog, openReportDialog, fetchAccounts } = useAccountContext()
  const [isRecalculating, setIsRecalculating] = useState(false)

  const handleRecalculateBalances = async () => {
    setIsRecalculating(true)
    try {
      const result = await recalculateAccountBalances()
      if (result.success) {
        toast.success('Account balances recalculated successfully')
        await fetchAccounts() // Refresh the accounts list
      } else {
        toast.error(result.error || 'Failed to recalculate balances')
      }
    } catch (error) {
      console.error('Error recalculating balances:', error)
      toast.error('Failed to recalculate balances')
    } finally {
      setIsRecalculating(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        onClick={handleRecalculateBalances}
        disabled={isRecalculating}
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
        {isRecalculating ? 'Recalculating...' : 'Recalc Balances'}
      </Button>
      <Button 
        variant="outline"
        onClick={openReportDialog}
      >
        <FileText className="mr-2 h-4 w-4" />
        Account Report
      </Button>
      <Button onClick={openCreateDialog}>
        <Plus className="mr-2 h-4 w-4" />
        Add Account
      </Button>
    </div>
  )
}


