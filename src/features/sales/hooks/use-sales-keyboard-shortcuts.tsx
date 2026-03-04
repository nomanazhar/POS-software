import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useKeyboardShortcuts } from '@/context/keyboard-shortcuts-context'
import { useSales } from '../context/sales-context'
import { toast } from 'sonner'

export function useSalesKeyboardShortcuts() {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts()
  const sales = useSales()
  
  // Create refs (stable identities)
  const barcodeInputRef = useRef<HTMLInputElement>(null!)
  const discountInputRef = useRef<HTMLInputElement>(null!)
  const extraChargesInputRef = useRef<HTMLInputElement>(null!)
  const quantityInputRef = useRef<HTMLInputElement>(null!)
  const receivedCashInputRef = useRef<HTMLInputElement>(null!)
  const customerNameInputRef = useRef<HTMLInputElement>(null!)
  const wholesaleToggleRef = useRef<HTMLButtonElement>(null!)
  const newBillButtonRef = useRef<HTMLButtonElement>(null!)
  const completeSaleButtonRef = useRef<HTMLButtonElement>(null!)
  const discardButtonRef = useRef<HTMLButtonElement>(null!)

  // Memoize the refs object to avoid recreating identity each render (prevents ref churn -> setRef loops)
  const refs = useMemo(() => ({
    barcodeInputRef,
    discountInputRef,
    extraChargesInputRef,
    quantityInputRef,
    receivedCashInputRef,
    customerNameInputRef,
    wholesaleToggleRef,
    newBillButtonRef,
    completeSaleButtonRef,
    discardButtonRef,
  }), [])

  // Smart focus function that handles context switching
  const smartFocus = useCallback((ref: React.RefObject<HTMLElement | null>, message: string) => {
    if (ref.current) {
      ref.current.focus()
      // Select all text if it's an input
      if (ref.current instanceof HTMLInputElement) {
        ref.current.select()
      }
      toast.info(message)
      return true
    }
    return false
  }, [])

  // Context-aware shortcut handler
  const handleContextShortcut = useCallback((targetRef: React.RefObject<HTMLElement | null>, message: string, fallbackAction?: () => void) => {
    if (!smartFocus(targetRef, message) && fallbackAction) {
      fallbackAction()
    }
  }, [smartFocus])

  useEffect(() => {
    const shortcuts = [
      // Ctrl+B - Activate barcode scanner (primary scanner focus)
      {
        key: 'b',
        ctrlKey: true,
        action: () => {
          console.log('Ctrl+B pressed - activating barcode scanner')
          handleContextShortcut(
            refs.barcodeInputRef, 
            'Barcode scanner activated',
            () => toast.error('Scanner not available')
          )
        },
        description: 'Activate barcode scanner'
      },

      // Ctrl+D - Jump to discount field in checkout
      {
        key: 'd',
        ctrlKey: true,
        action: () => {
          console.log('Ctrl+D pressed - activating discount field')
          handleContextShortcut(
            refs.discountInputRef, 
            'Discount field activated',
            () => toast.error('Discount field not available')
          )
        },
        description: 'Jump to discount field'
      },

      // Ctrl+H - Add new bill (cart section)
      {
        key: 'h',
        ctrlKey: true,
        action: () => {
          sales.createNewBill()
          // Focus back to scanner after creating new bill
          setTimeout(() => {
            smartFocus(refs.barcodeInputRef, 'New bill created - scanner ready')
          }, 100)
        },
        description: 'Create new bill'
      },

      // Ctrl+Q - Quantity input
      {
        key: 'q',
        ctrlKey: true,
        action: () => handleContextShortcut(
          refs.quantityInputRef, 
          'Quantity input activated',
          () => toast.error('Quantity input not available')
        ),
        description: 'Enter quantity'
      },

      // Ctrl+E - Extra charges
      {
        key: 'e',
        ctrlKey: true,
        action: () => {
          console.log('Ctrl+E pressed - activating extra charges field')
          handleContextShortcut(
            refs.extraChargesInputRef, 
            'Extra charges input activated',
            () => toast.error('Extra charges input not available')
          )
        },
        description: 'Enter extra charges'
      },

      // Ctrl+R - Received cash
      {
        key: 'r',
        ctrlKey: true,
        action: () => handleContextShortcut(
          refs.receivedCashInputRef, 
          'Received cash input activated',
          () => toast.error('Received cash input not available')
        ),
        description: 'Enter received cash'
      },

      // Ctrl+V - Discard bill
      {
        key: 'v',
        ctrlKey: true,
        action: () => {
          console.log('Ctrl+V pressed - clicking discard button')
          if (refs.discardButtonRef.current) {
            refs.discardButtonRef.current.click()
            toast.info('Discard button clicked')
          } else {
            toast.error('Discard button not available')
          }
        },
        description: 'Click discard button'
      },

      // Ctrl+Shift+P - Complete bill
      {
        key: 'p',
        ctrlKey: true,
        shiftKey: true,
        action: () => {
          const transaction = sales.completeSale()
          if (transaction) {
            toast.success('Sale completed successfully')
            // Focus back to scanner after completion
            setTimeout(() => {
              smartFocus(refs.barcodeInputRef, 'Sale completed - scanner ready')
            }, 500)
          } else {
            toast.error('Cannot complete sale - cart is empty')
          }
        },
        description: 'Complete current sale'
      },

      // Ctrl+Shift+R - Reload screen
      {
        key: 'r',
        ctrlKey: true,
        shiftKey: true,
        action: () => {
          window.location.reload()
          toast.info('Screen reloaded')
        },
        description: 'Reload the screen'
      },

      // Ctrl+F2 - Add customer information
      {
        key: 'F2',
        ctrlKey: true,
        action: () => handleContextShortcut(
          refs.customerNameInputRef, 
          'Customer information input activated',
          () => toast.error('Customer input not available')
        ),
        description: 'Add customer information'
      },

      // Ctrl+W - Toggle wholesale mode
      {
        key: 'w',
        ctrlKey: true,
        action: () => {
          // Toggle wholesale mode - prices will be recalculated when inventory is available
          sales.toggleWholesale()
          const mode = sales.currentBill?.sale_type === 'wholesale' ? 'Wholesale' : 'Retail'
          toast.info(`${mode} mode activated`)
        },
        description: 'Toggle wholesale mode'
      },

      // Ctrl+N - Quick new bill (alternative to Ctrl+H)
      {
        key: 'n',
        ctrlKey: true,
        action: () => {
          sales.createNewBill()
          setTimeout(() => {
            smartFocus(refs.barcodeInputRef, 'New bill created - scanner ready')
          }, 100)
        },
        description: 'Quick new bill'
      },

      // Ctrl+Enter - Quick complete sale (alternative to Ctrl+Shift+P)
      {
        key: 'Enter',
        ctrlKey: true,
        action: () => {
          const transaction = sales.completeSale()
          if (transaction) {
            toast.success('Sale completed successfully')
            setTimeout(() => {
              smartFocus(refs.barcodeInputRef, 'Sale completed - scanner ready')
            }, 500)
          } else {
            toast.error('Cannot complete sale - cart is empty')
          }
        },
        description: 'Quick complete sale'
      },

      // Ctrl+Tab - Cycle through input fields
      {
        key: 'Tab',
        ctrlKey: true,
        action: () => {
          const fields = [
            { ref: refs.barcodeInputRef, name: 'Scanner' },
            { ref: refs.discountInputRef, name: 'Discount' },
            { ref: refs.extraChargesInputRef, name: 'Extra Charges' },
            { ref: refs.receivedCashInputRef, name: 'Received Cash' },
            { ref: refs.customerNameInputRef, name: 'Customer Name' }
          ]
          
          // Find current focused field
          const currentIndex = fields.findIndex(field => 
            field.ref.current === document.activeElement
          )
          
          // Focus next field
          const nextIndex = (currentIndex + 1) % fields.length
          const nextField = fields[nextIndex]
          
          if (smartFocus(nextField.ref, `${nextField.name} field activated`)) {
            // Success
          }
        },
        description: 'Cycle through input fields'
      }
    ]

    // Register all shortcuts
    shortcuts.forEach(shortcut => {
      registerShortcut(shortcut)
    })

    // Cleanup function
    return () => {
      shortcuts.forEach(shortcut => {
        const key = `${shortcut.ctrlKey ? 'ctrl+' : ''}${shortcut.shiftKey ? 'shift+' : ''}${shortcut.key.toLowerCase()}`
        unregisterShortcut(key)
      })
    }
  }, [registerShortcut, unregisterShortcut, sales, refs, handleContextShortcut, smartFocus])

  return refs
} 