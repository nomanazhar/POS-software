import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import {
  Sheet,
  // SheetClose,
  SheetContent,
  SheetDescription,
  // SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { purchaseSchema, Purchase, PurchaseLineItem } from '../data/schema'
import { usePurchaseContext } from '../context/purchase-context'
import { toast } from 'sonner'
import React from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { IconBarcode, IconSearch, IconCheck, IconX, IconTrash, IconPlus, IconMinus } from '@tabler/icons-react'
// import { useSupplierContext } from '@/features/suppliers/context/supplier-context'
import { useAuthStore } from '@/stores/authStore'
import { useInventory } from '@/features/inventory/context/inventory-context'
import { useProductContext } from '@/features/products/context/product-context'
import { generateId } from '@/lib/utils'
import { useCurrency } from '@/context/currency-context'
import { searchByFields } from '@/lib/utils'
import { ProductsMutateDrawer } from '@/features/products/components/product-mutate-drawer'
import { Product } from '@/features/products/data/schema'
import { CategoryProvider } from '@/features/categories/context/category-context'
import { AccountMutateDrawer } from '@/features/accounts/components/account-mutate-drawer'
import { Account } from '@/features/accounts/data/schema'
import { AccountProvider } from '@/features/accounts/context/account-context'
// import { SelectDropdown } from '@/components/select-dropdown'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPurchase?: Purchase
  isDelete?: boolean
}

type PurchaseForm = z.infer<typeof purchaseSchema>

