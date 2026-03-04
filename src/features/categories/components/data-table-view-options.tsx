import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto hidden h-8 lg:flex">
          <MixerHorizontalIcon className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            // Get a more readable title from the column header if available
            let title = column.id; // Default to column ID
            
            if (column.columnDef.header) {
              if (typeof column.columnDef.header === 'string') {
                title = column.columnDef.header;
              } else if (column.columnDef.header && typeof column.columnDef.header === 'function') {
                // If it's a function, try to get the title from the context
                try {
                  const headerContext = { 
                    column, 
                    header: column.columnDef.header as any, 
                    table 
                  };
                  const headerResult = column.columnDef.header(headerContext);
                  if (typeof headerResult === 'string') {
                    title = headerResult;
                  }
                } catch (e) {
                  // Fallback to column ID if header function fails
                  title = column.id;
                }
              }
            }

            // Skip the select and actions columns from the dropdown
            if (column.id === 'select' || column.id === 'actions') return null;

            // Ensure title is a string and handle the formatting safely
            const safeTitle = String(title || column.id);
            
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {/* Convert snake_case to Title Case */}
                {safeTitle.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </DropdownMenuCheckboxItem>
            )
          })
          .filter(Boolean)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 