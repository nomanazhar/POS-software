import React from 'react'
import { CommandMenu } from '@/components/command-menu'
import { useKeyboardShortcuts } from './keyboard-shortcuts-context'

interface SearchContextType {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const SearchContext = React.createContext<SearchContextType | null>(null)

interface Props {
  children: React.ReactNode
}

export function SearchProvider({ children }: Props) {
  const [open, setOpen] = React.useState(false)
  const { registerShortcut } = useKeyboardShortcuts()

  React.useEffect(() => {
    registerShortcut({
      key: 'k',
      ctrlKey: true,
      action: () => setOpen((open) => !open),
      description: 'Open search/command menu'
    })
  }, [registerShortcut])

  return (
    <SearchContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandMenu />
    </SearchContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSearch = () => {
  const searchContext = React.useContext(SearchContext)

  if (!searchContext) {
    throw new Error('useSearch has to be used within <SearchContext.Provider>')
  }

  return searchContext
}
