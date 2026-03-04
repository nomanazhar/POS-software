import { useEffect } from 'react'
import { useKeyboardShortcuts } from '@/context/keyboard-shortcuts-context'
import { useSidebar } from '@/components/ui/sidebar'
import { toast } from 'sonner'

export function GlobalKeyboardShortcuts() {
  const { registerShortcut } = useKeyboardShortcuts()
  const { toggleSidebar } = useSidebar()

  useEffect(() => {
    // Ctrl+S - Toggle sidebar
    registerShortcut({
      key: 's',
      ctrlKey: true,
      action: () => {
        toggleSidebar()
        toast.info('Sidebar toggled')
      },
      description: 'Toggle sidebar'
    })

  }, [registerShortcut, toggleSidebar])

  return null
} 