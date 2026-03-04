import { useUsersContext } from '../context/users-context'
import { UsersActionDialog } from './users-action-dialog'

export function UsersDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useUsersContext()
  return (
    <>
      <UsersActionDialog
        key='user-add'
        open={open === 'create'}
        onOpenChange={(isOpen) => setOpen(isOpen ? 'create' : null)}
      />
      {currentRow && (
        <UsersActionDialog
          key={`user-edit-${currentRow.id}`}
          open={open === 'update'}
          onOpenChange={() => {
            setOpen('update')
            setTimeout(() => {
              setCurrentRow(null)
            }, 500)
          }}
          currentRow={currentRow}
        />
      )}
    </>
  )
}
