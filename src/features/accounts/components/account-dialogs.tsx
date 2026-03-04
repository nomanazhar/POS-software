import { AccountMutateDrawer } from './account-mutate-drawer'
import { AccountViewDialog } from './account-view-dialog'
import { useAccountContext } from '../context/account-context'

export function AccountDialogs() {
  const { dialogState, closeDialog, selectedAccount } = useAccountContext()

  return (
    <>
      <AccountMutateDrawer
        open={dialogState.open && dialogState.type === 'create'}
        onOpenChange={closeDialog}
        isEdit={false}
      />
      <AccountMutateDrawer
        open={dialogState.open && dialogState.type === 'update'}
        onOpenChange={closeDialog}
        isEdit={true}
        currentAccount={selectedAccount}
      />
      <AccountViewDialog
        open={dialogState.open && dialogState.type === 'view'}
        onOpenChange={closeDialog}
        account={selectedAccount}
      />
    </>
  )
}


