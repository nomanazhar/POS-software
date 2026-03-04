import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Check /* , ChevronsUpDown */ } from 'lucide-react'
/* import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip' */
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { productSchema, Product } from '../data/schema'
import { useProductContext } from '../context/product-context'
import { toast } from 'sonner'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { IconBarcode, IconSearch, IconCheck, IconX, IconTrash, IconPlus, IconSettings, IconChevronDown } from '@tabler/icons-react'
import { useCategoryContext } from '@/features/categories/context/category-context'
import { CategoryMutateDrawer } from '@/features/categories/components/category-mutate-drawer'
/* import { BulkStatusToggle } from './bulk-status-toggle' */
import { BulkReturnableToggle } from './bulk-returnable-toggle'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore';
import { generateId } from '@/lib/utils'
import { searchByFields } from '@/lib/utils'
import { eventEmitter } from '@/lib/event-emitter'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProduct?: Product
  isDelete?: boolean
  onProductCreated?: (product: Product) => void
  defaultBarcode?: string | null
}

type ProductForm = z.infer<typeof productSchema>

interface BulkProductItem extends Product {
  tempId: string
  isNew?: boolean
  _modifiedFields?: (keyof Product)[]
  categorySearch?: string
  categoryDropdownOpen?: boolean
  brandSearch?: string
  brandDropdownOpen?: boolean
  selectedBrandIndex?: number
}

