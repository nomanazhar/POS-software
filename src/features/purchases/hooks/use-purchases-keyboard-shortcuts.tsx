import { useEffect, useRef } from 'react'
import { useKeyboardShortcuts } from '@/context/keyboard-shortcuts-context'
import { toast } from 'sonner'

export function usePurchasesKeyboardShortcuts() {
  const { registerShortcut } = useKeyboardShortcuts()
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Ctrl+B - Activate barcode scanner for purchases
    registerShortcut({
      key: 'b',
      ctrlKey: true,
      action: () => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus()
          toast.info('Purchase barcode scanner activated')
        }
      },
      description: 'Activate purchase barcode scanner'
    })

  }, [registerShortcut])

  return {
    barcodeInputRef
  }
} 