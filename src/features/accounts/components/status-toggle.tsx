import { Button } from '@/components/ui/button'
import { useAccountContext } from '../context/account-context'
import { Account } from '../data/schema'
import { toast } from 'sonner'

interface StatusToggleProps {
  account: Account
}

export function StatusToggle({ account }: StatusToggleProps) {
  const { fetchAccounts } = useAccountContext()

  const handleStatusChange = async () => {
    try {
      const newStatus: 'active' | 'inactive' = account.account_status === 'active' ? 'inactive' : 'active'
      
      if (account.account_id && window.electronAPI) {
        const result = await window.electronAPI.invoke('accounts:updateStatus', {
          accountId: account.account_id,
          status: newStatus
        })
        
        if (result.success) {
          toast.success(`Account ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
          await fetchAccounts() // Refresh the accounts list
        } else {
          toast.error(result.error || 'Failed to update account status')
        }
      }
    } catch (error) {
      console.error('Error updating account status:', error)
      toast.error('Failed to update account status. Please try again.')
    }
  }

  const isActive = account.account_status === 'active'

  return (
    <Button
      variant={isActive ? "default" : "secondary"}
      size="sm"
      onClick={handleStatusChange}
      className={`text-xs px-3 py-1 ${isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </Button>
  )
}
