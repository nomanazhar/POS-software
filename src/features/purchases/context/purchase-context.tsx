import React, { useEffect, useState } from 'react'
import { Purchase, PurchaseLineItem } from '../data/schema'
import useDialogState from '@/hooks/use-dialog-state'
import { toast } from 'sonner'
import { eventEmitter } from '@/lib/event-emitter'
import { useInventory } from '@/features/inventory/context/inventory-context'
// import { useAuthStore } from '@/stores/authStore'

type PurchaseDialogType = 'create' | 'update' | 'delete' | 'view'

interface PurchaseContextType {
  purchases: Purchase[]
  loading: boolean
  error: string | null
  addPurchase: (purchase: Purchase) => Promise<void>
  updatePurchase: (id: string, purchase: Purchase) => Promise<void>
  deletePurchase: (id: string) => Promise<void>
  getPurchaseById: (id: string) => Purchase | undefined
  open: PurchaseDialogType | null
  setOpen: (str: PurchaseDialogType | null) => void
  currentPurchase: Purchase | null
  setCurrentPurchase: React.Dispatch<React.SetStateAction<Purchase | null>>
  refresh: () => Promise<void>
  isReturnPurchase: boolean
  toggleReturnPurchase: () => void
  // Add validation functions for return purchases
  canPurchaseBeReturned: (purchase: Purchase) => boolean
  validateReturnPurchase: (purchase: Purchase) => string[]
}

interface Props {
  children: React.ReactNode
}

// Helper function to validate and transform database data
const validatePurchaseData = (data: any[]): Purchase[] => {
  
  if (!Array.isArray(data)) {
    console.error('Database returned non-array data:', data);
    return [];
  }
  
  return data
    .map((item, index) => {
      try {
        // Ensure item is an object
        if (!item || typeof item !== 'object') {
          console.error(`Invalid item at index ${index}:`, item);
          return null;
        }
        
        // Transform backend data to match frontend schema
        const transformedItem: Purchase = {
          purchase_id: item.purchaseId,
          purchase_unique_id: String(item.unique_id || item.purchase_unique_id || `PUR-${Date.now()}-${index}`),
          account_unique_id: String(item.supplier_unique_id || item.account_unique_id || ''),
          purchase_billno: String(item.billNo || item.purchase_billno || ''),
          po_no: String(item.po_no || ''),
          received_by: String(item.receivedBy || item.received_by || ''),
          total_amount: Math.max(0, Number(item.totalAmount || item.total_amount) || 0),
          paid_amount: Number(item.paidAmount || item.paid_amount) || 0,
          balance: Number(item.balance) || 0,
          profit_margin: Number(item.profitMargin || item.profit_margin) || 0,
          item_count: Number(item.itemCount || item.item_count) || 0,
          isreturned: Number(item.isReturned || item.is_returned || 0),
          purchase_items: Array.isArray(item.lineItems)
            ? item.lineItems.map((li: any, liIdx: number) => {
                try {
                  const safeLineItem: PurchaseLineItem = {
                    product_unique_id: li.productId || li.product_unique_id || `${Date.now()}_${liIdx}`,
                    product_name: li.productName || li.product_name || 'Unknown Product',
                    barcode: li.barcode || '',
                    quantity: Number(li.quantity || li.item_qty) || 0,
                    retail_price: Number(li.price || li.retail_price) || 0,
                    purchase_price: Number(li.purchaseprice || li.purchase_price) || 0,
                    wholesale_price: Number(li.wholesaleRate || li.wholesale_rate || li.wholesale_price) || 0,
              
                  };
                  return safeLineItem;
                } catch (err) {
                  console.error(`Invalid line item at purchase[${index}].lineItems[${liIdx}]:`, li, err);
                  return null;
                }
              }).filter(Boolean)
            : [],
          added_by: String(item.added_By || item.added_by || 'admin'),
          company_id: String(item.company_id || '1'),
          branch_id: String(item.branch_id || '1'),
          payment_method:(item.payment_method || 'cash'),
          original_purchase_billno: String(item.original_purchase_billno || ''),
          created_at: String(item.dateTime || item.created_at || new Date().toISOString()),
          updated_at: String(item.updated_at || new Date().toISOString()),
        };
        
        // No need to parse with Zod schema here since it's already typed
        return transformedItem;
      } catch (error) {
        console.error(`Invalid purchase item at index ${index}:`, item, error)
        return null;
      }
    })
    .filter((item): item is Purchase => item !== null)
};