export function ProductsMutateDrawer({ open, onOpenChange, currentProduct, isDelete, onProductCreated, defaultBarcode }: Props) {
  const isUpdate = !!currentProduct && !isDelete
  const [barcodeInput, setBarcodeInput] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [bulkItems, setBulkItems] = useState<BulkProductItem[]>([])
  const [lastScanned, setLastScanned] = useState<{ success: boolean; message: string, barcode: string | null } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [modifiedFields, setModifiedFields] = useState<Set<keyof Product>>(new Set())
  const productNameRefs = useRef<{ [tempId: string]: HTMLInputElement | null }>({})
  const brandInputRefs = useRef<{ [tempId: string]: HTMLInputElement | null }>({})
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null)
  
  const user = useAuthStore((s) => s.auth.user);
  
  const form = useForm<ProductForm>({
    defaultValues: {
      product_id: 0,
      product_unique_id: generateId('PROD'),
      product_name: '',
      barcode: defaultBarcode || '',
      brand: '',
      category_unique_id: '',
      retail_price: 0,
      wholesale_price: 0,
      purchase_price: 0,
      alertqty: 0,
      tax: 0,
      discount: 0,
      status: 'active',
      returnable: 0,
      added_by: user?.added_By || user?.id ? String(user.id) : 'admin',
      company_id: user?.company_id || user?.companyId ? String(user.companyId) : '1',
      branch_id: user?.branch_id || user?.branchId ? String(user.branchId) : '1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  })

  // Update form values when currentProduct changes
  useEffect(() => {
    if (currentProduct) {
      form.reset({
        ...currentProduct,
        // Ensure dates are properly formatted
        created_at: currentProduct.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      // Set category name if category_unique_id exists
      if (currentProduct.category_unique_id && categories) {
        const category = categories.find(cat => cat.category_unique_id === currentProduct.category_unique_id);
        if (category) {
          setSelectedCategoryName(category.category_name || '');
        }
      }
    } else {
      // Reset form with default values for new product
      form.reset({
        product_id: 0,
        product_unique_id: generateId('PROD'),
        product_name: '',
        barcode: defaultBarcode || '',
        brand: '',
        category_unique_id: '',
        retail_price: 0,
        wholesale_price: 0,
        purchase_price: 0,
        alertqty: 0,
        tax: 0,
        discount: 0,
        status: 'active',
        returnable: 0,
        added_by: user?.added_By || user?.id ? String(user.id) : 'admin',
        company_id: user?.company_id || user?.companyId ? String(user.companyId) : '1',
        branch_id: user?.branch_id || user?.branchId ? String(user.branchId) : '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setSelectedCategoryName('');
    }
  }, [currentProduct, defaultBarcode, user, form.reset]);
  
  const { addProduct, updateProduct, deleteProduct, products } = useProductContext()

  const { categories } = useCategoryContext()
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(-1)
  
  // Brand dropdown state is managed per item in bulkItems



  // Listen for newly created categories and auto-select them (fallback)
  useEffect(() => {
    const handleCategoryAdded = (newCategory: any) => {
      if (newCategory && newCategory.category_unique_id) {
        form.setValue('category_unique_id', newCategory.category_unique_id)
        setSelectedCategoryName(newCategory.category_name)
        toast.success(`Category "${newCategory.category_name}" added and selected!`)
        // Close the category drawer
        setCategoryDrawerOpen(false)
      }
    }

    eventEmitter.on('categories:added', handleCategoryAdded)
    
    return () => {
      eventEmitter.off('categories:added', handleCategoryAdded)
    }
  }, [form])

  // Track field modifications
  const handleFieldChange = (fieldName: keyof Product, value: any) => {
    setModifiedFields(prev => new Set([...prev, fieldName]))
    return value
  }

  // Reset modified fields when form opens/closes
  useEffect(() => {
    if (!open) {
      setModifiedFields(new Set())
      // Reset category search states
      setCategorySearch('')
      setSelectedCategoryName('')
      setCategoryDropdownOpen(false)
      setSelectedCategoryIndex(-1)
    } else if (open && currentProduct?.category_unique_id) {
      // Set selected category name when editing existing product
      const category = categories.find(cat => cat.category_unique_id === currentProduct.category_unique_id)
      if (category) {
        setSelectedCategoryName(category.category_name)
      }
    }
  }, [open, currentProduct, categories])

  // Set default barcode when drawer opens with one
  useEffect(() => {
    if (open && defaultBarcode) {
      form.setValue('barcode', defaultBarcode);
      setBarcodeInput(defaultBarcode); // Also set barcodeInput state for the search field
      
      // Ensure focus is set after the barcode is populated
      const focusTimer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Optionally select the text for easy editing
        }
      }, 100);
      
      // Auto-trigger barcode submission after a short delay
      const submitTimer = setTimeout(() => {
        handleBarcodeSubmit(defaultBarcode);
      }, 300);
      
      return () => {
        clearTimeout(focusTimer);
        clearTimeout(submitTimer);
      };
    } else if (!open) {
      // Clear default barcode when closing
      form.setValue('barcode', '');
      setBarcodeInput('');
    }
  }, [open, defaultBarcode, form])

  // Get most used categories (categories with most products)
  const mostUsedCategories = useMemo(() => {
    const categoryUsage = new Map<string, number>()
    
    // Count products per category
    products.forEach(product => {
      if (product.category_unique_id) {
        categoryUsage.set(product.category_unique_id, (categoryUsage.get(product.category_unique_id) || 0) + 1)
      }
    })
    
    // Sort categories by usage and get top 3
    return categories
      .filter(cat => cat.category_unique_id && categoryUsage.has(cat.category_unique_id))
      .sort((a, b) => {
        const aUsage = categoryUsage.get(a.category_unique_id || '') || 0
        const bUsage = categoryUsage.get(b.category_unique_id || '') || 0
        return bUsage - aUsage
      })
      .slice(0, 3)
  }, [categories, products])

  // Filtered categories for dropdown
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      // Show most used categories when no search
      return mostUsedCategories
    }
    return categories.filter(cat =>
      cat.category_name.toLowerCase().includes(categorySearch.toLowerCase())
    )
  }, [categorySearch, categories, mostUsedCategories])

  // Handle category selection from dropdown
  const handleCategorySelect = (category: any) => {
    setSelectedCategoryName(category.category_name)
    setCategorySearch('')
    setCategoryDropdownOpen(false)
    setSelectedCategoryIndex(-1)
    form.setValue('category_unique_id', category.category_unique_id || '')
  }

  // // Handle category input change
  // const handleCategoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value
  //   setCategorySearch(value)
  //   setSelectedCategoryName('')
  //   setSelectedCategoryIndex(-1)
  //   setCategoryDropdownOpen(true)
    
  //   // Clear form values if user is typing
  //   if (!value.trim()) {
  //     form.setValue('category_unique_id', '')
  //   }
  // }

  // // Handle category input focus
  // const handleCategoryInputFocus = () => {
  //   setCategoryDropdownOpen(true)
  //   setSelectedCategoryIndex(-1)
  // }

  // // Handle category input blur
  // const handleCategoryInputBlur = () => {
  //   setTimeout(() => {
  //     setCategoryDropdownOpen(false)
  //     setSelectedCategoryIndex(-1)
  //     // If no category is selected and there's search text, clear it
  //     if (!selectedCategoryName && categorySearch) {
  //       setCategorySearch('')
  //     }
  //   }, 200)
  // }

  // Handle keyboard navigation
  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!categoryDropdownOpen || filteredCategories.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedCategoryIndex(prev => 
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedCategoryIndex(prev => 
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedCategoryIndex >= 0 && selectedCategoryIndex < filteredCategories.length) {
          handleCategorySelect(filteredCategories[selectedCategoryIndex])
        }
        break
      case 'Escape':
        setCategoryDropdownOpen(false)
        setSelectedCategoryIndex(-1)
        break
    }
  }

 
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>()
    // Add brands from existing products
    products.forEach(product => {
      if (product.brand && product.brand.trim()) {
        brands.add(product.brand.trim())
      }
    })
    // Add brands from bulk items
    bulkItems.forEach(item => {
      if (item.brand && item.brand.trim()) {
        brands.add(item.brand.trim())
      }
    })
    const result = Array.from(brands).sort()
    return result
  }, [products, bulkItems])

  // Filtered brands for dropdown
  /* const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return [];
    return uniqueBrands.filter(brand =>
      brand.toLowerCase().includes(brandSearch.toLowerCase())
    )
  }, [brandSearch, uniqueBrands]) */

  // Brand dropdown state is managed per item in bulkItems

  // Handle click outside to close brand dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if click is outside both the input and dropdown
      const isOutsideInput = !target.closest('input[placeholder="Enter brand name..."]')
      const isOutsideDropdown = !target.closest('.brand-dropdown')
      
      if (isOutsideInput && isOutsideDropdown) {
        setBulkItems(prev => prev.map(item => ({
          ...item,
          brandDropdownOpen: false
        })))
        setDropdownPosition(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-focus on input when component mounts or when defaultBarcode is set
  useEffect(() => {
    if (open && inputRef.current) {
      // Add a small delay to ensure the drawer is fully rendered and defaultBarcode is processed
      const focusTimer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
      
      return () => clearTimeout(focusTimer);
    }
  }, [open, defaultBarcode])

  // Keyboard shortcut to focus barcode input (Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
         
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open]);

  // Reset form when opening/closing
  useEffect(() => {
    if (!open) {
      setBulkItems([])
      setBarcodeInput('')
      setSearchResults([])
      setLastScanned(null)
      form.reset()
      // Brand dropdown state is managed per item
    }
  }, [open, form])



  const handleSearch = (query: string) => {
    setSearchResults(
      searchByFields(products, query, ['product_name', 'barcode']).map(p => ({
        ...p,
        // Ensure all Product properties are present
        product_id: p.product_id,
        product_unique_id: p.product_unique_id || generateId('PROD'),
        product_name: p.product_name || '',
        barcode: p.barcode || '',
        brand: p.brand || '',
        category_unique_id: p.category_unique_id || '',
        retail_price: p.retail_price ?? 0,
        wholesale_price: p.wholesale_price ?? 0,
        purchase_price: p.purchase_price ?? 0,
        alertqty: p.alertqty ?? 0,
        tax: p.tax ?? 0,
        discount: p.discount ?? 0,
        status: p.status ?? 'active',
        returnable: p.returnable ?? 0,
        added_by: p.added_by || user?.id?.toString() || 'system',
        company_id: p.company_id || user?.companyId?.toString() || '1',
        branch_id: p.branch_id || user?.branchId?.toString() || '1',
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      }))
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBarcodeInput(value)
    handleSearch(value)
  }

  const handleBarcodeSubmit = (barcode: string) => {
    if (!barcode.trim()) return

    // Check if product already exists in bulk items
    const existingItem = bulkItems.find(item => item.barcode === barcode)
    if (existingItem) {
      setLastScanned({ success: false, message: 'Quantity increased', barcode })
      setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
      if (inputRef.current) inputRef.current.focus();
      return
    }

    const product = products.find(p => p.barcode === barcode)
    if (product) {
      // Add existing product to bulk items with pre-filled details
      const newItem: BulkProductItem = {
        ...product,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        isNew: false, // Existing product, not new
        _modifiedFields: [],
        categorySearch: '', // Initialize category search field
        categoryDropdownOpen: false, // Initialize dropdown state
        brandSearch: '', // Initialize brand search field
        brandDropdownOpen: false, // Initialize brand dropdown state
        selectedBrandIndex: 0, // Initialize selected brand index
      }
      setBulkItems(prev => [...prev, newItem])
      setLastScanned({ success: true, message: 'Product added to list', barcode })
      setBarcodeInput('')
      setSearchResults([])
      setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
      if (inputRef.current) inputRef.current.focus();
    } else {
      // Generate next sequential product_id (numeric, no prefix)
      const allProductIds = [
        ...products.map(p => p.product_id).filter(n => typeof n === 'number'),
        ...bulkItems.map(b => b.product_id).filter(n => typeof n === 'number')
      ];
      const nextProductId = allProductIds.length > 0 ? Math.max(...allProductIds) + 1 : 1;
      // Create new product with the barcode
      const currentUser = useAuthStore.getState().auth.user;
      const newItem: BulkProductItem = {
        product_id: nextProductId,
        product_unique_id: `${currentUser?.companyId || '1'}_${currentUser?.branchId || '1'}_${Date.now()}`,
        product_name: '',
        barcode: barcode,
        brand: '',
        category_unique_id: '',
        retail_price: 0,
        wholesale_price: 0,
        purchase_price: 0,
        alertqty: 10,
        tax: 0,
        discount: 0,
        status: 'active',
        returnable: 0,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        isNew: true,
        added_by: currentUser?.id ? String(currentUser.id) : 'system',
        company_id: currentUser?.companyId ? String(currentUser.companyId) : '1',
        branch_id: currentUser?.branchId ? String(currentUser.branchId) : '1',
        _modifiedFields: [],
        categorySearch: '', // Initialize category search field
        categoryDropdownOpen: false, // Initialize dropdown state
        brandSearch: '', // Initialize brand search field
        brandDropdownOpen: false, // Initialize brand dropdown state
        selectedBrandIndex: 0, // Initialize selected brand index
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setBulkItems(prev => [...prev, newItem])
      setLastScanned({ success: true, message: 'New product created with barcode', barcode })
      setBarcodeInput('')
      setSearchResults([])
      // Focus on the product name field after a short delay to allow the DOM to update
      setTimeout(() => {
        const productNameInput = productNameRefs.current[newItem.tempId]
        if (productNameInput) {
          productNameInput.focus()
        }
      }, 100)
      setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
    }
  }

  const handleAddProductToBulk = (product: Product) => {
    // Check if product already exists in bulk items
    const existingItem = bulkItems.find(item => item.barcode === product.barcode)
    if (existingItem) {
      setLastScanned({ success: false, message: 'Product already in list', barcode: product.barcode })
      setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
      return
    }

    // Add product to bulk items with pre-filled details
    const newItem: BulkProductItem = {
      ...product,
      tempId: `temp-${Date.now()}-${Math.random()}`,
      isNew: false, // Existing product, not new
      _modifiedFields: [],
      categorySearch: '', // Initialize category search field
      categoryDropdownOpen: false, // Initialize dropdown state
      brandSearch: '', // Initialize brand search field
      brandDropdownOpen: false, // Initialize brand dropdown state
      selectedBrandIndex: 0, // Initialize selected brand index
    }
    setBulkItems(prev => [...prev, newItem])
    setBarcodeInput('')
    setSearchResults([])
    setLastScanned({ success: true, message: `${product.product_name} added to list`, barcode: product.barcode })
    setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        handleAddProductToBulk(searchResults[0])
        setBarcodeInput('')
      } else if (barcodeInput.trim()) {
        handleBarcodeSubmit(barcodeInput)
        setBarcodeInput('')
      }
    }
  }

  const handleBulkItemChange = (tempId: string, field: keyof Product | 'categorySearch' | 'categoryDropdownOpen' | 'brandSearch' | 'brandDropdownOpen' | 'selectedBrandIndex', value: string | number | boolean) => {
    setBulkItems(prev => prev.map(item => 
      item.tempId === tempId 
        ? { 
            ...item, 
            [field]: value,
            // Track that this field was modified (only for Product fields)
            _modifiedFields: field in item ? [...(item._modifiedFields || []), field as keyof Product] : (item._modifiedFields || [])
          }
        : item
    ))
  }

  const handleRemoveBulkItem = (tempId: string) => {
    setBulkItems(prev => prev.filter(item => item.tempId !== tempId))
    // Clean up the ref for the removed item
    delete productNameRefs.current[tempId]
  }

  /* const handleBulkStatusChange = (productId: number | undefined, newStatus: 'active' | 'inactive') => {
    setBulkItems(prev => prev.map(item => 
      item.product_id === productId 
        ? { 
            ...item, 
            status: newStatus,
            _modifiedFields: [...(item._modifiedFields || []), 'status']
          }
        : item
    ))
  } */

  const handleBulkReturnableChange = (productId: number | undefined, newReturnable: number) => {
    setBulkItems(prev => prev.map(item => 
      item.product_id === productId 
        ? { 
            ...item, 
            returnable: newReturnable,
            _modifiedFields: [...(item._modifiedFields || []), 'returnable']
          }
        : item
    ))
  }

  // Helper function to check if a row is valid (has all required fields)
  const isRowValid = (item: BulkProductItem) => {
    return (
      item.product_name && 
      item.product_name.trim() !== '' && 
      item.brand && 
      item.brand.trim() !== '' && 
      item.category_unique_id && 
      item.category_unique_id.trim() !== ''
    )
  }

  // Get validation status for the submit button
  const canSubmit = bulkItems.length > 0 && bulkItems.every(isRowValid)

  const handleBulkSubmit = async () => {
    try {
      // Validate required fields before processing
      const validationErrors: string[] = []
      
      bulkItems.forEach((item, index) => {
        const rowNumber = index + 1
        const errors: string[] = []
        
        if (!item.product_name || item.product_name.trim() === '') {
          errors.push('Product name is required')
        }
        
        if (!item.brand || item.brand.trim() === '') {
          errors.push('Brand is required')
        }
        
        if (!item.category_unique_id || item.category_unique_id.trim() === '') {
          errors.push('Category is required')
        }
        
        if (errors.length > 0) {
          validationErrors.push(`Row ${rowNumber} (${item.barcode || 'No barcode'}): ${errors.join(', ')}`)
        }
      })
      
      if (validationErrors.length > 0) {
        toast.error(`Please fix the following errors:\n${validationErrors.join('\n')}`, {
          duration: 5000,
          description: 'All products must have name, brand, and category selected'
        })
        return
      }
      
      // Validate all items with proper transformation
      const validItems = bulkItems
        .map(item => {
          try {
            // Transform bulk item data to match Zod schema
            const transformedItem: Product = {
              ...item,
              // Ensure correct types and provide defaults for missing fields
              product_id: item.product_id,
              product_unique_id: item.product_unique_id || generateId('PROD'),
              product_name: item.product_name || '',
              barcode: item.barcode || '',
              brand: item.brand || '',
              category_unique_id: item.category_unique_id || '',
              retail_price: item.retail_price ?? 0,
              wholesale_price: item.wholesale_price ?? 0,
              purchase_price: item.purchase_price ?? 0,
              alertqty: item.alertqty ?? 0,
              tax: item.tax ?? 0,
              discount: item.discount ?? 0,
              status: item.status || 'active',
              returnable: item.returnable ?? 0,
              added_by: user?.id ? String(user.id) : 'system',
              company_id: user?.companyId ? String(user.companyId) : '1',
              branch_id: user?.branchId ? String(user.branchId) : '1',
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
              _modifiedFields: item._modifiedFields || [], // Include _modifiedFields
            };
            // Validate with Zod schema
            return productSchema.parse(transformedItem)
          } catch (error) {
            console.error('Invalid bulk item:', item, error)
            return null
          }
        })
        .filter((item): item is Product => item !== null)

      if (validItems.length === 0) {
        toast.error('Please add at least one valid product')
        return
      }

      let added = 0
      let updated = 0

      // Process items sequentially to avoid race conditions
      for (const item of validItems) {
        const existing = products.find(p => p.barcode === item.barcode)
        if (existing) {
          // Use the context function which will handle proper merging
          if (existing.product_id) {
            await updateProduct(existing.product_id, {
            ...item,
            product_id: existing.product_id, // Include product_id for updates
            product_unique_id: existing.product_unique_id, // Use existing product_unique_id
            created_at: existing.created_at,
            updated_at: new Date().toISOString(), // Update timestamp
          } as Product)
          }
          updated++
        } else {
          // Use the context function for new products
          await addProduct(item as Product)
          added++
        }
      }
      setBarcodeInput('')
      toast.success(`${added} products added, ${updated} updated!`, { duration: 1000 })
      onOpenChange(false)
    } catch (error) {
      console.error('Bulk submit error:', error)
      toast.error('Failed to process items. Please check your data and try again.')
    }
  }

  // Custom barcode generator logic
  const handleGenerateCustomBarcode = () => {
    // Find all products and bulkItems with barcodes starting with 'MART-'
    const allMartBarcodes = [
      ...products.map(p => p.barcode),
      ...bulkItems.map(b => b.barcode)
    ].filter(bc => /^MART-\d{3}$/.test(bc));
    // Extract numbers
    const numbers = allMartBarcodes.map(bc => parseInt(bc.replace('MART-', ''), 10)).filter(n => !isNaN(n));
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const nextBarcode = `MART-${String(nextNumber).padStart(3, '0')}`;
    // Prevent duplicate
    if (allMartBarcodes.includes(nextBarcode)) {
      toast.error('Barcode already exists!');
      return;
    }
    // Generate next sequential product_id (numeric, no prefix)
    const allProductIds = [
      ...products.map(p => p.product_id).filter(n => typeof n === 'number'),
      ...bulkItems.map(b => b.product_id).filter(n => typeof n === 'number')
    ];
    const nextProductId = allProductIds.length > 0 ? Math.max(...allProductIds) + 1 : 1;
    // Create new product with the custom barcode
    const user = useAuthStore.getState().auth.user;
    const newItem: BulkProductItem = {
      product_id: nextProductId,
      product_unique_id: `${user?.companyId || '1'}_${user?.branchId || '1'}_${Date.now()}`,
      product_name: '',
      barcode: nextBarcode,
      brand: '',
      category_unique_id: '',
      retail_price: 0,
      wholesale_price: 0,
        purchase_price: 0,
        alertqty: 10,
        tax: 0,
        discount: 0,
        status: 'active',
        returnable: 0,
        tempId: `temp-${Date.now()}-${Math.random()}`,
        isNew: true,
        added_by: user?.id ? String(user.id) : 'system',
        company_id: user?.companyId ? String(user.companyId) : '1',
        branch_id: user?.branchId ? String(user.branchId) : '1',
        _modifiedFields: [],
        categorySearch: '', // Initialize category search field
        categoryDropdownOpen: false, // Initialize dropdown state
        brandSearch: '', // Initialize brand search field
        brandDropdownOpen: false, // Initialize brand dropdown state
        selectedBrandIndex: 0, // Initialize selected brand index
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    setBulkItems(prev => [...prev, newItem]);
    setLastScanned({ success: true, message: `Custom barcode ${nextBarcode} generated and added!`, barcode: nextBarcode });
    setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000);
  };

  // For single item update/delete, use the original form
  if (isUpdate || isDelete) {
    const onSubmit = async (data: ProductForm) => {
      try {
        // Validate the data with Zod schema
        const validatedData = productSchema.parse(data);

        if (isDelete && currentProduct) {
          if (currentProduct.product_id) {
            deleteProduct(currentProduct.product_id);
          }
        } else if (isUpdate && currentProduct) {
          if (currentProduct.product_id) {
            await updateProduct(currentProduct.product_id, {
              ...validatedData,
              _modifiedFields: Array.from(modifiedFields),
            });
          }
        } else {
          const newProduct = {
            ...validatedData,
            _modifiedFields: Array.from(modifiedFields),
          };
          await addProduct(newProduct);
          toast.success('Product added!', { duration: 1000 });
          
          // Call the callback if provided (for purchase drawer integration)
          if (onProductCreated) {
            onProductCreated(newProduct);
          }
        }
        setBarcodeInput('');
        onOpenChange(false);
        form.reset();
      } catch (error) {
        console.error('Form validation error:', error);
        toast.error('Please check your input data and try again.');
      }
    };

    return (
      <Sheet
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v)
          form.reset()
        }}
      >
        <SheetContent className='flex flex-col max-h-screen overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-800 ease-out'>
          <SheetHeader className='text-left'>
            <SheetTitle>{isDelete ? 'Delete' : 'Update'} Product</SheetTitle>
           
          </SheetHeader>
          <Form {...form}>
            <form
              id='product-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='flex-1 space-y-2 px-4'
              autoComplete='off'
            >

              <FormField
                control={form.control}
                name='barcode'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Enter a barcode' value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='product_name'
                render={({ field }) => (
                  <FormItem className='space-y-1 w-[10vw]'>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Enter a product name' value={field.value ?? ''}  />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='brand'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Brand <span className='text-xs text-muted-foreground'>(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Enter brand name' value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name='category_unique_id'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Popover 
                            open={categoryDropdownOpen} 
                            onOpenChange={setCategoryDropdownOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={categoryDropdownOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value ? "text-muted-foreground" : ""
                                )}
                              >
                                {selectedCategoryName || "Select category..."}
                                <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search category..."
                                  value={categorySearch}
                                  onValueChange={setCategorySearch}
                                  onKeyDown={handleCategoryKeyDown}
                                />
                                <CommandList>
                                  <CommandEmpty>No category found.</CommandEmpty>
                                  <CommandGroup>
                                    {categories
                                      .filter(cat => 
                                        cat.category_name.toLowerCase().includes(categorySearch.toLowerCase())
                                      )
                                      .map((cat) => (
                                        <CommandItem
                                          key={cat.category_id}
                                          value={cat.category_name}
                                          onSelect={() => {
                                            form.setValue('category_unique_id', cat.category_unique_id || '');
                                            setSelectedCategoryName(cat.category_name || '');
                                            setCategoryDropdownOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === cat.category_unique_id ? "opacity-100" : "opacity-0"
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
                        </div>
                        <Button
                          type="button"
                          onClick={() => setCategoryDrawerOpen(true)}
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 bg-green-500"
                        >
                          <IconPlus className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='retail_price'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Retail Price {isUpdate && <span className='text-xs text-muted-foreground'>( replace existing)</span>}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type='number' 
                        placeholder='Enter retail price' 
                        value={field.value ?? 0}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                          handleFieldChange('retail_price', Number(e.target.value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='wholesale_price'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Wholesale Price {isUpdate && <span className='text-xs text-muted-foreground'>( replace existing)</span>}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type='number' 
                        placeholder='Enter wholesale rate' 
                        value={field.value ?? 0}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                          handleFieldChange('wholesale_price', Number(e.target.value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='purchase_price'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Purchase Price {isUpdate && <span className='text-xs text-muted-foreground'>( replace existing)</span>}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type='number' 
                        placeholder='Enter purchase price' 
                        value={field.value ?? 0}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                          handleFieldChange('purchase_price', Number(e.target.value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name='alertqty'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel>Alert Quantity {isUpdate && <span className='text-xs text-muted-foreground'>( replace existing)</span>}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type='number' 
                        placeholder='Enter alert quantity' 
                        value={field.value ?? 0}
                        onChange={(e) => {
                          field.onChange(Number(e.target.value))
                          handleFieldChange('alertqty', Number(e.target.value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='tax'
                  render={({ field }) => (
                    <FormItem className='space-y-1'>
                      <FormLabel>Tax</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type='number' 
                          placeholder='Enter tax amount' 
                          value={field.value ?? 0}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value))
                            handleFieldChange('tax', Number(e.target.value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='discount'
                  render={({ field }) => (
                    <FormItem className='space-y-1'>
                      <FormLabel>Discount</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type='number' 
                          placeholder='Enter discount amount' 
                          value={field.value ?? 0}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value))
                            handleFieldChange('discount', Number(e.target.value))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
             
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='status'
                  render={({ field }) => (
                    <FormItem className='space-y-1'>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='returnable'
                  render={({ field }) => (
                    <FormItem className='space-y-1'>
                      <FormLabel>Returnable</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={Boolean(field.value)}
                            onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {field.value ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
          <SheetFooter className='gap-2'>
            <SheetClose asChild>
              <Button variant='outline'>Close</Button>
            </SheetClose>
            <Button form='product-form' type='submit'>
              {isDelete ? 'Delete' : 'Update'} Product
            </Button>
          </SheetFooter>
        </SheetContent>

        {/* Add this component at the bottom of your JSX */}
        <CategoryMutateDrawer
          open={categoryDrawerOpen}
          onOpenChange={setCategoryDrawerOpen}
          // onCategoryAdded={(newCategory) => {
          //   if (newCategory && newCategory.category_unique_id) {
          //     form.setValue('category_unique_id', newCategory.category_unique_id);
          //     setSelectedCategoryName(newCategory.category_name || '');
          //     setCategoryDrawerOpen(false);
          //     toast.success(`Category "${newCategory.category_name}" added and selected!`);
          //   }
          // }}
          isEdit={false }
        />
       </Sheet>
    )
  }

  // Bulk product entry interface
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        setBulkItems([])
        setBarcodeInput('')
        setSearchResults([])
        setLastScanned(null)
      }}
    >
      <SheetContent fullscreen className=' w-screen max-w-screen h-[80vh] max-h-[80vh] rounded-lg border shadow-lg p-2 m-0 flex flex-col overflow-hidden bg-background z-50 fixed top-[20vh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-500 ease-out'>
        <div className="relative flex flex-col h-full w-full">
          <SheetHeader className='text-left sticky top-0 z-10 bg-muted border-b h-auto min-h-[10vh] p-2'>
            <div className="flex  gap-3">
              <div className='w-[45%] '>
                <SheetTitle>Add New Products</SheetTitle>
                <SheetDescription>
                  Scan barcodes to add new products to the list, then fill in the details and add all to products.
                </SheetDescription>
              </div>
              
              {/* Validation Summary in Header */}
              {bulkItems.length > 0 && (
                <span className="w-[50%] flex items-center justify-between text-sm bg-background/50 p-3 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">Validation Status:</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        canSubmit 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {canSubmit ? 'Ready to Submit' : 'Validation Required'}
                      </span>
                      <span className="text-muted-foreground">
                        {bulkItems.filter(isRowValid).length} of {bulkItems.length} products ready
                      </span>
                    </div>
                  </div>
                  {!canSubmit && (
                    <div className="text-orange-600 text-xs">
                      Required fields: Product Name, Brand, Category
                    </div>
                  )}
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Close button absolutely positioned in top right */}
          <SheetClose asChild>
            <button
              type="button"
              className="absolute top-4 right-4 z-20 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none bg-background p-1"
              aria-label="Close"
            >
              <IconX className="h-5 w-5" />
            </button>
          </SheetClose>

          <div className='flex-1 flex flex-col overflow-hidden'>
            {/* Barcode Scanner */}
            <Card className="w-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    defaultBarcode ? 'bg-blue-100' : 'bg-green-100'
                  }`} title={defaultBarcode ? 'Barcode pre-filled - Ready to edit' : 'Scanner active - Ready to scan'}>
                    <IconBarcode className={`h-4 w-4 ${
                      defaultBarcode ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1 relative">
                    <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      autoFocus
                      placeholder="Scan barcode or type product name..."
                      value={barcodeInput}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      className="pl-10 pr-4 h-9 text-sm"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map(product => (
                          <div key={product.product_id} className="flex items-center justify-between p-2 hover:bg-muted">
                            <div>
                              <p className="font-medium">{product.product_name}</p>
                              <p className="text-sm text-muted-foreground">Barcode: {product.barcode}</p>
                            </div>
                            <Button size="sm" onClick={() => handleAddProductToBulk(product)}>
                              Add to List
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Custom Barcode Generator Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="flex items-center gap-1 h-9"
                    onClick={handleGenerateCustomBarcode}
                    title="Generate Custom Barcode"
                  >
                    <IconSettings className="h-4 w-4" />
                    Generate Barcode
                  </Button>
                </div>
                {/* Status Message */}
                {defaultBarcode && !lastScanned && (
                  <div className="mt-3 p-2 rounded border transition-all duration-300 bg-blue-50 border-blue-200 text-blue-800">
                    <div className="flex items-center gap-2">
                      <IconBarcode className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium">Barcode pre-filled: {defaultBarcode}</span>
                    </div>
                  </div>
                )}
                {lastScanned && lastScanned.message && (
                  <div className={`mt-3 p-2 rounded border transition-all duration-300 ${
                    lastScanned.success 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {lastScanned.success ? (
                        <IconCheck className="h-3 w-3 text-green-600" />
                      ) : (
                        <IconX className="h-3 w-3 text-red-600" />
                      )}
                      <span className="text-xs font-medium">{lastScanned.message}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {bulkItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="p-4 bg-muted/50 rounded-full mb-4">
                    <IconBarcode className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">No Products Added</h3>
                  <p className="text-muted-foreground text-sm">
                    Scan products to add them to the list
                  </p>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
                      <Table>
                        <TableHeader>
                          <TableRow className="sticky top-0 z-10 bg-muted">
                            <TableHead>Barcode</TableHead>
                            <TableHead> ID</TableHead>
                            <TableHead>
                              <div className="flex items-center gap-1">
                                Product Name
                                <span className="text-red-500 text-xs">*</span>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-1">
                                Brand
                                <span className="text-red-500 text-xs">*</span>
                              </div>
                            </TableHead>
                            <TableHead>
                              <div className="flex items-center gap-1">
                                Category
                                <span className="text-red-500 text-xs">*</span>
                              </div>
                            </TableHead>
                            {/* <TableHead>Purchase Price</TableHead> */}
                            <TableHead>Wholesale Price</TableHead>
                            <TableHead>Retail Price</TableHead>
            
                            <TableHead>Tax</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Alert Quantity</TableHead>
                            {/* <TableHead>Status</TableHead> */}
                            <TableHead>Returnable</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody >
                          {bulkItems.map((item) => (
                            <TableRow 
                              key={item.tempId}
                              className={cn(
                                !isRowValid(item) && 'border-l-4 border-l-orange-500 bg-orange-50/30'
                              )}
                            >
                              <TableCell >
                                <span className="font-mono text-sm ">{item.barcode}</span>
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Product ID"
                                  value={item.product_id ?? ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'product_id', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-12"
                                />
                              </TableCell>
                              <TableCell >
                                <div className="relative">
                                  <Input
                                    placeholder="Product Name *"
                                    value={item.product_name || ''}
                                    onChange={(e) => handleBulkItemChange(item.tempId, 'product_name', e.target.value)}
                                    className={cn(
                                      "h-8 text-sm w-34",
                                      !item.product_name || item.product_name.trim() === '' 
                                        ? "border-red-300 focus:border-red-500" 
                                        : "border-green-300 focus:border-green-500"
                                    )}
                                    ref={(el) => {
                                      productNameRefs.current[item.tempId] = el
                                    }}
                                  />
                                  {(!item.product_name || item.product_name.trim() === '') && (
                                    <div className="absolute -bottom-5 left-0 text-xs text-red-500">
                                      Required
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell style={{ position: 'relative', zIndex: 10 }}>
                                <div className="flex gap-1 w-[10vw]">
                                  <div className="relative flex-1">
                                    <Input
                                      className={cn(
                                        "w-full h-8 text-sm",
                                        !item.brand || item.brand.trim() === '' 
                                          ? "border-red-300 focus:border-red-500" 
                                          : "border-green-300 focus:border-green-500"
                                      )}
                                      placeholder="Enter brand name... *"
                                      value={item.brand || ''}
                                      onChange={(e) => handleBulkItemChange(item.tempId, 'brand', e.target.value)}
                                      onFocus={() => {
                                        handleBulkItemChange(item.tempId, 'brandDropdownOpen', true)
                                        // Calculate position
                                        const inputEl = brandInputRefs.current[item.tempId]
                                        if (inputEl) {
                                          const rect = inputEl.getBoundingClientRect()
                                          setDropdownPosition({
                                            top: rect.bottom + 4,
                                            left: rect.left,
                                            width: rect.width
                                          })
                                        }
                                        // Reset selected index when focusing
                                        handleBulkItemChange(item.tempId, 'selectedBrandIndex', 0)
                                      }}
                                      onBlur={() => {
                                        // Delay closing to allow for dropdown clicks
                                        setTimeout(() => {
                                          handleBulkItemChange(item.tempId, 'brandDropdownOpen', false)
                                          setDropdownPosition(null)
                                        }, 150)
                                      }}
                                      onKeyDown={(e) => {
                                        if (!item.brandDropdownOpen) return
                                        
                                        const filteredBrands = uniqueBrands
                                          .filter(brand => 
                                            brand.toLowerCase().includes((item.brand || '').toLowerCase())
                                          )
                                          .slice(0, 3)
                                        
                                        if (e.key === 'ArrowDown') {
                                          e.preventDefault()
                                          const currentIndex = item.selectedBrandIndex || 0
                                          const newIndex = currentIndex < filteredBrands.length - 1 ? currentIndex + 1 : 0
                                          handleBulkItemChange(item.tempId, 'selectedBrandIndex', newIndex)
                                        } else if (e.key === 'ArrowUp') {
                                          e.preventDefault()
                                          const currentIndex = item.selectedBrandIndex || 0
                                          const newIndex = currentIndex > 0 ? currentIndex - 1 : filteredBrands.length - 1
                                          handleBulkItemChange(item.tempId, 'selectedBrandIndex', newIndex)
                                        } else if (e.key === 'Enter') {
                                          e.preventDefault()
                                          if (filteredBrands.length > 0 && typeof item.selectedBrandIndex === 'number') {
                                            const selectedBrand = filteredBrands[item.selectedBrandIndex]
                                            if (selectedBrand) {
                                              handleBulkItemChange(item.tempId, 'brand', selectedBrand)
                                              handleBulkItemChange(item.tempId, 'brandDropdownOpen', false)
                                              handleBulkItemChange(item.tempId, 'selectedBrandIndex', 0)
                                            }
                                          }
                                        }
                                      }}
                                      ref={(el) => {
                                        brandInputRefs.current[item.tempId] = el
                                      }}
                                    />
                                    {item.brandDropdownOpen && dropdownPosition && (
                                      <div className="brand-dropdown fixed border rounded-md shadow-lg max-h-60 overflow-y-auto" style={{
                                        position: 'fixed',
                                        zIndex: 99999,
                                        width: dropdownPosition.width,
                                        top: dropdownPosition.top,
                                        left: dropdownPosition.left,
                                        backgroundColor: 'var(--background)',
                                        opacity: 1
                                      }}>
                                        {uniqueBrands
                                          .filter(brand => 
                                            brand.toLowerCase().includes((item.brand || '').toLowerCase())
                                          )
                                          .slice(0, 3) // Show only recent 3 brands
                                          .map((brand, index) => (
                                            <div
                                              key={brand}
                                              className={`p-2 hover:bg-muted cursor-pointer border-b last:border-b-0 z-50 ${
                                                item.selectedBrandIndex === index ? 'bg-muted ' : ''
                                              }`}
                                              onMouseDown={() => {
                                                handleBulkItemChange(item.tempId, 'brand', brand)
                                                handleBulkItemChange(item.tempId, 'brandDropdownOpen', false)
                                                handleBulkItemChange(item.tempId, 'selectedBrandIndex', 0)
                                              }}
                                            >
                                              <div className="font-medium text-sm">{brand}</div>
                                            </div>
                                          ))}
                                        {uniqueBrands.filter(brand => 
                                          brand.toLowerCase().includes((item.brand || '').toLowerCase())
                                        ).length === 0 && (
                                          <div className="p-2 text-sm text-muted-foreground">
                                            No matching brands found
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 w-[14vw]">
                                  <Popover 
                                    open={item.categoryDropdownOpen} 
                                    onOpenChange={(open) => handleBulkItemChange(item.tempId, 'categoryDropdownOpen', open)}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                    
                                        aria-expanded={item.categoryDropdownOpen}
                                        className={cn(
                                          "h-8 w-40 text-sm",
                                          !item.category_unique_id || item.category_unique_id.trim() === '' 
                                            ? "border-red-300 focus:border-red-500" 
                                            : "border-green-300 focus:border-green-500"
                                        )}
                                      >
                                        {item.categorySearch || "pick category... *"}
                                        <IconChevronDown className='h-4 w-4 mr-2'></IconChevronDown>
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-44 p-0">
                                      <Command>
                                        <CommandInput 
                                          placeholder="Search category..." 
                                          value={item.categorySearch || ''}
                                          onValueChange={(value) => handleBulkItemChange(item.tempId, 'categorySearch', value)}
                                        />
                                        <CommandList>
                                          <CommandEmpty>No category found.</CommandEmpty>
                                          <CommandGroup>

                                            {categories
                                              .filter(cat => 
                                                cat.category_name.toLowerCase().includes((item.categorySearch || '').toLowerCase())
                                              )
                                              .map((cat) => (
                                                <CommandItem
                                                  key={cat.category_id}
                                                  value={cat.category_name}
                                                  onSelect={() => {
                                                    handleBulkItemChange(item.tempId, 'category_unique_id', cat.category_unique_id || '')
                                                    handleBulkItemChange(item.tempId, 'categorySearch', cat.category_name || '')
                                                    handleBulkItemChange(item.tempId, 'categoryDropdownOpen', false)
                                                  }}
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-3 w-3",
                                                      item.category_unique_id === cat.category_unique_id ? "opacity-100" : "opacity-0"
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
                                  <Button
                                    onClick={() => setCategoryDrawerOpen(true)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Add new category"
                                  >
                                    <IconPlus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              {/* <TableCell>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={item.purchase_price || ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'purchase_price', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-24"
                                />
                              </TableCell> */}
                              <TableCell>
                                <Input
                                  type="number"
                                   placeholder="0"
                                  value={item.wholesale_price || ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'wholesale_price', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                   placeholder="0"
                                  value={item.retail_price || ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'retail_price', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-24"
                                />
                              </TableCell>
                             
                              
                              <TableCell>
                                <Input
                                  type="number"
                                   placeholder="0"
                                  value={item.tax || ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'tax', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-18"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                   placeholder="0"
                                  value={item.discount || ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'discount', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-18"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                   placeholder="0"
                                  value={item.alertqty ||  ''}
                                  onChange={(e) => handleBulkItemChange(item.tempId, 'alertqty', Number(e.target.value) || 0)}
                                  className="h-8 text-sm w-14"
                                />
                              </TableCell>
                                                       {/* <TableCell>
                                 <div className="flex justify-center">
                                   <BulkStatusToggle 
                                     product={item} 
                                     onStatusChange={handleBulkStatusChange}
                                   />
                                 </div>
                               </TableCell> */}
                               <TableCell>
                                 <div className="flex justify-center ">
                                   <BulkReturnableToggle 
                                     product={item} 
                                     onReturnableChange={handleBulkReturnableChange}
                                   />
                                 </div>
                               </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveBulkItem(item.tempId)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <IconTrash className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <SheetFooter className='gap-2 sticky bottom-0 z-10 bg-background border-t'>
            <SheetClose asChild>
              <Button variant='outline' className='flex items-center justify-center w-[30vw]'>Cancel</Button>
            </SheetClose>
            <Button 
              onClick={handleBulkSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex items-center justify-center gap-2 w-[65vw]",
                !canSubmit && "opacity-50 cursor-not-allowed"
              )}
            >
              <IconPlus className="h-4 w-4" />
              {canSubmit 
                ? `Add ${bulkItems.length} Products` 
                : `Fix ${bulkItems.filter(item => !isRowValid(item)).length} validation errors`
              }
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>

      <CategoryMutateDrawer
        open={categoryDrawerOpen}
        onOpenChange={setCategoryDrawerOpen}
        isEdit={false}
      />
    </Sheet>
  )
}
