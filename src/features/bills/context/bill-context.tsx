import React, { useEffect, useState } from 'react'
import { Bill, billSchema } from '../data/schema'
import useDialogState from '@/hooks/use-dialog-state'
import { toast } from 'sonner'
// import { useAuthStore } from '@/stores/authStore'

type BillDialogType = 'view'

interface BillContextType {
  bills: Bill[]
  loading: boolean
  error: string | null
  setBills: React.Dispatch<React.SetStateAction<Bill[]>>
  selectedBill: Bill | null
  setSelectedBill: React.Dispatch<React.SetStateAction<Bill | null>>
  dialogState: {
    open: boolean
    type: BillDialogType | null
  }
  openDialog: (type: BillDialogType, bill?: Bill) => void
  closeDialog: () => void
  addBill: (bill: Bill) => Promise<void>
  updateBill: (billId: string, bill: Bill) => Promise<void>
  // Removed deleteBill: bills are read-only
  getBillById: (billId: string) => Bill | undefined
  refresh: () => Promise<void>
}

interface BillProviderProps {
  children: React.ReactNode
}

// Helper function to validate and transform database data
const validateBillData = (data: any[]): Bill[] => {
  console.log('Raw bill data from database:', data);
  
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
        
        // Parse bill_items if it's a JSON string, otherwise use as is
        let parsedItems = [];
        try {
          if (typeof item.bill_items === 'string') {
            parsedItems = JSON.parse(item.bill_items);
          } else if (Array.isArray(item.bill_items)) {
            parsedItems = item.bill_items;
          }
        } catch (parseError) {
          console.error('Failed to parse bill_items:', parseError);
          parsedItems = [];
        }
        
        // Ensure items array is properly structured
        const safeItems = Array.isArray(parsedItems) && parsedItems.length > 0
          ? parsedItems.map((it: any) => {
              console.log('Raw bill item:', it);
              const mappedItem = {
                product_unique_id: String(it.product_unique_id || ''),
                product_name: String(it.product_name || ''),
                item_qty: Number(it.quantity || it.item_qty || 0),
                retail_price: Number(it.unit_price || it.retail_price || 0),
                total_price: Number(it.total_price || 0)
              };
              console.log('Mapped bill item:', mappedItem);
              return mappedItem;
            })
          : [];

        // Create a clean item object with safe defaults
        const cleanItem = {
          bill_id: String(item.bill_id || ''),
          bill_unique_id: String(item.bill_unique_id || `BILL-${index}`),
          billno: String(item.billno || ''),
          account_unique_id: String(item.account_unique_id || ''),
          total_amount: Number(item.total_amount || 0),
          paid_amount: Number(item.paid_amount || 0),
          balance: Number(item.balance || 0),
          payment_method: item.payment_method || 'cash',
          payment_status: item.payment_status || 'pending',
          sale_type: item.sale_type || 'retail',
          isreturned: Number(item.isreturned || 0),
          total_tax: Number(item.total_tax || 0),
          total_discount: Number(item.total_discount || 0),
          extracharges: Number(item.extracharges || 0),
          item_count: Number(item.item_count || 0),
          bill_items: safeItems,
          added_by: String(item.added_by || 'admin'),
          company_id: String(item.company_id || '1'),
          branch_id: String(item.branch_id || '1'),
          created_at: String(item.created_at || new Date().toISOString()),
          updated_at: String(item.updated_at || new Date().toISOString()),
        };
        
        // Validate with Zod schema with safe parsing
        try {
          return billSchema.parse(cleanItem)
        } catch (validationError) {
          console.error(`Schema validation failed for bill at index ${index}:`, validationError);
          console.error('Clean item that failed validation:', cleanItem);
          // Return a safe fallback item instead of null
          return {
            bill_id: String(item.bill_id || `fallback_${index}`),
            bill_unique_id: String(item.bill_unique_id || `BILL-${index}`),
            billno: String(item.billno || ''),
            account_unique_id: String(item.account_unique_id || ''),
            total_amount: 0,
            paid_amount: 0,
            balance: 0,
            payment_method: 'cash',
            payment_status: 'pending',
            sale_type: 'retail',
            isreturned: 0,
            total_tax: 0,
            total_discount: 0,
            extracharges: 0,
            item_count: 0,
            bill_items: [],
            added_by: 'admin',
            company_id: '1',
            branch_id: '1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Bill;
        }
      } catch (error) {
        console.error(`Invalid bill item at index ${index}:`, item, error);
        return null;
      }
    })
    .filter((item): item is Bill => item !== null);
};

const BillContext = React.createContext<BillContextType | undefined>(undefined)

