import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { IconKeyboard } from '@tabler/icons-react'
import { Separator } from './ui/separator'

const shortcuts = [
  { key: 'Ctrl + S', description: 'Toggle sidebar' },
  { key: 'Ctrl + K', description: 'Open search/command menu' },
  { key: 'Ctrl + B', description: 'Activate barcode scanner' },
  { key: 'Ctrl + D', description: 'Jump to discount field' },
  { key: 'Ctrl + H', description: 'Create new bill' },
  { key: 'Ctrl + N', description: 'Quick new bill' },
  { key: 'Ctrl + Q', description: 'Enter quantity' },
  { key: 'Ctrl + E', description: 'Enter extra charges' },
  { key: 'Ctrl + R', description: 'Enter received cash' },
  { key: 'Ctrl + V', description: 'Discard bill' },
  { key: 'Ctrl + Enter', description: 'Quick complete sale' },
  { key: 'Ctrl + Shift + P', description: 'Complete sale' },
  { key: 'Ctrl + Shift + R', description: 'Reload screen' },
  { key: 'Ctrl + F2', description: 'Add customer information' },
  { key: 'Ctrl + W', description: 'Toggle wholesale mode' },
  { key: 'Ctrl + Tab', description: 'Cycle through input fields' },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <IconKeyboard className="h-3 w-3" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <Separator />
        <div className="space-y-2 p-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex justify-between items-center">
              <span className="text-sm text-gray-500 font-semibold">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                {shortcut.key}
              </kbd>
              
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
} 