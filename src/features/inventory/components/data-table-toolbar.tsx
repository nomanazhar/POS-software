import React from 'react'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataTableViewOptions } from '../components/data-table-view-options'
import { useCategoryContext } from '@/features/categories/context/category-context'
import { useDebounce } from '@/hooks/use-debounce'
// import { Search } from '@/components/search'


interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const { categories } = useCategoryContext()
  const isFiltered = table.getState().columnFilters.length > 0
  const [open, setOpen] = React.useState(false)
  const [categorySearch, setCategorySearch] = React.useState('')

  // Debug: Log available columns
  React.useEffect(() => {
    const allColumns = table.getAllColumns()
    console.log('Inventory - Available columns:', allColumns.map(col => col.id))
    const categoryCol = table.getColumn('category_name')
    console.log('Inventory - Category column found:', !!categoryCol)
  }, [table])

  const [search, setSearch] = React.useState(table.getState().globalFilter || '')
  const debouncedSearch = useDebounce(search, 300)

  React.useEffect(() => {
    table.setGlobalFilter(debouncedSearch)
  }, [debouncedSearch, table])

  // Custom search handler for product/inventory UIDs or category
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
    // Example usage (if you want to filter data locally):
    // const results = searchByFields(data, event.target.value, ['product_unique_id', 'inventory_unique_id', 'category_name'])
  }

  // Safely get the category column with fallback
  const categoryColumn = table.getColumn('category_name')
  const currentCategory = categoryColumn?.getFilterValue() as string

  const filteredCategories = categories.filter(cat =>
    cat.category_name.toLowerCase().includes(categorySearch.toLowerCase())
  )

  return (
    <div className="h-[6%] flex items-center justify-between ">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search by product name, product UID, inventory UID, or category..."
          value={search}
          onChange={handleSearch}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {categoryColumn && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="h-8 w-[150px] justify-between"
              >
                {currentCategory || "All Categories"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput 
                  placeholder="Search categories..." 
                  value={categorySearch}
                  onValueChange={setCategorySearch}
                />
                <CommandList>
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        categoryColumn?.setFilterValue('')
                        setOpen(false)
                        setCategorySearch('')
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !currentCategory ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Categories
                    </CommandItem>
                    {filteredCategories.map((cat) => (
                      <CommandItem
                        key={cat.category_id}
                        value={cat.category_name}
                        onSelect={() => {
                          categoryColumn?.setFilterValue(cat.category_name)
                          setOpen(false)
                          setCategorySearch('')
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentCategory === cat.category_name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {cat.category_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