export default function BillProvider({ children }: BillProviderProps) {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [dialogState, setDialogState] = useDialogState<BillDialogType>(null)
  // const user = useAuthStore((s) => s.auth.user)

  const openDialog = (type: BillDialogType, bill?: Bill) => {
    if (bill) {
      setSelectedBill(bill)
    }
    setDialogState(type)
  }

  const closeDialog = () => {
    setDialogState(null)
    setSelectedBill(null)
  }

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (window.electronAPI) {
        console.log('Fetching bill data from Electron...');
        
        const data = await window.electronAPI.invoke('bills:getAll');
        console.log('Raw bill data received from Electron:', data);
        
        // Handle new backend response format
        let billsData;
        if (data && typeof data === 'object' && 'success' in data) {
          // New format with success/error wrapper
          if (data.success) {
            billsData = data.data;
            console.log('Success response, bills data:', billsData);
          } else {
            console.error('Error response from backend:', data.error);
            setError(data.error || 'Failed to fetch bills');
            setBills([]);
            return;
          }
        } else {
          // Legacy format - direct array
          billsData = data;
          console.log('Legacy response format, bills data:', billsData);
        }
        
        // Ensure we have an array
        if (!Array.isArray(billsData)) {
          console.error('Bills data is not an array:', billsData);
          setError('Invalid data format received from server');
          setBills([]);
          return;
        }
        
        const validatedData = validateBillData(billsData);
        console.log('Validated bill data:', validatedData);
        console.log('Final bills count:', validatedData.length);
        
        setBills(validatedData);
      } else {
        console.warn('Electron API not available, using empty bills');
        setError('Electron API not available');
        setBills([]);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bills');
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const addBill = async (bill: Bill) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      // Optimistic update
      setBills(prev => [...prev, bill]);

      const result = await window.electronAPI.invoke('bills:add', bill);
      
      if (result.success) {
        toast.success('Bill added successfully');
        // Update with actual data from server if needed
        if (result.data?.bill_id) {
          setBills(prev => prev.map(b => 
            b.bill_unique_id === bill.bill_unique_id 
              ? { ...b, bill_id: result.data.bill_id }
              : b
          ));
        }
      } else {
        // Rollback optimistic update
        setBills(prev => prev.filter(b => b.bill_unique_id !== bill.bill_unique_id));
        toast.error(result.error || 'Failed to add bill');
      }
    } catch (error) {
      // Rollback optimistic update
      setBills(prev => prev.filter(b => b.bill_unique_id !== bill.bill_unique_id));
      console.error('Error adding bill:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add bill');
    }
  };

  const updateBill = async (billId: string, bill: Bill) => {
    let previousBill = bills.find(b => b.bill_id === billId);
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      // Store previous state for rollback
      // let previousBill = bills.find(b => b.bill_id === billId);
      if (!previousBill) {
        toast.error('Bill not found');
        return;
      }

      // Optimistic update
      setBills(prev => prev.map(b => 
        b.bill_id === billId ? (previousBill as Bill) || b : b
      ));

      const result = await window.electronAPI.invoke('bills:update', bill);
      
      if (result.success) {
        toast.success('Bill updated successfully');
      } else {
        // Rollback optimistic update
        setBills(prev => prev.map(b => 
          b.bill_id === billId ? (previousBill as Bill) || b : b
        ));
        toast.error(result.error || 'Failed to update bill');
      }
    } catch (error) {
      // Rollback optimistic update
      setBills(prev => prev.map(b => 
        b.bill_id === billId ? (previousBill as Bill) || b : b
      ));
      console.error('Error updating bill:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update bill');
    }
  };

  const getBillById = (billId: string) => {
    console.log('getBillById called with:', billId);
    console.log('Available bills:', bills.map(b => ({ 
      bill_id: b.bill_id, 
      billno: b.billno, 
      bill_unique_id: b.bill_unique_id 
    })));
    
    // Try to find by multiple identifiers
    const foundBill = bills.find(bill => 
      bill.bill_id === billId || 
      bill.billno === billId ||
      bill.bill_unique_id === billId ||
      String(bill.bill_id) === billId ||
      String(bill.billno) === billId ||
      String(bill.bill_unique_id) === billId
    );
    
    console.log('Found bill:', foundBill);
    return foundBill;
  };

  const refresh = async () => {
    await fetchBills();
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const value = {
    bills,
    loading,
    error,
    setBills,
    selectedBill,
    setSelectedBill,
    dialogState: {
      open: !!dialogState,
      type: dialogState,
    },
    openDialog,
    closeDialog,
    addBill,
    updateBill,
    getBillById,
    refresh,
  };

  return (
    <BillContext.Provider value={value}>
      {children}
    </BillContext.Provider>
  );
}

export function useBillContext() {
  const context = React.useContext(BillContext);
  if (context === undefined) {
    throw new Error('useBillContext must be used within a BillProvider');
  }
  return context;
} 