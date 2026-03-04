import React, { useEffect, useState } from 'react'
import { Inventory } from '../data/schema'
import { toast } from 'sonner'
// Removed event emitter to prevent circular updates
import { useAuthStore } from '@/stores/authStore';


// Inventory dialogs removed; keep type placeholder minimal

interface InventoryContextType {
  products: Inventory[]
  setProducts: React.Dispatch<React.SetStateAction<Inventory[]>>
  addInventory: (product: Inventory) => Promise<void>
  updateInventory: (id: number, product: Inventory) => Promise<void>
  deleteInventory: (id: number) => Promise<void>
  getInventoryById: (id: number) => Inventory | undefined
  open: null
  setOpen: (str: null) => void
  currentProduct: Inventory | null
  setCurrentProduct: React.Dispatch<React.SetStateAction<Inventory | null>>
  refresh: () => Promise<void>
  loading: boolean
  error: string | null
}

const InventoryContext = React.createContext<InventoryContextType | null>(null)

interface Props {
  children: React.ReactNode
}

// Helper function to validate and transform database data using adapters
const validateInventoryData = (data: any[]): Inventory[] => {
  // console.log('Raw inventory data from database:', data);
  
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
        
        // Map database field names to schema field names
        const mappedItem: Inventory = {
          inventory_id: item.inventory_id,
          inventory_unique_id: item.inventory_unique_id,
          product_unique_id: item.product_unique_id || '',
          stock: item.stock || 0,
          retail_price: item.retail_price || 0,
          wholesale_price: item.wholesale_price || 0,
          purchase_price: item.purchase_price || 0,
          barcode: item.product_barcode || item.barcode || '',
          product_name: item.product_name || 'Unknown',
          category_name: item.product_category_name || item.category_name || null,
          alertqty: item.alertqty || 0,
          product_status: item.product_status || 'active',
          category_status: item.category_status || 'active',
          added_by: item.added_by || 'system',
          company_id: item.company_id || '1',
          branch_id: item.branch_id || '1',
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
        };
        
        // Basic validation - ensure required fields exist
        if (!mappedItem.product_unique_id || !mappedItem.inventory_unique_id) {
          console.error(`Missing required fields in inventory at index ${index}:`, item);
          return null;
        }
        
        return mappedItem;
      } catch (error) {
        console.error(`Invalid inventory item at index ${index}:`, item, error);
        return null;
      }
    })
    .filter((item): item is Inventory => item !== null);
}

export default function InventoryProvider({ children }: Props) {
  const [products, setProducts] = useState<Inventory[]>([])
  const [open, setOpen] = React.useState<null>(null)
  const [currentProduct, setCurrentProduct] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((s) => s.auth.user);
  const inFlight = React.useRef(false)
  const previousProductRef = React.useRef<Inventory | null>(null);
  
  // Helper to fetch all inventory from Electron
  const fetchInventory = async (useFallback = false) => {
    // If already fetching, return the existing promise
    if (inFlight.current) return;
    
    setLoading(true);
    setError(null);
    inFlight.current = true;
    
    try {
      if (!window.electronAPI || useFallback) {
        console.warn('Electron API not available or fallback requested, using empty inventory');
        setProducts([]);
        return;
      }

      const data = await window.electronAPI.invoke('inventory:getAll');
      const inventoryData = data.success ? data.data : data;
      const validatedData = validateInventoryData(inventoryData);
      
      // Only update state if the component is still mounted and data is different
      setProducts(prev => {
        const hasChanges = JSON.stringify(prev) !== JSON.stringify(validatedData);
        return hasChanges ? validatedData : prev;
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch inventory');
      // Don't clear products on error - keep existing state
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  };

  const addInventory = async (product: Inventory) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      // Get user's company and branch info
      const userCompanyId = user?.companyId || user?.company_id || '1';
      const userBranchId = user?.branchId || user?.branch_id || '1';
      
      // Update product with user's company and branch info
      const productWithUserInfo = {
        ...product,
        company_id: userCompanyId,
        branch_id: userBranchId,
        added_by: user?.name || user?.email || 'admin',
      };

      // Optimistic update
      setProducts(prev => [...prev, productWithUserInfo]);

      const result = await window.electronAPI.invoke('inventory:add', productWithUserInfo);
      
      if (result.success) {
        toast.success('Inventory added successfully');
        // Update with actual data from server if needed
        if (result.data?.inventory_id) {
          setProducts(prev => prev.map(p => 
            p.inventory_unique_id === product.inventory_unique_id 
              ? { ...p, inventory_id: result.data.inventory_id }
              : p
          ));
        }
      } else {
        // Rollback optimistic update
        setProducts(prev => prev.filter(p => p.inventory_unique_id !== product.inventory_unique_id));
        toast.error(result.error || 'Failed to add inventory');
      }
    } catch (error) {
      // Rollback optimistic update
      setProducts(prev => prev.filter(p => p.inventory_unique_id !== product.inventory_unique_id));
      console.error('Error adding inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add inventory');
    }
  };

  const updateInventory = async (id: number, product: Inventory) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      // Store previous state for rollback
      const foundProduct = products.find(p => p.inventory_id === id);
      if (!foundProduct) {
        toast.error('Product not found');
        return;
      }
      previousProductRef.current = foundProduct;

      // Optimistic update
      setProducts(prev => prev.map(p => 
        p.inventory_id === id ? foundProduct : p
      ));

      const result = await window.electronAPI.invoke('inventory:update', product);
      
      if (result.success) {
        toast.success('Inventory updated successfully');
      } else {
        // Rollback optimistic update
        setProducts(prev => prev.map(p => 
          p.inventory_id === id ? previousProductRef.current! : p
        ));
        toast.error(result.error || 'Failed to update inventory');
      }
    } catch (error) {
      // Rollback optimistic update
      setProducts(prev => prev.map(p => 
        p.inventory_id === id ? previousProductRef.current! : p
      ));
      console.error('Error updating inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update inventory');
    }
  };

  const deleteInventory = async (id: number) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      // Store previous state for rollback
      const foundProduct = products.find(p => p.inventory_id === id);
      if (!foundProduct) {
        toast.error('Product not found');
        return;
      }
      previousProductRef.current = foundProduct;

      // Optimistic update
      setProducts(prev => prev.filter(p => p.inventory_id !== id));

      const result = await window.electronAPI.invoke('inventory:delete', id);
      
      if (result.success) {
        toast.success('Inventory deleted successfully');
      } else {
        // Rollback optimistic update
        setProducts(prev => [...prev, previousProductRef.current!]);
        toast.error(result.error || 'Failed to delete inventory');
      }
    } catch (error) {
      // Rollback optimistic update
      setProducts(prev => [...prev, previousProductRef.current!]);
      console.error('Error deleting inventory:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete inventory');
    }
  };

  const getInventoryById = (id: number) => {
    return products.find(product => product.inventory_id === id);
  };

  const refresh = async () => {
    await fetchInventory();
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const value = {
    products,
    setProducts,
    addInventory,
    updateInventory,
    deleteInventory,
    getInventoryById,
    open,
    setOpen,
    currentProduct,
    setCurrentProduct,
    refresh,
    loading,
    error,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = React.useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