const PurchaseContext = React.createContext<PurchaseContextType | undefined>(undefined)

export default function PurchaseProvider({ children }: Props) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useDialogState<PurchaseDialogType>(null)
  const [currentPurchase, setCurrentPurchase] = useState<Purchase | null>(null)
  const [isReturnPurchase, setIsReturnPurchase] = useState(false)
  const { refresh: refreshInventory } = useInventory()
  // const user = useAuthStore((s) => s.auth.user)

  const toggleReturnPurchase = () => {
    setIsReturnPurchase(!isReturnPurchase)
  }

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (window.electronAPI) {
        console.log('Fetching purchase data from Electron...');
        const response = await window.electronAPI.invoke('purchases:getAll');
        console.log('Raw purchase response from Electron:', response);
        
        // Handle backend response format
        if (response.success) {
          const purchasesData = response.data || [];
          const validatedData = validatePurchaseData(purchasesData);
          console.log('Validated purchase data:', validatedData);
          console.log('Purchase IDs:', validatedData.map(p => ({ id: p.purchase_id, unique_id: p.purchase_unique_id })));
          
          setPurchases(validatedData);
        } else {
          console.error('Failed to fetch purchases:', response.error);
          setError(response.error || 'Failed to fetch purchases');
          setPurchases([]);
        }
      } else {
        console.warn('Electron API not available, using empty purchases');
        setPurchases([]);
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  const addPurchase = async (purchase: Purchase) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      console.log('=== FRONTEND PURCHASE DATA ===');
      console.log('Original purchase data:', purchase);
      console.log('Purchase items count:', purchase.purchase_items?.length || 0);

      const response = await window.electronAPI.invoke('purchases:add', {
        ...purchase,
        // Ensure we send only the required 19 fields
        unique_id: purchase.purchase_unique_id,
        supplier_unique_id: purchase.account_unique_id,
        billNo: purchase.purchase_billno,
        po_no: purchase.po_no,
        receivedBy: purchase.received_by,
        totalAmount: purchase.total_amount,
        paidAmount: purchase.paid_amount,
        balance: purchase.balance,
        profitMargin: purchase.profit_margin,
        itemCount: purchase.item_count,
        isReturned: purchase.isreturned,
        lineItems: purchase.purchase_items,
        added_By: purchase.added_by,
        company_id: purchase.company_id,
        branch_id: purchase.branch_id,
        created_at: purchase.created_at,
        updated_at: purchase.updated_at,
      });
      
      console.log('=== BACKEND RESPONSE ===');
      console.log('Raw result:', response);
      
      // Handle new backend response format
      if (response.success) {
        console.log('Purchase added successfully:', response);
        toast.success(response.message || 'Purchase added successfully');
        await fetchPurchases();
        await refreshInventory();
        eventEmitter.emit('purchases:added', purchase);
      } else {
        console.error('Backend returned error:', response.error);
        toast.error(response.error || 'Failed to add purchase');
        throw new Error(response.error || 'Failed to add purchase');
      }
    } catch (error) {
      console.error('=== PURCHASE ADD ERROR ===');
      console.error('Error adding purchase:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toast.error(error instanceof Error ? error.message : 'Failed to add purchase');
      throw error; // Re-throw to let the UI handle it
    }
  };

  const updatePurchase = async (id: string, purchase: Purchase) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      // Transform frontend purchase data to backend format
      const backendPurchase = {
        unique_id: purchase.purchase_unique_id,
        supplier_unique_id: purchase.account_unique_id,
        billNo: purchase.purchase_billno,
        po_no: purchase.po_no,
        receivedBy: purchase.received_by,
        totalAmount: purchase.total_amount,
        paidAmount: purchase.paid_amount,
        balance: purchase.balance,
        profitMargin: purchase.profit_margin,
        itemCount: purchase.item_count,
        isReturned: purchase.isreturned === 1,
        lineItems: purchase.purchase_items.map(item => ({
          productId: item.product_unique_id,
          productName: item.product_name,
          barcode: item.barcode,
          quantity: item.quantity,
          price: item.retail_price,
          wholesaleRate: item.wholesale_price || 0,
          purchaseprice: item.purchase_price,
        })),
        added_By: purchase.added_by,
        company_id: purchase.company_id,
        branch_id: purchase.branch_id,
        created_at: purchase.created_at,
        // Add missing fields for return purchases
        original_purchase_billno: purchase.original_purchase_billno,
        originalPurchaseId: purchase.originalPurchaseId,
      };

      console.log('Updating purchase (backend format):', { id, backendPurchase });
      const result = await window.electronAPI.invoke('purchases:update', backendPurchase);
      
      // Handle new backend response format
      if (result.success) {
        toast.success(result.message || 'Purchase updated successfully');
        await fetchPurchases();
        await refreshInventory();
        eventEmitter.emit('purchases:updated', purchase);
      } else {
        toast.error(result.error || 'Failed to update purchase');
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update purchase');
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      if (!id) {
        toast.error('Purchase ID is required');
        return;
      }

      console.log('Deleting purchase:', id);
      const result = await window.electronAPI.invoke('purchases:delete', id);
      
      // Handle new backend response format
      if (result.success) {
        toast.success(result.message || 'Purchase deleted successfully');
        await fetchPurchases();
        await refreshInventory();
        eventEmitter.emit('purchases:deleted', id);
      } else {
        toast.error(result.error || 'Failed to delete purchase');
        throw new Error(result.error || 'Failed to delete purchase');
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
      throw error; // Re-throw to let the UI handle it
    }
  };

  const getPurchaseById = (id: string) => {
    return purchases.find(purchase => purchase.purchase_id?.toString() === id || purchase.purchase_billno === id);
  };

  const refresh = async () => {
    await fetchPurchases();
  };

  // Validation functions for return purchases using existing isreturned field
  const canPurchaseBeReturned = (purchase: Purchase) => {
    // Can only return if:
    // 1. It's NOT already a return purchase (isreturned === 0)
    // 2. It has items to return
    // 3. It hasn't been returned before (no other purchases reference it as original)
    if (purchase.isreturned === 1) {
      return false; // Already a return purchase
    }
    
    if (!purchase.purchase_items || purchase.purchase_items.length === 0) {
      return false; // No items to return
    }
    
    // Check if this purchase has been returned before by looking for other purchases
    // that reference this purchase's bill number as original_purchase_billno
    const hasExistingReturns = purchases.some(p => 
      p.original_purchase_billno === purchase.purchase_billno && 
      p.isreturned === 1
    );
    
    return !hasExistingReturns;
  };

  const validateReturnPurchase = (purchase: Purchase) => {
    const errors: string[] = [];
    
    // Check 1: Is it already a return purchase?
    if (purchase.isreturned === 1) {
      errors.push('This purchase is already a return purchase');
    }
    
    // Check 2: Does it have items?
    if (!purchase.purchase_items || purchase.purchase_items.length === 0) {
      errors.push('This purchase has no items to return');
    }
    
    // Check 3: Has it been returned before?
    const hasExistingReturns = purchases.some(p => 
      p.original_purchase_billno === purchase.purchase_billno && 
      p.isreturned === 1
    );
    
    if (hasExistingReturns) {
      errors.push('This purchase has already been returned');
    }
    
    return errors;
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const value = {
    purchases,
    loading,
    error,
    addPurchase,
    updatePurchase,
    deletePurchase,
    getPurchaseById,
    open,
    setOpen,
    currentPurchase,
    setCurrentPurchase,
    refresh,
    isReturnPurchase,
    toggleReturnPurchase,
    // Add validation functions
    canPurchaseBeReturned,
    validateReturnPurchase,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchaseContext() {
  const context = React.useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchaseContext must be used within a PurchaseProvider');
  }
  return context;
} 