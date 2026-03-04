import React, { createContext, useContext, useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  enabled?: boolean
}

interface KeyboardShortcutsContextType {
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (key: string) => void
  enableShortcut: (key: string) => void
  disableShortcut: (key: string) => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | null>(null)

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const shortcuts = React.useRef<Map<string, KeyboardShortcut>>(new Map())

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const key = `${shortcut.ctrlKey ? 'ctrl+' : ''}${shortcut.shiftKey ? 'shift+' : ''}${shortcut.altKey ? 'alt+' : ''}${shortcut.metaKey ? 'meta+' : ''}${shortcut.key.toLowerCase()}`
    shortcuts.current.set(key, shortcut)
    if (import.meta.env.DEV) {
      // console.log(`Registered keyboard shortcut: ${key} - ${shortcut.description}`)
    }
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    shortcuts.current.delete(key)
  }, [])

  const enableShortcut = useCallback((key: string) => {
    const shortcut = shortcuts.current.get(key)
    if (shortcut) {
      shortcut.enabled = true
    }
  }, [])

  const disableShortcut = useCallback((key: string) => {
    const shortcut = shortcuts.current.get(key)
    if (shortcut) {
      shortcut.enabled = false
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Allow certain shortcuts even when in input fields
      const allowInInput = ['Tab', 'Enter', 'Escape']
      const allowCtrlInInput = ['d', 'e', 'b', 'q', 'r', 'h', 'n', 'v', 'w', 'p'] // Sales shortcuts
      const isInInput = event.target instanceof HTMLInputElement || 
                       event.target instanceof HTMLTextAreaElement || 
                       event.target instanceof HTMLSelectElement
      
      // Block shortcuts in input fields unless they're specifically allowed
      if (isInInput && !allowInInput.includes(event.key) && 
          !(event.ctrlKey && allowCtrlInInput.includes(event.key.toLowerCase()))) {
        return
      }

      const key = `${event.ctrlKey ? 'ctrl+' : ''}${event.shiftKey ? 'shift+' : ''}${event.altKey ? 'alt+' : ''}${event.metaKey ? 'meta+' : ''}${event.key.toLowerCase()}`
      
      const shortcut = shortcuts.current.get(key)
      if (shortcut && shortcut.enabled !== false) {
        if (import.meta.env.DEV) {
          // console.log(`Executing keyboard shortcut: ${key} - ${shortcut.description}`)
        }
        event.preventDefault()
        shortcut.action()
      } else if (import.meta.env.DEV && event.ctrlKey) {
        console.log(`No shortcut found for: ${key}`)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <KeyboardShortcutsContext.Provider value={{
      registerShortcut,
      unregisterShortcut,
      enableShortcut,
      disableShortcut
    }}>
      {children}
    </KeyboardShortcutsContext.Provider>
  )
}

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext)
  if (!context) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider')
  }
  return context
} 