export function PurchaseMutateDrawer({ open, onOpenChange, currentPurchase, isDelete }: Props) {
  const isUpdate = !!currentPurchase && !isDelete
  const { addPurchase, updatePurchase, isReturnPurchase, toggleReturnPurchase, getPurchaseById, canPurchaseBeReturned, validateReturnPurchase } = usePurchaseContext()
  const [suppliers, setSuppliers] = React.useState<any[]>([])
  const user = useAuthStore((s) => s.auth.user);
  const { products: inventoryProducts, refresh: refreshInventory, updateInventory } = useInventory();
  const { updateProductByBarcode, refresh: refreshProducts, products } = useProductContext();
  // Centralized currency formatting
  const { formatAmount } = useCurrency();

  // Purchase-level fields
  const nowIso = React.useMemo(() => {
    const now = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }, [])

  // Bulk line items state
  const [barcodeInput, setBarcodeInput] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [lineItems, setLineItems] = React.useState<PurchaseLineItem[]>([])
  const [lastScanned, setLastScanned] = React.useState<{ success: boolean; message: string, barcode: string | null } | null>(null)
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false)
  const [selectedSearchIndex, setSelectedSearchIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hasUserInteractedRef = React.useRef(false)

  // Helper: Convert PurchaseLineItem[] to local line items with originalPurchasedQuantity and remainingReturnableQuantity
  const purchaseItemsToLineItems = async (items: PurchaseLineItem[], purchaseId?: string): Promise<(PurchaseLineItem & {
    originalPurchasedQuantity: number;
    remainingReturnableQuantity: number;
  })[]> => {
    // For return purchases, we need to get the current state of the original purchase
    if (purchaseId && isReturnPurchase) {
      try {
        const originalPurchaseResult = await window.electronAPI?.invoke('purchases:getById', purchaseId);

        if (originalPurchaseResult?.success && originalPurchaseResult.data) {
          const originalPurchase = originalPurchaseResult.data;

          console.log('=== RETURN PURCHASE ANALYSIS ===');
          console.log('Original purchase data:', originalPurchase);
          console.log('Current items in purchase:', originalPurchase.purchase_items);
          console.log('Original items in purchase:', originalPurchase.original_purchase_items);

          // CRITICAL FIX: Use current items from database, not scanned items
          // The scanned items represent the original state, but we want current returnable state
          const currentItems = originalPurchase.purchase_items || [];
          const originalItems = originalPurchase.original_purchase_items || [];

          return currentItems.map((currentItem: any) => {
            // Find the corresponding original item
            const originalItem = originalItems.find((oi: any) =>
              oi.product_unique_id === currentItem.product_unique_id
            );

            if (originalItem) {
              const currentQty = Number(currentItem.quantity || currentItem.item_qty || 0);
              const originalQty = Number(originalItem.quantity || originalItem.item_qty || 0);

              console.log(`Item ${currentItem.product_unique_id}:`, {
                currentQty,
                originalQty,
                returned: originalQty - currentQty,
                remainingReturnable: currentQty
              });

              return {
                product_unique_id: currentItem.product_unique_id,
                product_name: currentItem.product_name,
                barcode: currentItem.barcode,
                brand: currentItem.brand || '',
                quantity: 1, // Default return quantity - user can adjust
                retail_price: Number(currentItem.retail_price || 0),
                wholesale_price: Number(currentItem.wholesale_price || 0),
                purchase_price: Number(currentItem.purchase_price || 0),
                originalPurchasedQuantity: originalQty, // True original quantity
                remainingReturnableQuantity: currentQty, // Current remaining quantity
              }
            }

            // Fallback if original item not found
            const currentQty = Number(currentItem.quantity || currentItem.item_qty || 0);
            return {
              product_unique_id: currentItem.product_unique_id,
              product_name: currentItem.product_name,
              barcode: currentItem.barcode,
              brand: currentItem.brand || '',
              quantity: 1,
              retail_price: Number(currentItem.retail_price || 0),
              wholesale_price: Number(currentItem.wholesale_price || 0),
              purchase_price: Number(currentItem.purchase_price || 0),
              originalPurchasedQuantity: currentQty,
              remainingReturnableQuantity: currentQty,
            }
          }).filter((item: any) => item.remainingReturnableQuantity > 0); // Only show returnable items
        }
      } catch (error) {
        console.error('Error getting original purchase for return:', error);
      }
    }

    // For non-return purchases or fallback
    return items.map(item => ({
      ...item,
      originalPurchasedQuantity: item.quantity,
      remainingReturnableQuantity: item.quantity,
    }));
  }

  // Form for purchase-level fields
  const form = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema) as any,
    defaultValues: currentPurchase || {
      purchase_unique_id: '',
      account_unique_id: '',
      purchase_billno: '',
      po_no: '',
      received_by: '',
      total_amount: 0,
      paid_amount: 0,
      balance: 0,
      profit_margin: 0,
      item_count: 0,
      original_purchase_billno: '', // Add this field to store original purchase bill number
      isreturned: 0,
      payment_method: 'cash',
      purchase_items: [],
      added_by: user?.id || user?.email || user?.name || 'admin',
      company_id: user?.companyId || '1',
      branch_id: user?.branchId || '1',
      created_at: nowIso,
      updated_at: nowIso,
    },
  })

  // Fetch suppliers (accounts with type 'supplier') - fixed infinite loop
  // First, let's get the current company and branch IDs
  const companyId = user?.companyId || '1';
  const branchId = user?.branchId || '1';

  const fetchSuppliers = React.useCallback(async () => {
    try {
      if (window.electronAPI) {
        console.log('[PurchaseMutateDrawer] Fetching suppliers...');
        const response = await window.electronAPI.invoke('accounts:getByType', 'supplier');
        console.log('Suppliers response:', response);
        let supplierAccounts = [];
        if (Array.isArray(response)) {
          supplierAccounts = response;
        } else if (response?.success && Array.isArray(response.data)) {
          supplierAccounts = response.data;
        } else if (response?.data) {
          supplierAccounts = Array.isArray(response.data) ? response.data : [response.data];
        }
        const activeSuppliers = supplierAccounts.filter(
          (account: any) => account?.account_type === 'supplier' && account?.account_status !== 'inactive'
        );
        if (activeSuppliers.length === 0) {
          toast.warning('No active suppliers found');
          const defaultSupplier = {
            account_unique_id: `${companyId}_${branchId}_default_supplier`,
            fullname: 'Default Supplier',
            email: '',
            phone_no: '',
            account_type: 'supplier',
            account_status: 'active',
            company_id: companyId,
            branch_id: branchId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            address: '',
            balance: 0
          };
          setSuppliers([defaultSupplier]);
        } else {
          setSuppliers(activeSuppliers);
        }
      } else {
        toast.error('Electron API not available');
        setSuppliers([]);
      }
    } catch (error) {
      console.error('[PurchaseMutateDrawer] Error fetching suppliers:', error);
      toast.error('Failed to fetch suppliers');
      setSuppliers([]);
    }
  }, [companyId, branchId]);

  React.useEffect(() => {
    if (open) {
      refreshInventory();
      setHasUserInteracted(false);
      hasUserInteractedRef.current = false;

      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [open, refreshInventory]);

  // Update the useEffect that calls fetchSuppliers
  React.useEffect(() => {
    if (open) {
      refreshInventory();
      setHasUserInteracted(false);
      hasUserInteractedRef.current = false;

      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [open, refreshInventory]);

  // Set initial supplier when editing
  React.useEffect(() => {
    if (currentPurchase?.account_unique_id && suppliers.length > 0) {
      const supplier = suppliers.find(s =>
        s.account_unique_id === currentPurchase.account_unique_id
      );
      if (supplier) {
        setSelectedSupplierName(supplier.fullname || '');
      }
    }
  }, [open, currentPurchase, suppliers]);

  // Refresh inventory and suppliers on open
  React.useEffect(() => {
    if (open) {
      refreshInventory();
      // Reset user interaction state when drawer opens
      setHasUserInteracted(false);
      hasUserInteractedRef.current = false;

      // Simple focus attempt - only once when drawer opens
      const focusTimer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [open, refreshInventory]); // Fixed dependencies

  // Handle when other inputs are focused to prevent barcode scanner from stealing focus
  const handleOtherInputFocus = () => {
    setHasUserInteracted(true);
    hasUserInteractedRef.current = true;
  };

  // Handle when user clicks on any form field to mark as user interaction
  const handleFormFieldClick = () => {
    setHasUserInteracted(true);
    hasUserInteractedRef.current = true;
  };



  // Reset state on open/close
  React.useEffect(() => {
    if (!open) {
      setLineItems([])
      setBarcodeInput('')
      setSearchResults([])
      setSelectedSearchIndex(-1)
      setLastScanned(null)
      setGeneratedBillNo('')
      setSupplierSearch('')
      setSelectedSupplierName('')
      setSupplierDropdownOpen(false)
      setProductDrawerOpen(false)
      setAccountDrawerOpen(false)
      setNewProductBarcode(null)
      setHasUserInteracted(false)
      hasUserInteractedRef.current = false
      // Only reset form if not in update mode
      if (!isUpdate) {
        // Preserve original purchase bill number when resetting form for return purchases
        if (isReturnPurchase && form.getValues('original_purchase_billno')) {
          const originalBillNo = form.getValues('original_purchase_billno');
          form.reset();
          form.setValue('original_purchase_billno', originalBillNo);
        } else {
          form.reset();
        }
      }
    }
  }, [open, isUpdate]) // Remove form from dependencies to prevent loops

  // Handle currentPurchase changes separately
  React.useEffect(() => {
    if (open && currentPurchase) {
      setLineItems(currentPurchase.purchase_items || [])
      // Set selected supplier name if editing
      if (currentPurchase.account_unique_id) {
        const supplier = suppliers.find(sup => sup.account_unique_id === currentPurchase.account_unique_id)
        if (supplier) {
          setSelectedSupplierName(supplier.fullname)
        }
      }
    }
  }, [open, currentPurchase, suppliers])

  // --- New state for bill number ---
  const [generatedBillNo, setGeneratedBillNo] = React.useState('');

  // --- Auto-generate bill number and received by on open ---
  React.useEffect(() => {
    if (open && !isUpdate && !isDelete) {
      // Only generate if no bill number is already set
      const currentBillNo = form.getValues('purchase_billno');
      if (!currentBillNo || currentBillNo.trim() === '') {
        // Generate a more structured bill number with company/branch prefix
        const companyId = user?.companyId || user?.company_id || '1';
        const branchId = user?.branchId || user?.branch_id || '1';
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const structuredBillNo = `${companyId}-${branchId}-${timestamp}${randomSuffix}`;

        setGeneratedBillNo(structuredBillNo);
        form.setValue('purchase_billno', structuredBillNo);
      }
      if (user?.name) {
        form.setValue('received_by', user.name);
      }
    }
  }, [open, isUpdate, isDelete, user]); // Remove form from dependencies

  // --- Set default supplier when suppliers are loaded ---
  React.useEffect(() => {
    if (open && !isUpdate && !isDelete && suppliers.length > 0 && !form.getValues('account_unique_id')) {
      form.setValue('account_unique_id', suppliers[0].account_unique_id);
    }
  }, [open, isUpdate, isDelete, suppliers]); // Keep suppliers dependency as it's needed

  // --- Auto-update item count and items quantity ---
  React.useEffect(() => {
    // Use setTimeout to debounce form updates and prevent excessive re-renders
    const timeoutId = setTimeout(() => {
      form.setValue('item_count', lineItems.length);
      form.setValue('purchase_items', lineItems);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [lineItems]); // Keep lineItems dependency as it's needed

  // --- Supplier search state ---
  const [supplierSearch, setSupplierSearch] = React.useState('')
  const [supplierDropdownOpen, setSupplierDropdownOpen] = React.useState(false)
  const [selectedSupplierName, setSelectedSupplierName] = React.useState('')


  // Filtered suppliers for dropdown - improved search functionality
  const filteredSuppliers = React.useMemo(() => {
    if (!suppliers || suppliers.length === 0) return [];
    
    const searchTerm = (supplierSearch || '').trim().toLowerCase();
    
    return suppliers.filter((supplier: any) => {
      if (!supplier || supplier.account_status === 'inactive') return false;
      
      const name = (supplier.fullname || supplier.name || '').toLowerCase();
      const email = (supplier.email || '').toLowerCase();
      const phone = (supplier.phone || supplier.phone_no || '').toLowerCase();
      
      return !searchTerm || 
             name.includes(searchTerm) || 
             email.includes(searchTerm) || 
             phone.includes(searchTerm);
    });
  }, [supplierSearch, suppliers]);
  
  // Fetch suppliers when component mounts
  React.useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Handle supplier selection from dropdown - improved state management
  const handleSupplierSelect = React.useCallback((supplier: any) => {
    if (!supplier) return;
    console.log('Selected supplier:', supplier);
    const supplierName = supplier.fullname || supplier.name || '';
    setSelectedSupplierName(supplierName);
    setSupplierSearch(supplierName);
    form.setValue('account_unique_id', supplier.account_unique_id || supplier.id || '');
    if (supplier.company_id) {
      form.setValue('company_id', supplier.company_id);
    }
    if (supplier.branch_id) {
      form.setValue('branch_id', supplier.branch_id);
    }
    setSupplierDropdownOpen(false);
  }, [form]);

  // Handle supplier input change - improved functionality
  const handleSupplierInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSupplierSearch(value);

    // Clear selected supplier when user types new text
    if (value !== selectedSupplierName) {
      setSelectedSupplierName('');
      // Clear form values only if we're clearing the input
      if (!value.trim()) {
        form.setValue('account_unique_id', '');
      }
    }

    // Always open dropdown when user is typing
    setSupplierDropdownOpen(true);
  }

  // Handle supplier input focus
  const handleSupplierInputFocus = () => {
    setSupplierDropdownOpen(true);
  }
  // Product search
  const handleSearch = (query: string) => {
    // Reset selected index when performing new search
    setSelectedSearchIndex(-1)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearchResults(
      searchByFields(inventoryProducts, query, ['product_name', 'barcode']).map(p => {
        // Find the corresponding product from products table to get purchase price and brand
        const productFromProductsTable = products.find(prod => prod.barcode === p.barcode);
        return {
          product_unique_id: p.product_unique_id || '',
          inventory_unique_id: p.inventory_unique_id || generateId('PROD'),
          product_name: p.product_name || '',
          barcode: p.barcode || '',
          brand: productFromProductsTable?.brand || '',
          quantity: 1,
          retail_price: p.retail_price ?? 0,
          wholesale_price: p.wholesale_price ?? 0,
          purchase_price: productFromProductsTable?.purchase_price ?? 0, // Use purchase price from products table
        }
      })
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBarcodeInput(value)
    handleSearch(value)
  }

  // Add or update line item by barcode
  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) return

    if (!isReturnPurchase) {
      // Normal product scan logic
      const product = inventoryProducts.find(p => p.barcode === barcode)
      // Find the corresponding product from products table to get purchase price
      const productFromProductsTable = products.find(prod => prod.barcode === barcode)

      // Map to expected type for line item
      const mappedProduct = product
        ? {
          product_unique_id: product.product_unique_id || '',
          inventory_unique_id: product.inventory_unique_id || generateId('PROD'),
          product_name: product.product_name || '',
          barcode: product.barcode || '',
          brand: productFromProductsTable?.brand || '',
          retail_price: product.retail_price || 0,
          wholesale_price: product.wholesale_price || 0,
          purchase_price: productFromProductsTable?.purchase_price ?? 0, // Use purchase price from products table
          quantity: 1,
        }
        : undefined;
      if (product && mappedProduct) {
        const existingIdx = lineItems.findIndex(item => item.barcode === barcode)
        const newItem: PurchaseLineItem = {
          product_unique_id: mappedProduct.product_unique_id,
          product_name: mappedProduct.product_name,
          barcode: mappedProduct.barcode,
          brand: mappedProduct.brand,
          wholesale_price: mappedProduct.wholesale_price,
          retail_price: mappedProduct.retail_price,
          purchase_price: mappedProduct.purchase_price,
          quantity: mappedProduct.quantity,
        }
        if (existingIdx !== -1) {
          setLineItems(prev => prev.map((item, idx) =>
            idx === existingIdx
              ? { ...item, quantity: Number(item.quantity) + 1 }
              : item
          ))
          setLastScanned({ success: true, message: 'Product quantity increased', barcode })
        } else {
          setLineItems(prev => [...prev, newItem])
          setLastScanned({ success: true, message: 'Product added to list', barcode })
        }
        setBarcodeInput('')
        setSearchResults([])
        setSelectedSearchIndex(-1)
        setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
      } else {
        setLastScanned({ success: false, message: 'Product not found', barcode })
        setProductDrawerOpen(true)
        setNewProductBarcode(barcode)
        // Don't clear barcode input when opening product drawer - keep it for the new product
        setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
      }
    } else {
      // Return purchase scan logic
      const purchase = getPurchaseById(barcode)
      if (purchase) {
        // Check if purchase can be returned using validation function
        const errors = validateReturnPurchase(purchase);
        if (errors.length > 0) {
          setLastScanned({ success: false, message: errors.join(', '), barcode })
          setBarcodeInput('')
          setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
          toast.error(errors.join(', '))
          return;
        }

        // Set all form fields from the purchase object
        form.setValue('purchase_unique_id', purchase.purchase_unique_id || '')
        form.setValue('account_unique_id', purchase.account_unique_id || '')

        // For return purchases: clear bill number to allow new generation
        form.setValue('purchase_billno', '')
        // Preserve PO number and received_by from original purchase for return purchases
        form.setValue('po_no', purchase.po_no || '')
        form.setValue('received_by', purchase.received_by || '')
        form.setValue('total_amount', purchase.total_amount || 0)
        form.setValue('paid_amount', purchase.paid_amount || 0)
        form.setValue('balance', purchase.balance || 0)
        form.setValue('profit_margin', purchase.profit_margin || 0)
        form.setValue('item_count', purchase.item_count || 0)
        form.setValue('isreturned', purchase.isreturned || 0)
        form.setValue('created_at', purchase.created_at || '')
        form.setValue('updated_at', purchase.updated_at || '')
        form.setValue('added_by', purchase.added_by || '')
        form.setValue('company_id', purchase.company_id || '')
        form.setValue('branch_id', purchase.branch_id || '')
        // Store the original purchase bill number for return purchases
        form.setValue('original_purchase_billno', purchase.purchase_billno || '')

        // Preserve payment method from original purchase for return purchases
        if (purchase.payment_method) {
          form.setValue('payment_method', purchase.payment_method);
        }

        // Update supplier name display for return purchases
        if (purchase.account_unique_id) {
          const supplier = suppliers.find(sup => sup.account_unique_id === purchase.account_unique_id);
          if (supplier) {
            setSelectedSupplierName(supplier.fullname);
            setSupplierSearch('');
          }
        }

        try {
          const lineItemsWithReturnData = await purchaseItemsToLineItems(purchase.purchase_items, purchase.purchase_unique_id);
          setLineItems(lineItemsWithReturnData);
          setLastScanned({ success: true, message: `Purchase loaded: ${purchase.purchase_billno || purchase.purchase_unique_id}`, barcode })
          setBarcodeInput('')
          setSearchResults([])
          setSelectedSearchIndex(-1)

          // Show success message with supplier and purchase details
          const supplierInfo = purchase.account_unique_id === '1_1_default_supplier' ? 'Default Supplier' : `Supplier: ${purchase.account_unique_id}`;
          const purchaseDetails = [
            purchase.total_amount > 0 ? `Total: ${formatAmount(purchase.total_amount)}` : null,
            purchase.paid_amount > 0 ? `Paid: ${formatAmount(purchase.paid_amount)}` : null,
            purchase.balance > 0 ? `Balance: ${formatAmount(purchase.balance)}` : null,
            purchase.po_no ? `PO: ${purchase.po_no}` : null,
            purchase.payment_method ? `Payment: ${purchase.payment_method.toUpperCase()}` : null
          ].filter(Boolean).join(', ');

          toast.success(`Purchase ${purchase.purchase_billno || purchase.purchase_unique_id} loaded for return - ${supplierInfo}${purchaseDetails ? ` (${purchaseDetails})` : ''}`);

          // Also update paidAmount state for controlled input
          setPaidAmount(purchase.paid_amount || 0)
        } catch (error) {
          console.error('Error loading purchase for return:', error);
          toast.error('Error loading purchase for return')
        }
      } else {
        setLastScanned({ success: false, message: 'Purchase not found', barcode })
        setBarcodeInput('')
        setSearchResults([])
        setSelectedSearchIndex(-1)
        setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
        toast.error('Purchase not found')
      }
    }
  }

  // When mapping for line items, ensure unique_id is always present
  const handleAddProductToLineItems = (product: any) => {
    // Check if product's category is disabled
    if (product.category_status === 'inactive') {
      toast.error('Cannot add product: Category is disabled');
      return;
    }

    // Check if product is inactive
    if (product.product_status === 'inactive') {
      toast.error('Cannot add product: Product is inactive');
      return;
    }

    setLineItems(prev => {
      const existingIdx = prev.findIndex(item => item.barcode === product.barcode)
      if (existingIdx !== -1) {
        // Increase quantity if already exists
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, quantity: Number(item.quantity) + 1 }
            : item
        )
      } else {
        // Add new product if not exists
        return [
          ...prev,
          {
            product_unique_id: product.product_unique_id || '',
            product_name: product.product_name,
            barcode: product.barcode,
            brand: product.brand || '',
            quantity: 1,
            retail_price: product.retail_price ?? 0,
            wholesale_price: product.wholesale_price ?? 0,
            purchase_price: product.purchase_price ?? 0, // This should now be from products table
          }
        ]
      }
    })
    setSearchResults([])
    setSelectedSearchIndex(-1)
  }

  // Global keyboard navigation for search results
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Handle search results navigation when dropdown is open
      if (searchResults.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setSelectedSearchIndex(prev =>
              prev < searchResults.length - 1 ? prev + 1 : 0
            )
            return
          case 'ArrowUp':
            e.preventDefault()
            setSelectedSearchIndex(prev =>
              prev > 0 ? prev - 1 : searchResults.length - 1
            )
            return
          case 'Enter':
            e.preventDefault()
            if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
              // Add the selected product to line items
              handleAddProductToLineItems(searchResults[selectedSearchIndex])
              setBarcodeInput('')
              setSelectedSearchIndex(-1)
              setSearchResults([])
              return
            } else if (searchResults.length > 0) {
              // If no selection, add the first result to line items
              handleAddProductToLineItems(searchResults[0])
              setBarcodeInput('')
              setSelectedSearchIndex(-1)
              setSearchResults([])
              return
            }
            break
          case 'Escape':
            e.preventDefault()
            setSearchResults([])
            setSelectedSearchIndex(-1)
            return
        }
      }
    }

    // Add global event listener
    document.addEventListener('keydown', handleGlobalKeyDown, true)

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [searchResults, selectedSearchIndex])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Only handle Enter for barcode submission when no search results
    // Global keyboard navigation handles search results navigation
    if (e.key === 'Enter' && searchResults.length === 0) {
      handleBarcodeSubmit(barcodeInput)
    }
  }

  // When creating or updating line items manually, ensure purchase_price is always present
  const handleLineItemChange = React.useCallback((idx: number, field: keyof PurchaseLineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;

      // Handle different field types appropriately
      if (field === 'purchase_price') {
        return { ...item, purchase_price: Number(value) };
      }
      if (field === 'quantity') {
        const newQuantity = Number(value);

        // For return purchases, validate against remaining returnable quantity
        if (isReturnPurchase) {
          const maxReturnable = 'remainingReturnableQuantity' in item ? (item as any).remainingReturnableQuantity : 0;

          if (newQuantity > maxReturnable) {
            toast.error(`Cannot return more than ${maxReturnable} units. Only ${maxReturnable} units remain returnable.`);
            return item; // Don't update the quantity
          }
        }

        return { ...item, quantity: newQuantity, purchase_price: item.purchase_price ?? 0 };
      }
      if (field === 'retail_price') {
        return { ...item, retail_price: Number(value), purchase_price: item.purchase_price ?? 0 };
      }
      if (field === 'wholesale_price') {
        return { ...item, wholesale_price: Number(value), purchase_price: item.purchase_price ?? 0 };
      }

      // For other fields (like product_name, etc.)
      return { ...item, [field]: value, purchase_price: item.purchase_price ?? 0 };
    }))
  }, [isReturnPurchase])

  const handleRemoveLineItem = React.useCallback((idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }, [])



  // Calculate totals with memoization to prevent unnecessary recalculations
  const totalAmount = React.useMemo(() =>
    lineItems.reduce((sum, item) => sum + (Number(item.purchase_price) * Number(item.quantity)), 0),
    [lineItems]
  );

  const totalQuantity = React.useMemo(() =>
    lineItems.reduce((sum, item) => sum + Number(item.quantity), 0),
    [lineItems]
  );

  // Check if purchase can be returned (using context function)
  // This is now handled by the context validation functions



  // --- Inventory update after purchase ---
  /**
   * Updates inventory stock and purchase price after a purchase.
   * @param newLineItems The new line items (after submit)
   * @param oldLineItems The old line items (from previous purchase, if updating)
   */
  async function updateInventoryAfterPurchase(newLineItems: PurchaseLineItem[], oldLineItems?: PurchaseLineItem[]) {
    for (const item of newLineItems) {
      // Find inventory product by barcode
      const inventoryProduct = inventoryProducts.find((p) => p.barcode === item.barcode);
      if (inventoryProduct) {
        // Find old quantity (if updating)
        let oldQty = 0;
        if (oldLineItems) {
          const oldItem = oldLineItems.find((li) => li.barcode === item.barcode);
          oldQty = oldItem ? Number(oldItem.quantity) : 0;
        }
        const newQty = Number(item.quantity);
        const delta = newQty - oldQty; // For create: oldQty=0, so delta=newQty
        // --- Return Purchase Logic ---
        let stockChange = delta;
        if (isReturnPurchase) {
          // For return, decrease inventory
          stockChange = -Math.abs(delta);
        }
        // Only update if there is a change
        if (
          stockChange !== 0 ||
          (item.purchase_price !== undefined && item.purchase_price !== inventoryProduct.purchase_price) ||
          (item.retail_price !== undefined && item.retail_price !== inventoryProduct.retail_price)
        ) {
          const modified: string[] = []
          if (item.retail_price !== undefined && item.retail_price !== inventoryProduct.retail_price) modified.push('retail_price')
          if (item.purchase_price !== undefined && item.purchase_price !== inventoryProduct.purchase_price) modified.push('purchase_price')
          // Update inventory with new values
          await updateInventory(inventoryProduct.inventory_id || 0, {
            ...inventoryProduct,
            stock: inventoryProduct.stock + stockChange,
            retail_price: Number(item.retail_price || inventoryProduct.retail_price || 0),
            wholesale_price: Number(item.wholesale_price || inventoryProduct.wholesale_price || 0),
            purchase_price: Number(item.purchase_price || inventoryProduct.purchase_price || 0),
          });
        }
      }
      // If not found, optionally handle as needed (e.g., skip or add new product)
    }
  }

  // --- Paid Amount state (controlled input) ---
  const [paidAmount, setPaidAmount] = React.useState<number>(0)

  // --- Product Drawer state ---
  const [productDrawerOpen, setProductDrawerOpen] = React.useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = React.useState(false)
  const [newProductBarcode, setNewProductBarcode] = React.useState<string | null>(null);

  // Handle account creation from account drawer
  const handleAccountCreated = async (newAccount: Account) => {
    try {
      // Refresh suppliers list to include the new account
      await fetchSuppliers();

      // Set the newly created account as the selected supplier
      if (newAccount.account_unique_id) {
        form.setValue('account_unique_id', newAccount.account_unique_id);
      }
      setSelectedSupplierName(newAccount.fullname);

      toast.success('Account created and selected as supplier!');

    } catch (error) {
      console.error('Error selecting new account as supplier:', error);
      toast.error('Account created but failed to select as supplier');
    }
  }

  // Handle product creation from product drawer
  const handleProductCreated = async (newProduct: Product) => {
    try {
      // Create inventory entry for the new product
      const inventoryItem = {
        inventory_unique_id: generateId('INV'),
        product_unique_id: newProduct.product_unique_id,
        stock: 0, // Will be updated when purchase is completed
        retail_price: newProduct.retail_price,
        wholesale_price: newProduct.wholesale_price,
        purchase_price: newProduct.purchase_price,
        barcode: newProduct.barcode,
        product_name: newProduct.product_name,
        category_name: null,
        alertqty: newProduct.alertqty,
        product_status: newProduct.status,
        category_status: 'active' as const, // Default to active
        added_by: user?.name || user?.email || 'admin',
        company_id: user?.companyId || '1',
        branch_id: user?.branchId || '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await updateInventory(0, inventoryItem);

      // Refresh inventory and products data to include the new product
      await refreshInventory();
      await refreshProducts();

      // Add the new product to the purchase cart
      const purchaseItem: PurchaseLineItem = {
        product_unique_id: newProduct.product_unique_id,
        product_name: newProduct.product_name,
        barcode: newProduct.barcode,
        brand: newProduct.brand || '',
        quantity: 1,
        retail_price: newProduct.retail_price,
        wholesale_price: newProduct.wholesale_price,
        purchase_price: newProduct.purchase_price,
      };

      setLineItems(prev => [...prev, purchaseItem]);

      // Close the product drawer after successful creation
      setProductDrawerOpen(false);
      setNewProductBarcode(null); // Clear the barcode after product is added
      setBarcodeInput(''); // Clear the barcode input field

      toast.success('Product created and added to cart!');

    } catch (error) {
      console.error('Error adding new product to cart:', error);
      toast.error('Product created but failed to add to cart');
    }
  }

  // --- Auto-calculate balance and profit margin ---
  const balance = totalAmount - paidAmount;
  const profitMargin = lineItems.reduce((sum, item) => sum + ((Number(item.retail_price) - Number(item.purchase_price || 0)) * Number(item.quantity)), 0);

  // Sync paidAmount with form value (if editing existing purchase)
  React.useEffect(() => {
    if (open && currentPurchase && typeof currentPurchase.paid_amount === 'number') {
      setPaidAmount(currentPurchase.paid_amount)
    } else if (open && !currentPurchase) {
      setPaidAmount(0)
    }
  }, [open, currentPurchase])

  // Update form value for paidAmount on change
  React.useEffect(() => {
    form.setValue('paid_amount', paidAmount)
  }, [paidAmount]) // Keep dependency as it's needed for form sync

  // Update form value for balance and profitMargin on change
  React.useEffect(() => {
    form.setValue('balance', balance)
    form.setValue('profit_margin', profitMargin)
  }, [balance, profitMargin]) // Keep dependencies as they're needed for form sync

  // Submit handler
  const onSubmit = async () => {
    console.log('=== PURCHASE SUBMISSION START ===');

    if (lineItems.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    if (lineItems.some(item => typeof item.purchase_price !== 'number' || item.purchase_price <= 0)) {
      toast.error('Please enter a valid purchase price for all items');
      return;
    }

    // Validate required fields
    const formValues = form.getValues();
    console.log('Form values:', formValues);
    console.log('Form values - original_purchase_billno:', formValues.original_purchase_billno);
    console.log('Form values - purchase_billno:', formValues.purchase_billno);

    // Additional debugging for return purchase
    if (isReturnPurchase) {
      console.log('=== RETURN PURCHASE FORM DEBUG ===');
      console.log('isReturnPurchase:', isReturnPurchase);
      console.log('formValues.original_purchase_billno:', formValues.original_purchase_billno);
      console.log('form.watch("original_purchase_billno"):', form.watch('original_purchase_billno'));
      console.log('form.getValues("original_purchase_billno"):', form.getValues('original_purchase_billno'));
    }

    // Validate supplier
    if (!formValues.account_unique_id?.trim()) {
      toast.error('Please select a supplier');
      return;
    }
    // New validation: Ensure account_unique_id corresponds to a valid supplier
    const selectedSupplier = suppliers.find(
      (sup) => sup.account_unique_id === formValues.account_unique_id && sup.account_type === 'supplier'
    );
    if (!selectedSupplier) {
      toast.error('Selected supplier is invalid or not found');
      return;
    }

    if (!formValues.purchase_billno?.trim()) {
      toast.error('Please enter a bill number');
      return;
    }
    if (!formValues.received_by?.trim()) {
      toast.error('Please enter who received the purchase');
      return;
    }

    // Additional validation
    if (!formValues.company_id?.trim()) {
      toast.error('Company ID is required');
      return;
    }
    if (!formValues.branch_id?.trim()) {
      toast.error('Branch ID is required');
      return;
    }
    if (!formValues.added_by?.trim()) {
      toast.error('Added by field is required');
      return;
    }

    // Validate line items
    console.log('Line items before validation:', lineItems);
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.product_unique_id?.trim()) {
        toast.error(`Product unique ID is required for item ${i + 1}`);
        return;
      }
      if (!item.product_name?.trim()) {
        toast.error(`Product name is required for item ${i + 1}`);
        return;
      }
      if (!item.barcode?.trim()) {
        toast.error(`Barcode is required for item ${i + 1}`);
        return;
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        toast.error(`Valid quantity is required for item ${i + 1}`);
        return;
      }
      if (typeof item.retail_price !== 'number' || item.retail_price < 0) {
        toast.error(`Valid retail price is required for item ${i + 1}`);
        return;
      }
      if (typeof item.purchase_price !== 'number' || item.purchase_price <= 0) {
        toast.error(`Valid purchase price is required for item ${i + 1}`);
        return;
      }
    }

    // Ensure all lineItems have valid fields
    const safeLineItems = lineItems.map((item, _index) => ({
      product_unique_id: item.product_unique_id,
      product_name: item.product_name,
      barcode: item.barcode,
      brand: item.brand || '',
      quantity: Number(item.quantity),
      retail_price: Number(item.retail_price),
      purchase_price: Number(item.purchase_price),
      wholesale_price: Number(item.wholesale_price || 0),
      isreturned: isReturnPurchase ? 1 : 0,
    }));

    console.log('Safe line items:', safeLineItems);
    // --- Generate purchase unique ID using companyid_branchid_timestamp pattern ---
    const purchaseUniqueId = `${user?.companyId || user?.company_id || '1'}_${user?.branchId || user?.branch_id || '1'}_${Date.now()}`;
    // For return purchases, always generate a new unique ID
    const finalPurchaseUniqueId = isReturnPurchase ? purchaseUniqueId : (formValues.purchase_unique_id || purchaseUniqueId);

    console.log('=== UNIQUE ID DEBUG ===');
    console.log('isReturnPurchase:', isReturnPurchase);
    console.log('formValues.purchase_unique_id:', formValues.purchase_unique_id);
    console.log('purchaseUniqueId (new):', purchaseUniqueId);
    console.log('finalPurchaseUniqueId:', finalPurchaseUniqueId);

    // For return purchases: generate new bill number, keep original in tracking field
    // For normal purchases: use existing or generate new bill number
    const finalBillNo = isReturnPurchase
      ? generatedBillNo
      : (formValues.purchase_billno || generatedBillNo);

    console.log('=== BILL NUMBER DEBUG ===');
    console.log('isReturnPurchase:', isReturnPurchase);
    console.log('formValues.purchase_billno:', formValues.purchase_billno);
    console.log('formValues.original_purchase_billno:', formValues.original_purchase_billno);
    console.log('generatedBillNo:', generatedBillNo);
    console.log('finalBillNo:', finalBillNo);

    // Validate total amount
    const calculatedTotalAmount = safeLineItems.reduce((sum, item) => sum + (Number(item.purchase_price) * Number(item.quantity)), 0);
    console.log('Calculated total amount:', calculatedTotalAmount);
    console.log('Form total amount:', totalAmount);

    const finalTotalAmount = Math.abs(calculatedTotalAmount - totalAmount) > 0.01 ? calculatedTotalAmount : totalAmount;
    if (Math.abs(calculatedTotalAmount - totalAmount) > 0.01) {
      console.warn('Total amount mismatch. Using calculated amount.');
    }

    // Ensure all required form fields are set
    const safeData: Purchase = {
      purchase_unique_id: finalPurchaseUniqueId,
      account_unique_id: formValues.account_unique_id || '',
      purchase_billno: finalBillNo,
      po_no: formValues.po_no || '',
      received_by: formValues.received_by || (user?.name || ''),
      total_amount: finalTotalAmount,
      paid_amount: formValues.paid_amount || 0,
      balance: formValues.balance || 0,
      profit_margin: formValues.profit_margin || 0,
      item_count: lineItems.length,
      isreturned: isReturnPurchase ? 1 : 0,
      payment_method: formValues.payment_method || 'cash',
      purchase_items: safeLineItems,
      added_by: formValues.added_by || user?.id || user?.email || user?.name || 'admin',
      company_id: formValues.company_id || user?.companyId || '1',
      branch_id: formValues.branch_id || user?.branchId || '1',
      created_at: formValues.created_at || nowIso,
      updated_at: formValues.updated_at || nowIso,
      // Add original purchase ID for return purchases - use the scanned purchase's ID
      originalPurchaseId: isReturnPurchase ? formValues.purchase_unique_id : undefined,
      // Add original purchase bill number for return purchases
      original_purchase_billno: isReturnPurchase ? formValues.original_purchase_billno : undefined,
    };

    console.log('Final safe data:', safeData);
    console.log('=== ORIGINAL PURCHASE BILL NO DEBUG ===');
    console.log('safeData.original_purchase_billno:', safeData.original_purchase_billno);
    console.log('safeData.originalPurchaseId:', safeData.originalPurchaseId);

    if (isReturnPurchase) {
      // Always create a new purchase for returns
      console.log('=== RETURN PURCHASE DEBUG ===');
      console.log('isReturnPurchase:', isReturnPurchase);
      console.log('safeData:', safeData);
      console.log('safeData.isreturned:', safeData.isreturned);

      const newPurchase: Purchase = {
        ...safeData,
        isreturned: 1,
      };
      console.log('newPurchase:', newPurchase);
      console.log('newPurchase.isreturned:', newPurchase.isreturned);

      await addPurchase(newPurchase);
      toast.success('Return purchase created successfully', { duration: 1000 });
      await updateInventoryAfterPurchase(safeLineItems);
      // Update product pricing by barcode only (no add)
      await Promise.all(
        safeLineItems.map(li => updateProductByBarcode(li.barcode, {
          retail_price: li.retail_price,
          purchase_price: li.purchase_price,
        } as any))
      );
    } else if (isUpdate && currentPurchase && !isReturnPurchase) {
      console.log('=== UPDATE PURCHASE DEBUG ===');
      console.log('isUpdate:', isUpdate);
      console.log('currentPurchase:', currentPurchase);
      console.log('isReturnPurchase:', isReturnPurchase);
      console.log('Updating existing purchase:', currentPurchase.purchase_unique_id);

      await updatePurchase(currentPurchase.purchase_unique_id, safeData);
      toast.success('Purchase updated successfully', { duration: 1000 });
      // Update inventory for each line item, using old line items for delta
      await updateInventoryAfterPurchase(safeLineItems, currentPurchase.purchase_items);
      await Promise.all(
        safeLineItems.map(li => updateProductByBarcode(li.barcode, {
          retail_price: li.retail_price,
          purchase_price: li.purchase_price,
        } as any))
      );
    } else {
      console.log('=== NEW PURCHASE DEBUG ===');
      console.log('isUpdate:', isUpdate);
      console.log('currentPurchase:', currentPurchase);
      console.log('isReturnPurchase:', isReturnPurchase);
      console.log('Creating new regular purchase');
      console.log('Safe data for new purchase:', safeData);

      try {
        const newPurchase: Purchase = { ...safeData };
        console.log('Final purchase object:', newPurchase);

        await addPurchase(newPurchase);
        toast.success('Purchase created successfully', { duration: 1000 });

        // On create, just add new quantities
        await updateInventoryAfterPurchase(safeLineItems);
        await Promise.all(
          safeLineItems.map(li => updateProductByBarcode(li.barcode, {
            retail_price: li.retail_price,
            purchase_price: li.purchase_price,
          } as any))
        );
      } catch (error) {
        console.error('=== PURCHASE CREATION ERROR ===');
        console.error('Error creating purchase:', error);
        toast.error(`Failed to create purchase: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return; // Don't close the drawer or reset form on error
      }
    }
    await Promise.all([refreshProducts(), refreshInventory()]);
    onOpenChange(false);

    // Preserve original purchase bill number when resetting form for return purchases
    if (isReturnPurchase && form.getValues('original_purchase_billno')) {
      const originalBillNo = form.getValues('original_purchase_billno');
      form.reset();
      form.setValue('original_purchase_billno', originalBillNo);
    } else {
      form.reset();
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        setLineItems([])
        setBarcodeInput('')
        setSearchResults([])
        setSelectedSearchIndex(-1)
        setLastScanned(null)

        // Preserve original purchase bill number when resetting form
        if (isReturnPurchase && form.getValues('original_purchase_billno')) {
          const originalBillNo = form.getValues('original_purchase_billno');
          form.reset();
          form.setValue('original_purchase_billno', originalBillNo);
        } else {
          form.reset();
        }
      }}
    >
      <SheetContent fullscreen className='ml-[16rem] w-screen max-w-none h-screen rounded-none border-none shadow-none pt-4 m-0 flex flex-col overflow-y-auto bg-background z-50 fixed inset-y-0 right-0'>
        {/* Fixed header */}
        <SheetHeader className="flex flex-row items-center justify-between sticky top-0 z-30 bg-background  px-4 py-2">
          <div>
            <SheetTitle>{isUpdate ? 'Edit Purchase' : isDelete ? 'Delete Purchase' : 'New Purchase'}</SheetTitle>
            <SheetDescription>
              {isUpdate ? 'Update purchase details and items.' : isDelete ? 'Are you sure you want to delete this purchase?' : 'Add a new purchase and update inventory.'}
            </SheetDescription>
          </div>
          <div className="flex flex-row items-center gap-2 ml-auto">
            <Button
              onClick={() => {
                if (currentPurchase && !canPurchaseBeReturned(currentPurchase)) {
                  const errors = validateReturnPurchase(currentPurchase);
                  toast.error(errors.join(', '));
                  return;
                }
                toggleReturnPurchase();
              }}
              variant={isReturnPurchase ? 'link' : 'outline'}
              size="sm"
              className={isReturnPurchase ? 'bg-primary text-white hover:bg-primary/90' : ''}
              style={{ minWidth: '130px' }}
              disabled={currentPurchase && !canPurchaseBeReturned(currentPurchase)}
            >
              Return Purchase
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="ghost"
              size="icon"
              aria-label="Close"
              className='flex items-center justify-center'
            >
              <span aria-hidden><IconX className="h-3 w-3" /></span>
            </Button>
          </div>
        </SheetHeader>
        <div
          className='flex-1 flex flex-row justify-between px-4 min-h-0'
        >
          {/* Left: Cart Section */}
          <div className='flex-1 min-w-0 max-w-[70%] h-[87vh] flex flex-col'>
            {/* Barcode Scanner */}
            <Card
              className='w-full h-[10%] mb-4'
              data-barcode-area="true"
              onClick={(e) => {
                // Prevent the click from bubbling up to the parent
                e.stopPropagation();
              }}
            >
              <CardContent className='p-4'>
                <div className='flex items-center gap-3'>
                  <div
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${hasUserInteracted ? 'bg-gray-100 hover:bg-gray-200' : 'bg-green-100'}`}
                    title={hasUserInteracted ? 'Scanner inactive - Click to reactivate' : 'Scanner active - Ready to scan'}
                    onClick={() => {
                      if (hasUserInteracted) {
                        setHasUserInteracted(false);
                        hasUserInteractedRef.current = false;
                        // Simple focus without being aggressive
                        if (inputRef.current) {
                          inputRef.current.focus();
                        }
                      }
                    }}
                  >
                    <IconBarcode className={`h-4 w-4 ${hasUserInteracted ? 'text-gray-600' : 'text-green-600'}`} />
                  </div>
                  <div className='flex-1 relative'>
                    <IconSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      ref={inputRef}
                      placeholder="Scan barcode or type product name..."
                      value={barcodeInput}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      onBlur={() => {
                        // Only mark as interacted if user actually clicked elsewhere
                        // Don't mark as interacted on programmatic blur
                      }}
                      className="pl-10 pr-4 h-9 text-sm"
                      autoFocus={false}
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-888 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((product, index) => (
                          <div
                            key={product.product_unique_id}
                            className={`flex items-center justify-between p-2 cursor-pointer ${index === selectedSearchIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                              }`}
                            onMouseEnter={() => setSelectedSearchIndex(index)}
                            onMouseDown={() => handleAddProductToLineItems(product)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.product_name}</p>
                              <p className={`text-sm truncate ${index === selectedSearchIndex
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                                }`}>
                                Barcode: {product.barcode} | Retail: {formatAmount(product.retail_price || 0)} | Wholesale: {formatAmount(product.wholesale_price || 0)} | Purchase: {formatAmount(product.purchase_price || 0)}
                              </p>
                              {(product.category_status === 'inactive' || product.product_status === 'inactive') && (
                                <div className="flex gap-1 mt-1">
                                  {product.category_status === 'inactive' && (
                                    <Badge variant="destructive" className="text-xs">Category Disabled</Badge>
                                  )}
                                  {product.product_status === 'inactive' && (
                                    <Badge variant="destructive" className="text-xs">Product Inactive</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddProductToLineItems(product)}
                              className={`flex-shrink-0 ml-2 ${index === selectedSearchIndex ? 'bg-primary-foreground text-primary' : ''
                                }`}
                              disabled={product.category_status === 'inactive' || product.product_status === 'inactive'}
                            >
                              Add to Cart
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setProductDrawerOpen(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3"
                  >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                {/* Status Message */}
                {lastScanned && lastScanned.message && (
                  <div className={`mt-2 p-2 rounded border transition-all duration-300 ${lastScanned.success
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
            {/* Cart Table */}
            <Card
              className="w-full flex flex-col flex-1"
              onClick={(e) => {
                // Prevent the click from bubbling up to the parent
                e.stopPropagation();
              }}
            >
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                {lineItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 bg-muted/50 rounded-full mb-4">
                      <IconPlus className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-lg mb-2">Cart is Empty</h3>
                    <p className="text-muted-foreground text-sm">
                      Scan products to add them to your cart
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background">
                          <TableRow className='!bg-grey-600'>
                            {!isReturnPurchase && <TableHead className="w-[200px]">Barcode</TableHead>}
                            <TableHead className="text-left">Product</TableHead>
                            <TableHead className="text-left">Brand</TableHead>
                            <TableHead className="text-left">Purchase Price</TableHead>
                            <TableHead className="text-left">Price</TableHead>
                            <TableHead className="text-left">Quantity</TableHead>
                            <TableHead className="text-left">Profit Margin</TableHead>
                            <TableHead className="text-left">Subtotal</TableHead>
                            <TableHead className="text-left">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item, idx) => {
                            const itemProfit = (Number(item.retail_price) - Number(item.purchase_price || 0)) * Number(item.quantity);
                            return (
                              <TableRow key={item.product_unique_id + '-' + idx}>
                                {!isReturnPurchase && (
                                  <TableCell className="text-left font-mono text-sm">{item.barcode}</TableCell>
                                )}
                                <TableCell>{item.product_name}</TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={item.brand || ''}
                                    readOnly
                                    className="h-8 text-sm w-24 bg-muted"
                                    onClick={handleFormFieldClick}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.purchase_price}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      handleLineItemChange(idx, 'purchase_price', isNaN(val) ? 0 : val);
                                    }}
                                    className="h-8 text-sm w-24"
                                    readOnly={isReturnPurchase}
                                    required={!isReturnPurchase}
                                    min={0.01}
                                    step={0.01}
                                    onClick={handleFormFieldClick}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.retail_price}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      handleLineItemChange(idx, 'retail_price', isNaN(val) ? 0 : val);
                                    }}
                                    className="h-8 text-sm w-24"
                                    readOnly={isReturnPurchase}
                                    required={!isReturnPurchase}
                                    min={0.01}
                                    step={0.01}
                                    onClick={handleFormFieldClick}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-start">
                                    <div className="flex items-center border rounded-lg">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleLineItemChange(idx, 'quantity', Math.max(1, Number(item.quantity) - 1))}
                                        className="h-8 w-8 p-0 hover:bg-red-600"
                                      >
                                        <IconMinus className="h-3 w-3" />
                                      </Button>
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          // Get the raw input value
                                          const rawValue = e.target.value;
                                          
                                          // If empty, allow it but don't update the state yet
                                          if (rawValue === '') {
                                            return;
                                          }
                                          
                                          // Parse the value as an integer
                                          const newValue = parseInt(rawValue, 10);
                                          
                                          // Only proceed if it's a valid number
                                          if (!isNaN(newValue)) {
                                            // For return purchases, validate against max returnable quantity
                                            if (isReturnPurchase && 'remainingReturnableQuantity' in item) {
                                              const maxReturnable = (item as any).remainingReturnableQuantity;
                                              if (newValue > maxReturnable) {
                                                toast.error(`Cannot return more than ${maxReturnable} units. Only ${maxReturnable} units remain returnable.`);
                                                return;
                                              }
                                            }
                                            // Update with the validated value (minimum 1)
                                            handleLineItemChange(idx, 'quantity', Math.max(1, newValue));
                                          }
                                        }}
                                        onBlur={(e) => {
                                          // If input is empty after blur, reset to 1
                                          if (e.target.value === '') {
                                            handleLineItemChange(idx, 'quantity', 1);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          // Prevent negative numbers and other invalid characters
                                          if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                                            e.preventDefault();
                                          }
                                        }}
                                        className="w-16 h-8 text-center border-0 focus:ring-1 focus:ring-primary focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const newQuantity = Number(item.quantity) + 1;
                                          // For return purchases, check if we can increase quantity
                                          if (isReturnPurchase && 'remainingReturnableQuantity' in item) {
                                            const maxReturnable = (item as any).remainingReturnableQuantity;
                                            if (newQuantity > maxReturnable) {
                                              toast.error(`Cannot return more than ${maxReturnable} units. Only ${maxReturnable} units remain returnable.`);
                                              return;
                                            }
                                          }
                                          handleLineItemChange(idx, 'quantity', newQuantity);
                                        }}
                                        className="h-8 w-8 p-0 hover:bg-green-600"
                                      >
                                        <IconPlus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    {isReturnPurchase && (
                                      <div className="text-xs text-muted-foreground mt-1 ml-2">
                                        <span>
                                          Original: {'originalPurchasedQuantity' in item ? (item as any).originalPurchasedQuantity : item.quantity}
                                        </span>
                                        {('originalPurchasedQuantity' in item && 'remainingReturnableQuantity' in item) && (
                                          <>
                                            <span className="ml-2 text-gray-500">
                                              | Returned: {(item as any).originalPurchasedQuantity - (item as any).remainingReturnableQuantity}
                                            </span>
                                            <span className="ml-2 text-orange-600">
                                              | Returnable: {(item as any).remainingReturnableQuantity}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                <TableCell>
                                  <span className="font-bold text-green-700">{formatAmount(itemProfit)}</span>
                                </TableCell>
                                <TableCell>
                                  <span className="font-bold text-sm text-primary">
                                    {formatAmount(Number(item.purchase_price) * Number(item.quantity))}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveLineItem(idx)}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <IconTrash className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <Separator />
                    <div className="p-4 border-t shrink-0">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Subtotal</span>
                        <div className="w-[34%] flex justify-between">
                          <span className="px-3 min-w-[2.5rem] text-left font-medium text-sm">
                            {lineItems.length} items
                          </span>
                          <span className="px-3 min-w-[2.5rem] text-left font-medium text-sm">
                            {totalQuantity} qty
                          </span>
                          <span className="text-primary">{formatAmount(totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Right: Supplier/Checkout Section */}
          <div className=' w-[420px] flex-shrink-0 h-[87vh] flex flex-col'>
            <Card
              className="w-full h-full mt-0 flex flex-col"
              onClick={(e) => {
                // Prevent the click from bubbling up to the parent
                e.stopPropagation();
              }}
            >
              <CardContent className="p-4 space-y-8 flex-1 flex flex-col">
                <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="flex flex-col flex-1 min-h-0">
                  {/* Use a grid for compact layout, matching purchase table fields exactly */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Date & Time</label>
                      <Input
                        className="w-full"
                        type="datetime-local"
                        {...form.register('created_at')}
                        onFocus={handleOtherInputFocus}
                        onClick={handleFormFieldClick}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">PO No</label>
                      <Input
                        className="w-full"
                        {...form.register('po_no')}
                        placeholder="Enter supplier's PO number"
                        onFocus={handleOtherInputFocus}
                        onClick={handleFormFieldClick}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Supplier Name</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            className="w-full"
                            placeholder="Search supplier name..."
                            value={selectedSupplierName || supplierSearch}
                            onChange={handleSupplierInputChange}
                            onFocus={handleSupplierInputFocus}
                            onBlur={() => {
                              setTimeout(() => {
                                if (!selectedSupplierName && supplierSearch) {
                                  setSupplierSearch('');
                                }
                                setSupplierDropdownOpen(false);
                              }, 300); // Increased delay
                            }}
                            onClick={handleFormFieldClick}
                            readOnly={isDelete}
                          />
                          {supplierDropdownOpen && filteredSuppliers && (
                            <div className="absolute z-50 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                              {filteredSuppliers.length > 0 ? (
                                filteredSuppliers.map(supplier => (
                                  <div
                                    key={supplier.account_unique_id || supplier.id}
                                    className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSupplierSelect(supplier);
                                    }}
                                  >
                                    <div className="font-medium text-sm flex justify-between items-center">
                                      <span>{supplier.fullname || supplier.name || 'Unnamed Supplier'}</span>
                                      {supplier.account_status === 'inactive' && (
                                        <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      {supplier.phone_no || supplier.phone ? (
                                        <span title="Phone">📞 {supplier.phone_no || supplier.phone}</span>
                                      ) : null}
                                      {supplier.email ? (
                                        <span title="Email" className="truncate max-w-[180px] block">✉️ {supplier.email}</span>
                                      ) : null}
                                    </div>
                                    {(supplier.address || supplier.company_name) && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {supplier.company_name && <div>🏢 {supplier.company_name}</div>}
                                        {supplier.address && <div className="truncate max-w-full" title={supplier.address}>📍 {supplier.address}</div>}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                  {suppliers.length === 0 ? (
                                    <div className="space-y-2">
                                      <p>No suppliers found</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setAccountDrawerOpen(true);
                                        }}
                                      >
                                        <IconPlus className="h-3 w-3 mr-1" /> Add New Supplier
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p>No suppliers found for "{supplierSearch}"</p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setAccountDrawerOpen(true);
                                        }}
                                      >
                                        <IconPlus className="h-3 w-3 mr-1" /> Add New Supplier
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAccountDrawerOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-9 px-3"
                        >
                          <IconPlus className="h-4 w-4 mr-2" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        {isReturnPurchase ? 'New Bill No' : 'Bill No'}
                      </label>
                      <Input
                        className="w-full"
                        {...form.register('purchase_billno')}
                        value={form.watch('purchase_billno') || generatedBillNo}
                        readOnly
                        onClick={handleFormFieldClick}
                      />
                      {isReturnPurchase && (
                        <span className="text-xs text-blue-600">
                          {/* New bill number will be generated for this return purchase */}
                        </span>
                      )}
                    </div>

                    {/* Original purchase bill number field for return purchases */}
                    {isReturnPurchase && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-blue-600">Original Purchase Bill No</label>
                        <Input
                          className="w-full bg-blue-50 border-blue-200"
                          {...form.register('original_purchase_billno')}
                          readOnly
                        />

                      </div>
                    )}

                    {/* <div className="space-y-2">
                      <label className="block text-sm font-medium">Company</label>
                      <Input className="w-full" {...form.register('company_id')} onFocus={handleOtherInputFocus} />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Received By</label>
                      <Input className="w-full" {...form.register('received_by')} value={form.watch('received_by') || user?.name || ''} readOnly />
                    </div> */}

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Paid Amount</label>
                      <Input
                        className="w-full"
                        type="number"
                        value={form.watch('paid_amount')}
                        onChange={e => setPaidAmount(Number(e.target.value) || 0)}
                        onFocus={handleOtherInputFocus}
                        onClick={handleFormFieldClick}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Payment Method</label>
                      <select
                        className="w-full p-2 border rounded-md bg-background"
                        value={form.watch('payment_method')}
                        onChange={(e) => form.setValue('payment_method', e.target.value as 'cash' | 'card' | 'ledger')}
                        onFocus={handleOtherInputFocus}
                        onClick={handleFormFieldClick}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="ledger">Credit (Ledger)</option>
                      </select>
                      <span className="text-xs text-muted-foreground">
                        {form.watch('payment_method') === 'ledger' ? 'Credit purchase - no cash required' : 'Cash/Card purchase - requires available balance'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Change</label>
                      <Input
                        className="w-full"
                        type="number"
                        value={form.watch('balance')}
                        readOnly
                        style={{ color: balance < 0 ? 'red' : balance > 0 ? 'green' : undefined }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {balance < 0 ? 'Supplier owes you' : balance > 0 ? 'You owe supplier (change)' : 'Settled'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Profit Margin</label>
                      <Input
                        className="w-full"
                        type="number"
                        value={form.watch('profit_margin')}
                        readOnly
                      />
                    </div>
                    <div className='space-y-2 grid grid-cols-2 gap-2 w-full'>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Item Count</label>
                        <Input className="w-full" type="number" {...form.register('item_count', { valueAsNumber: true })} value={lineItems.length} readOnly />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Items Qty</label>
                        <Input
                          className="w-full"
                          type="number"
                          value={totalQuantity}
                          readOnly
                        />
                      </div>
                    </div>

                  </div>
                  {/* Summary */}
                  <div className="flex justify-between items-center font-bold text-lg mt-4">
                    <span>Total</span>
                    <span className="text-primary">{formatAmount(totalAmount)}</span>
                  </div>
                  {/* Fixed footer with action button */}
                  <div className="sticky bottom-2 bg-background pt-4 pb-2 z-20 flex flex-col">
                    <Button
                      type="submit"
                      disabled={lineItems.length === 0}
                      className="w-full h-12 text-base font-medium mt-2 flex"
                      size="lg"
                    >
                      {isUpdate ? 'Update Purchase' : 'Add Purchase'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>

      <CategoryProvider>
        <ProductsMutateDrawer
          open={productDrawerOpen}
          onOpenChange={(open) => {
            setProductDrawerOpen(open);
            // If product drawer is closed without creating a product, clear the barcode input
            if (!open && newProductBarcode) {
              setBarcodeInput('');
              setNewProductBarcode(null);
            }
          }}
          onProductCreated={handleProductCreated}
          defaultBarcode={newProductBarcode}
        />
      </CategoryProvider>

      <AccountProvider>
        <AccountMutateDrawer
          open={accountDrawerOpen}
          onOpenChange={setAccountDrawerOpen}
          isEdit={false}
          onAccountCreated={handleAccountCreated}
        />
      </AccountProvider>
    </Sheet>
  )
} 