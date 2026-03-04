import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { SalesProvider, useSales } from './context/sales-context'
import { Cart } from './components/cart'
import { Checkout } from './components/checkout'
import { useState, useEffect } from 'react'
// import { SyncButton } from '@/components/sync-button'
import { useSalesKeyboardShortcuts } from './hooks/use-sales-keyboard-shortcuts'
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help'
import BillProvider from '../bills/context/bill-context'
import { AccountProvider } from '../accounts/context/account-context'
import { useInventory, default as InventoryProvider } from '@/features/inventory/context/inventory-context'

function SalesBody() {
  const [now, setNow] = useState(new Date())
  const keyboardRefs = useSalesKeyboardShortcuts()
  const { products: inventoryProducts } = useInventory()
  const { setInventory } = useSales()

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Update inventory in sales context when inventory changes
  useEffect(() => {
    if (inventoryProducts && inventoryProducts.length > 0) {
      setInventory(inventoryProducts)
    }
  }, [inventoryProducts, setInventory])

  return (
    <AccountProvider>
  
  
      <Header fixed className='justify-between h-[8vh]  '>
        <div className='ml-auto flex items-center justify-end space-x-6'>
          <KeyboardShortcutsHelp />
          {/* <SyncButton /> */}
          <div className="flex flex-col items-start justify-end mr-2 min-w-[120px]">
            <span className="text-xs text-muted-foreground font-mono">
              <span className="font-bold text-lg text-primary tracking-widest">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
              <br/>
              {now.toLocaleDateString()}
            </span>
          </div>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='h-[90vh] p-0 '>
        <div className='-mx-6 h-[100%] flex-1 px-4 lg:flex-row lg:space-y-0 lg:space-x-12 xl:flex-row xl:space-y-0 xl:space-x-12 '>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-[100%] ">
            <div className="lg:col-span-3 ">
              <Cart 
                barcodeInputRef={keyboardRefs.barcodeInputRef}
                keyboardRefs={{
                  barcodeInputRef: keyboardRefs.barcodeInputRef,
                  quantityInputRef: keyboardRefs.quantityInputRef,
                  discardButtonRef: keyboardRefs.discardButtonRef
                }}
                inventory={inventoryProducts}
              />
            </div>
            <div className="lg:col-span-1">
              <Checkout 
                keyboardRefs={{
                  discountInputRef: keyboardRefs.discountInputRef,
                  extraChargesInputRef: keyboardRefs.extraChargesInputRef,
                  receivedCashInputRef: keyboardRefs.receivedCashInputRef,
                  customerNameInputRef: keyboardRefs.customerNameInputRef,
                  wholesaleToggleRef: keyboardRefs.wholesaleToggleRef
                }}
                inventory={inventoryProducts}
              />
            </div>
          </div>
        </div>
      </Main>
     
     

    </AccountProvider>
  )
}

export function Sales() {
  return (
    <BillProvider>
      <SalesProvider>
        <InventoryProvider>
          <SalesBody />
        </InventoryProvider>
      </SalesProvider>
    </BillProvider>
  )
}