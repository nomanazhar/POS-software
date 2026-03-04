import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { IconBarcode, IconSearch, IconCheck, IconX } from '@tabler/icons-react'
import { useSales } from '../context/sales-context'
import type { Inventory } from '../../inventory/data/schema'
import { toast } from 'sonner'
import { useBillContext } from '@/features/bills/context/bill-context'
import type { BillLineItem } from '@/features/bills/data/schema'

interface BarcodeScannerProps {
  inventory: Inventory[]
  barcodeInputRef?: React.RefObject<HTMLInputElement>
}

export function BarcodeScanner({ inventory, barcodeInputRef }: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [lastScanned, setLastScanned] = useState<{ success: boolean; message: string, barcode: string | null } | null>(null)
  const [searchResults, setSearchResults] = useState<Inventory[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const { scanBarcode, addToCart, clearCart, isReturnSale, isQuotationToInvoice, setCustomerInfo, setAccountUniqueId, isQuotationMode, setBillValues, setSaleType,
    //  canBillBeReturned,
      validateReturnBill, setOriginalBillNo, state } = useSales() as any
  const { getBillById, bills } = useBillContext()

  // Custom item dialog state
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const customPriceInputRef = useRef<HTMLInputElement>(null)

  // Scanner detection state
  const [scannerBuffer, setScannerBuffer] = useState('')
  const [lastKeyTime, setLastKeyTime] = useState(0)
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [, setIsUserTyping] = useState(false)
  
  // Search results navigation state
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1)
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Helper: Convert BillLineItem[] to Inventory-like items
  const billItemsToInventoryItems = (items: BillLineItem[]): (Inventory & { originalSoldQuantity: number })[] => {
    console.log('billItemsToInventoryItems called with items:', items);
    return items.map(item => {
      console.log('Processing bill item:', item);
      const originalSoldQty = Number(item.item_qty || 0);
      console.log('Original sold quantity:', originalSoldQty, 'from item_qty:', item.item_qty);
      
      return {
        inventory_id: 0,
        inventory_unique_id: '',
        product_unique_id: item.product_unique_id || '',
        stock: 0, 
        retail_price: item.retail_price || 0,
        wholesale_price: item.retail_price || 0, // Use retail_price as fallback
        purchase_price: 0,
        barcode: '', // BillLineItem doesn't have barcode, use empty string
        product_name: item.product_name || '',
        category_name: null,
        alertqty: 0, // Add missing required property
        product_status: 'active', // Default to active for return items
        category_status: 'active', // Default to active for return items
        added_by: 'system',
        company_id: '1',
        branch_id: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        originalSoldQuantity: originalSoldQty,
      }
    })
  }

  // Global scanner detection and auto-focus management
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTime
      
      // Handle search results navigation when dropdown is open
      if (searchResults.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
          e.preventDefault();
          setSelectedSearchIndex(prev => {
            const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
            return newIndex;
          });
          break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedSearchIndex(prev => {
              const newIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
              return newIndex;
            });
            break;
          case 'Enter':
            e.preventDefault()
            if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
              // Add the selected product to cart
              handleAddProductToCart(searchResults[selectedSearchIndex])
              setBarcodeInput('')
              setSelectedSearchIndex(-1)
              setSearchResults([])
              return
            } else if (searchResults.length > 0) {
              // If no selection, add the first result to cart
              handleAddProductToCart(searchResults[0])
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
      
      // Only detect scanner input if we're not currently in any input field
      const isInAnyInput = document.activeElement?.tagName === 'INPUT' || 
                          document.activeElement?.tagName === 'TEXTAREA' ||
                          (document.activeElement as HTMLElement)?.contentEditable === 'true'
      
      // Detect scanner input pattern (fast consecutive keystrokes) - only when not in any input
      if (!isInAnyInput && timeDiff < 10 && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const targetInput = barcodeInputRef?.current || inputRef.current
        
        if (targetInput) {
          // Only force focus if we're not already in the barcode input
          if (document.activeElement !== targetInput) {
            e.preventDefault()
            e.stopPropagation()
            targetInput.focus()
            
            // Set scanner state after focus is established
            setTimeout(() => {
              setIsScannerActive(true)
              setScannerBuffer(prev => prev + e.key)
            }, 10)
          } else {
            // User is already typing in barcode input - treat as normal typing
            setScannerBuffer(prev => prev + e.key)
            setIsScannerActive(false)
          }
          
          // Clear existing timeout
          if (scannerTimeoutRef.current) {
            clearTimeout(scannerTimeoutRef.current)
          }
          
          // Set timeout to process scanner input
          scannerTimeoutRef.current = setTimeout(() => {
            if (scannerBuffer.length > 0) {
              // Process the scanned barcode
              handleBarcodeSubmit(scannerBuffer)
              setScannerBuffer('')
              setIsScannerActive(false)
            }
          }, 150) // Wait 150ms after last keystroke to process
        }
      } else if (e.key === 'Enter' && scannerBuffer.length > 0 && searchResults.length === 0 && !isInAnyInput) {
        // Handle Enter key from scanner - only if no search results and not in any input
        e.preventDefault()
        const targetInput = barcodeInputRef?.current || inputRef.current
        if (targetInput) {
          targetInput.focus()
        }
        handleBarcodeSubmit(scannerBuffer)
        setScannerBuffer('')
        setIsScannerActive(false)
      } else if (e.key.length === 1 && !isInAnyInput) {
        // Regular typing outside of input fields - reset scanner detection
        setScannerBuffer(e.key)
        setIsScannerActive(false)
      }
      
      setLastKeyTime(currentTime)
    }

    const handleGlobalFocus = () => {
      // Only auto-focus scanner input when window gains focus AND no other input is focused
      const isInAnyInput = document.activeElement?.tagName === 'INPUT' || 
                          document.activeElement?.tagName === 'TEXTAREA' ||
                          (document.activeElement as HTMLElement)?.contentEditable === 'true'
      
      if (!isInAnyInput) {
        const targetInput = barcodeInputRef?.current || inputRef.current
        if (targetInput && !document.activeElement?.closest('.barcode-scanner')) {
          setTimeout(() => {
            // Double-check that no input is focused before forcing focus
            const currentFocus = document.activeElement
            const stillNoInputFocused = currentFocus?.tagName !== 'INPUT' && 
                                      currentFocus?.tagName !== 'TEXTAREA' &&
                                      (currentFocus as HTMLElement)?.contentEditable !== 'true'
            
            if (stillNoInputFocused) {
              targetInput.focus()
            }
          }, 100) // Increased delay to allow other focus events to settle
        }
      }
    }

   
    // Add global event listeners
    document.addEventListener('keydown', handleGlobalKeyDown, true)
    window.addEventListener('focus', handleGlobalFocus)
    
    // Initial focus - only if no other input is focused
    const isInAnyInput = document.activeElement?.tagName === 'INPUT' || 
                        document.activeElement?.tagName === 'TEXTAREA' ||
                        (document.activeElement as HTMLElement)?.contentEditable === 'true'
    
    if (!isInAnyInput) {
      const targetInput = barcodeInputRef?.current || inputRef.current
      if (targetInput) {
        targetInput.focus()
      }
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true)
      window.removeEventListener('focus', handleGlobalFocus)
      // clearInterval(focusMonitor) // Removed
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current)
      }
    }
  }, [barcodeInputRef, lastKeyTime, scannerBuffer, isScannerActive, searchResults, selectedSearchIndex])

  useEffect(() => {
  if (selectedSearchIndex >= 0 && searchResultsRef.current) {
    const selectedItem = searchResultsRef.current.querySelector(`[data-index="${selectedSearchIndex}"]`) as HTMLElement;
    if (selectedItem) {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }
}, [selectedSearchIndex]);
  const handleSearch = (query: string) => {
    if (query.length > 1) {
      const results = inventory.filter(p => {
        const productName = (p as any).productName || (p as any).product_name || '';
        const barcode = (p as any).barcode || (p as any).product_barcode || '';
        const productStatus = (p as any).product_status || 'active';
        const categoryStatus = (p as any).category_status || 'active';
        const searchTerm = query.toLowerCase();
        
        // Only include active products from active categories in search results
        return productStatus === 'active' && categoryStatus === 'active' && (
          productName.toLowerCase().includes(searchTerm) ||
          barcode.toLowerCase().includes(searchTerm)
        );
      });
      setSearchResults(results);
      setSelectedSearchIndex(-1); // Reset selection when search results change
    } else {
      setSearchResults([]);
      setSelectedSearchIndex(-1);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBarcodeInput(value)
    
    // Mark that user is actively typing
    setIsUserTyping(true)
    
    // Only search if not in scanner mode to avoid conflicts
    if (!isScannerActive) {
      handleSearch(value)
    }
    
    // Reset user typing flag after a longer delay to prevent conflicts
    setTimeout(() => {
      setIsUserTyping(false)
    }, 1000) // Increased from 500ms to 1000ms
  }

  const handleBarcodeSubmit = async (barcode: string) => {
    if (!barcode.trim()) return

    if (!isReturnSale && !isQuotationToInvoice) {
      // Enhanced inventory search with better error handling
      const inventoryList = inventory.find(p => {
        const productBarcode = (p as any).barcode || (p as any).product_barcode || '';
        return productBarcode === barcode;
      });
      
      if (inventoryList) {
        // Check if category is disabled
        const categoryStatus = (inventoryList as any).category_status || 'active';
        if (categoryStatus === 'inactive') {
          const productName = (inventoryList as any).product_name || (inventoryList as any).productName || 'Product';
          setLastScanned({ success: false, message: `Category disabled: ${productName}`, barcode });
          toast.error(`Cannot add product: Category is disabled`);
          setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Category disabled') ? { ...prev, message: '' } : prev), 2000);
          return;
        }

        // Check if product is inactive
        const productStatus = (inventoryList as any).product_status || 'active';
        if (productStatus === 'inactive') {
          const productName = (inventoryList as any).product_name || (inventoryList as any).productName || 'Product';
          setLastScanned({ success: false, message: `Product inactive: ${productName}`, barcode });
          toast.error(`Cannot add inactive product: ${productName}`);
          setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Product inactive') ? { ...prev, message: '' } : prev), 2000);
          return;
        }
        
        // Enhanced stock validation
        if (!isQuotationMode && inventoryList.stock <= 0) {
          setLastScanned({ success: false, message: `Stock ended: ${(inventoryList as any).productName}`, barcode });
          toast.error(`Stock ended for ${(inventoryList as any).productName}`);
          setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Stock ended') ? { ...prev, message: '' } : prev), 2000);
          return;
        }
        
        // Check if adding this product would exceed stock limit
        if (!isQuotationMode) {
          // Get current cart from sales context
          const currentBill = state.bills.find((bill: any) => bill.bill_unique_id === state.currentBillId);
          if (currentBill) {
            const currentBillItems = JSON.parse(currentBill.bill_items || '[]');
            const existingItem = currentBillItems.find((item: any) => 
              item.product_unique_id === inventoryList.product_unique_id || 
              item.barcode === barcode
            );
            
            const currentQuantity = existingItem ? existingItem.quantity : 0;
            const availableStock = inventoryList.stock || 0;
            
            if (currentQuantity >= availableStock) {
              setLastScanned({ 
                success: false, 
                message: `Stock limit reached: ${(inventoryList as any).productName} (${currentQuantity}/${availableStock})`, 
                barcode 
              });
              toast.error(`Cannot add more: Stock limit reached (${currentQuantity}/${availableStock})`);
              setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Stock limit reached') ? { ...prev, message: '' } : prev), 3000);
              return;
            }
          }
        }
        
        // Enhanced product data validation
        const productData = {
          ...inventoryList,
          product_name: (inventoryList as any).product_name || (inventoryList as any).productName || 'Unknown Product',
          barcode: (inventoryList as any).barcode || (inventoryList as any).product_barcode || barcode,
          retail_price: (inventoryList as any).retail_price || (inventoryList as any).price || 0,
          wholesale_price: (inventoryList as any).wholesale_price || (inventoryList as any).retail_price || 0,
        };
        
        scanBarcode(barcode, [productData]);
        setLastScanned({ success: true, message: productData.product_name, barcode });
        setBarcodeInput('');
        setSearchResults([]);
        setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1500);
      } else {
        if (isQuotationMode) {
          // Open dialog to capture price for custom item
          setCustomName(barcode);
          setCustomPrice('');
          setCustomDialogOpen(true);
          return;
        } else {
          setLastScanned({ success: false, message: 'Product not found in inventory', barcode });
          setBarcodeInput('');
          setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 2000);
        }
      }
    } else if (isReturnSale) {
      console.log('Return sale mode: scanning for bill with barcode:', barcode);
      
      // Debug: Check what bills are available in the database
      try {
        if (window.electronAPI) {
          const debugResult = await window.electronAPI.invoke('debug:checkBillsForReturn');
          console.log('Debug: Bills in database:', debugResult);
          
          // Test inventory update logic
          const inventoryTest = await window.electronAPI.invoke('debug:testReturnSaleInventory');
          console.log('Debug: Inventory test result:', inventoryTest);
        }
      } catch (debugError) {
        console.warn('Debug call failed:', debugError);
      }
      
      const bill = getBillById(barcode)
      console.log('Found bill:', bill);
      if (bill) {
        // Check if bill can be returned using validation function
        try {
          const errors = await validateReturnBill(bill);
          if (errors.length > 0) {
            setLastScanned({ success: false, message: errors.join(', '), barcode })
            setBarcodeInput('')
            setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 2000)
            toast.error(errors.join(', '))
            return;
          }
        } catch (error) {
          console.error('Error validating return bill:', error);
          setLastScanned({ success: false, message: 'Error validating bill', barcode })
          setBarcodeInput('')
          setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 2000)
          toast.error('Error validating bill')
          return;
        }
        
        console.log('Bill items:', bill.bill_items);
        clearCart()
        
        // Load bill-level details for return sale
        if (bill.account_unique_id) {
          setAccountUniqueId(bill.account_unique_id);
        }
        
        // Set bill values (discount, tax, extra charges)
        setBillValues({
          total_discount: bill.total_discount || 0,
          total_tax: bill.total_tax || 0,
          extracharges: bill.extracharges || 0
        });
        
        // Set sale type if different from current
        if (bill.sale_type && bill.sale_type !== 'retail') {
          setSaleType(bill.sale_type);
        }
        
        // Store original bill number for return tracking
        if (isReturnSale) {
          console.log('=== DEBUG: Setting original bill number ===');
          console.log('Bill billno:', bill.billno);
          console.log('Setting original bill number for return sale');
          setOriginalBillNo(bill.billno);
          console.log('=== END DEBUG ===');
        }
        
        const cartItems = billItemsToInventoryItems(bill.bill_items)
        console.log('Converted cart items:', cartItems);
        cartItems.forEach(item => {
          console.log('Adding item to cart:', item);
          addToCart(item as any)
        })
        setLastScanned({ success: true, message: `Bill loaded: ${bill.billno}`, barcode })
        setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
        setBarcodeInput('')
        setSearchResults([])
        
        // Show success message with customer and bill details
        const customerInfo = bill.account_unique_id === '1_1_walkin_customer' ? 'Walk-in Customer' : `Customer: ${bill.account_unique_id}`;
        const billDetails = [
          bill.total_discount > 0 ? `Discount: $${bill.total_discount.toFixed(2)}` : null,
          bill.total_tax > 0 ? `Tax: $${bill.total_tax.toFixed(2)}` : null,
          bill.extracharges > 0 ? `Extra: $${bill.extracharges.toFixed(2)}` : null
        ].filter(Boolean).join(', ');
        
        toast.success(`Bill ${bill.billno} loaded for return - ${customerInfo}${billDetails ? ` (${billDetails})` : ''}`);
      } else {
        console.log('Bill not found for barcode:', barcode);
        console.log('Available bills in context:', bills);
        setLastScanned({ success: false, message: 'Bill not found', barcode })
        setBarcodeInput('')
        setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
        toast.error('Bill not found')
      }
    } else if (isQuotationToInvoice) {
      try {
        if (!window.electronAPI) throw new Error('Electron API not available')
        
        console.log('Scanning for quotation with barcode:', barcode)
        const quotations = await window.electronAPI.invoke('quotations:getAll')
        console.log('Retrieved quotations:', quotations)
        
        if (!Array.isArray(quotations)) {
          console.error('Quotations response is not an array:', quotations)
          toast.error('Invalid quotations data received')
          return
        }
        
        const quote = Array.isArray(quotations) ? quotations.find((q: any) => {
          // Look for quotation by quotationno (the actual field name in database)
          const id = String(q.quotationno || q.quotation_id || q.quotationId || '')
          console.log('Checking quotation:', q.quotationno, 'against barcode:', barcode)
          return id === String(barcode)
        }) : null
        
        console.log('Found quotation:', quote)
        if (quote) {
          clearCart()
          
          // Parse quotation items from JSON string
          let items: any[] = []
          try {
            if (typeof quote.quotation_items === 'string') {
              items = JSON.parse(quote.quotation_items)
            } else if (Array.isArray(quote.quotation_items)) {
              items = quote.quotation_items
            }
            
            // Validate items structure
            if (!Array.isArray(items)) {
              console.error('Quotation items is not an array:', items)
              items = []
            }
          } catch (e) {
            console.error('Failed to parse quotation items:', e)
            items = []
          }
          
          console.log('Parsed quotation items:', items)
          
          // Validate that we have items to load
          if (!items || items.length === 0) {
            toast.error('Quotation has no items to load')
            setLastScanned({ success: false, message: 'Quotation has no items', barcode })
            return
          }
          
          // Map quotation items to cart items with proper field mapping
          const cartItems: any[] = (items || []).map((it: any) => {
            console.log('Processing quotation item:', it)
            const mappedItem = {
              product_unique_id: String(it.product_unique_id || it.productId || ''),
              product_name: String(it.product_name || it.productName || ''),
              barcode: String(it.barcode || ''),
              retail_price: Number(it.retail_price || it.unit_price || it.unitPrice || it.price || 0),
              wholesale_price: Number(it.wholesale_price || it.retail_price || it.unit_price || it.unitPrice || it.price || 0),
              purchase_price: Number(it.purchase_price || 0),
              quantity: Number(it.quantity || it.item_qty || 0),
              stock: Number(it.stock || 0),
              discount: Number(it.discount || 0),
              tax: Number(it.tax || 0),
              // Add missing fields required by BillItem schema
              unit_price: Number(it.retail_price || it.unit_price || it.unitPrice || it.price || 0),
              total_price: Number(it.total_price || (Number(it.retail_price || it.unit_price || it.unitPrice || it.price || 0) * Number(it.quantity || it.item_qty || 0))),
              is_returned: 0,
              item_qty: Number(it.quantity || it.item_qty || 0),
              added_by: 'system',
              company_id: '1',
              branch_id: '1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            console.log('Mapped item:', mappedItem)
            return mappedItem
          })
          
          // Validate mapped items
          const validItems = cartItems.filter(item => {
            const isValid = item.product_unique_id && 
              item.product_name && 
              item.quantity > 0 && 
              item.retail_price > 0
            if (!isValid) {
              console.warn('Invalid item filtered out:', item)
            }
            return isValid
          })
          
          if (validItems.length === 0) {
            toast.error('No valid items found in quotation')
            setLastScanned({ success: false, message: 'No valid items in quotation', barcode })
            return
          }
          
          console.log('Valid items to add to cart:', validItems)
          
          // Add items to cart
          validItems.forEach(item => addToCart(item as any))
          
          // Fetch customer details from accounts table
          let customerName = ''
          let customerPhone = ''
          
          if (quote.account_unique_id && quote.account_unique_id !== '1_1_walkin_customer') {
            try {
              const accounts = await window.electronAPI.invoke('accounts:getAll')
              const customer = Array.isArray(accounts) ? accounts.find((acc: any) => 
                acc.account_unique_id === quote.account_unique_id
              ) : null
              
              if (customer) {
                customerName = String(customer.fullname || '')
                customerPhone = String(customer.phone_no || '')
              }
            } catch (e) {
              console.error('Failed to fetch customer details:', e)
            }
          }
          
          // Set customer information
          if (customerName) {
            setCustomerInfo(customerName, customerPhone)
          }
          
          // Set customer ID
          if (quote.account_unique_id && quote.account_unique_id.trim() !== '') {
            setAccountUniqueId(quote.account_unique_id)
          }
          
          // Set bill values from quotation (total discount, tax, etc.)
          setBillValues({
            total_discount: Number(quote.discount_amount || 0),
            total_tax: Number(quote.tax_amount || 0),
            extracharges: 0 // Quotations don't have extra charges field
          })
          
          // Set sale type if different from current
          if (quote.sale_type && quote.sale_type !== 'retail') {
            setSaleType(quote.sale_type)
          }
          
          const qid = String(quote.quotationno || quote.quotation_id || '')
          setLastScanned({ success: true, message: `Quotation loaded: ${qid}`, barcode })
          setBarcodeInput('')
          setSearchResults([])
          
          // Show success message with customer and quotation details
          const customerInfo = customerName || (quote.account_unique_id === '1_1_walkin_customer' ? 'Walk-in Customer' : `Customer ID: ${quote.account_unique_id}`)
          const quotationDetails = [
            quote.discount_amount > 0 ? `Discount: $${Number(quote.discount_amount).toFixed(2)}` : null,
            quote.tax_amount > 0 ? `Tax: $${Number(quote.tax_amount).toFixed(2)}` : null,
            `Total: $${Number(quote.total_amount).toFixed(2)}`
          ].filter(Boolean).join(', ')
          
          toast.success(`Quotation ${qid} loaded - ${customerInfo} (${quotationDetails})`)
        } else {
          setLastScanned({ success: false, message: 'Quotation not found', barcode })
          setBarcodeInput('')
          setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1000)
          toast.error('Quotation not found')
        }
      } catch (err) {
        setLastScanned({ success: false, message: 'Failed to load quotation', barcode })
        toast.error('Failed to load quotation')
      }
    }
  }

  const handleAddProductToCart = (inventory: Inventory) => {
    // Check if product is inactive
    const productStatus = (inventory as any).product_status || 'active';
    if (productStatus === 'inactive') {
      const productName = (inventory as any).product_name || (inventory as any).productName || 'Product';
      setLastScanned({ success: false, message: `Product inactive: ${productName}`, barcode: (inventory as any).barcode || (inventory as any).product_barcode });
      toast.error(`Cannot add inactive product: ${productName}`);
      setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Product inactive') ? { ...prev, message: '' } : prev), 3000);
      return;
    }
    
    // Enhanced stock validation
    if (!isQuotationMode && inventory.stock <= 0) {
      const productName = (inventory as any).productName || (inventory as any).product_name || 'Product';
      setLastScanned({ success: false, message: `Stock ended: ${productName}`, barcode: (inventory as any).barcode || (inventory as any).product_barcode });
      toast.error(`Stock ended for ${productName}`);
      setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Stock ended') ? { ...prev, message: '' } : prev), 3000);
      return;
    }
    
    // Check if adding this product would exceed stock limit
    if (!isQuotationMode) {
      // Get current cart from sales context
      const currentBill = state.bills.find((bill: any) => bill.bill_unique_id === state.currentBillId);
      if (currentBill) {
        const currentBillItems = JSON.parse(currentBill.bill_items || '[]');
        const existingItem = currentBillItems.find((item: any) => 
          item.product_unique_id === inventory.product_unique_id || 
          item.barcode === inventory.barcode
        );
        
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        const availableStock = inventory.stock || 0;
        
        if (currentQuantity >= availableStock) {
          setLastScanned({ 
            success: false, 
            message: `Stock limit reached: ${(inventory as any).product_name || (inventory as any).productName} (${currentQuantity}/${availableStock})`, 
            barcode: (inventory as any).barcode || (inventory as any).product_barcode 
          });
          toast.error(`Cannot add more: Stock limit reached (${currentQuantity}/${availableStock})`);
          setTimeout(() => setLastScanned(prev => prev && prev.message.includes('Stock limit reached') ? { ...prev, message: '' } : prev), 3000);
          return;
        }
      }
    }
    
    // Enhanced product data validation
    const productData = {
      ...inventory,
      product_name: inventory.product_name || 'Unknown Product',
      barcode: inventory.barcode || '',
      retail_price: inventory.retail_price || 0,
      wholesale_price: inventory.wholesale_price || inventory.retail_price || 0,
      purchase_price: inventory.purchase_price || 0,
      category_name: inventory.category_name || '',
    };
    
    console.log('Product data being added to cart:', productData);
    addToCart(productData);
    setBarcodeInput('');
    setSearchResults([]);
    setLastScanned({ 
      success: true, 
      message: `${productData.product_name} added to cart`, 
      barcode: productData.barcode 
    });
    setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 3000);
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Only handle Enter for barcode submission when no search results
    if (e.key === 'Enter' && searchResults.length === 0) {
      e.preventDefault()
      handleBarcodeSubmit(barcodeInput)
    }
  }
  return (
    <Card className="w-full barcode-scanner">
      <CardContent className="p-0">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg transition-colors ${
            isScannerActive ? 'bg-blue-100' : 'bg-green-100'
          }`} title={isScannerActive ? 'Scanner active - Processing barcode' : 'Scanner ready - Waiting for input'}>
            <IconBarcode className={`h-4 w-4 ${
              isScannerActive ? 'text-blue-600' : 'text-green-600'
            }`} />
          </div>

          {/* Input */}
          <div className="flex-1 relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={barcodeInputRef || inputRef}
              autoFocus
              placeholder={isReturnSale ? 'Scan or enter Bill ID...' : (isQuotationToInvoice ? 'Scan or enter Quotation No...' : (isQuotationMode ? 'Scan barcode or type custom item name...' : 'Scan barcode or type product name...'))}
              value={barcodeInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={() => {
                // Clear scanner buffer when manually focusing
                setScannerBuffer('')
                setIsScannerActive(false)
                setIsUserTyping(true) // Mark as user typing when manually focused
              }}
              onBlur={() => {
                // Reset user typing flag when leaving the input
                setTimeout(() => {
                  setIsUserTyping(false)
                }, 200)
              }}
              className="pl-10 pr-4 h-9 text-sm"
            />
            {searchResults.length > 0 && (
  <div 
    ref={searchResultsRef}
    className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto"
  >
    {searchResults.map((product, index) => (
      <div 
        key={(product as any).product_unique_id || (product as any).productId} 
        data-index={index}
        className={`flex items-center justify-between p-2 cursor-pointer ${
          index === selectedSearchIndex 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-muted'
        }`}
        onMouseEnter={() => setSelectedSearchIndex(index)}
        onMouseDown={() => handleAddProductToCart(product)}
      >
        <div>
          <p className="font-medium">{(product as any).product_name || (product as any).productName}</p>
          <p className={`text-sm ${
            index === selectedSearchIndex 
              ? 'text-primary-foreground/70' 
              : 'text-muted-foreground'
          }`}>
            Barcode: {(product as any).barcode || (product as any).product_barcode} | 
            Retail: {(product as any).retail_price?.toFixed(2) || '0.00'} | 
            Wholesale: {(product as any).wholesale_price?.toFixed(2) || '0.00'} | 
            Purchase: {(product as any).purchase_price?.toFixed(2) || '0.00'} | 
            Stock: {product.stock}
          </p>
        </div>
        <Button 
          size="sm" 
          onClick={() => handleAddProductToCart(product)}
          variant={index === selectedSearchIndex ? "secondary" : "default"}
        >
          Add to Cart
        </Button>
      </div>
    ))}
  </div>
)}
          </div>

          {/* Last Used Barcode */}
          {lastScanned && lastScanned.barcode && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBarcodeSubmit(lastScanned.barcode!)}
                className="h-9 px-2 text-xs font-mono"
                title={lastScanned.barcode}
              >
                {lastScanned.barcode}
              </Button>
            </div>
          )}
        </div>

        {/* Status Message */}
        {(lastScanned && lastScanned.message) || isScannerActive ? (
          <div className={`mt-3 p-2 rounded border transition-all duration-300 ${
            isScannerActive 
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : lastScanned?.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              {isScannerActive ? (
                <IconBarcode className="h-3 w-3 text-blue-600 animate-pulse" />
              ) : lastScanned?.success ? (
                <IconCheck className="h-3 w-3 text-green-600" />
              ) : (
                <IconX className="h-3 w-3 text-red-600" />
              )}
              <span className="text-xs font-medium">
                {isScannerActive ? `Processing barcode: ${scannerBuffer}` : lastScanned?.message}
              </span>
            </div>
          </div>
        ) : null}
      </CardContent>

      {/* Custom Item Dialog */}
      <AlertDialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add custom item</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-sm">
              <div className="text-muted-foreground">Item name</div>
              <div className="font-medium">{customName}</div>
            </div>
            <div>
              <Input
                ref={customPriceInputRef}
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Enter price"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={() => {
                const price = Number(customPrice)
                if (!isFinite(price) || price < 0) {
                  toast.error('Invalid price')
                  return
                }
                const ts = Date.now()
                const customItem: Inventory = {
                  productId: `CUSTOM-${ts}`,
                  unique_id: `custom_${ts}`,
                  productName: customName,
                  barcode: `CUSTOM_${ts}`,
                  stock: 0,
                  price,
                  wholesalePrice: price,
                  purchaseprice: 0,
                  supplier: '',
                  alertQuantity: 0,
                  category: '',
                  discount: 0,
                  tax: 0,
                  added_By: 'system',
                  company_id: '1',
                  branch_id: '1',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                } as any
                addToCart(customItem as any)
                setLastScanned({ success: true, message: `${(customItem as any).productName} (custom)`, barcode: (customItem as any).barcode })
                setBarcodeInput('')
                setSearchResults([])
                setCustomDialogOpen(false)
                setTimeout(() => setLastScanned(prev => prev ? { ...prev, message: '' } : null), 1200)
              }}
            >
              Add
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
} 