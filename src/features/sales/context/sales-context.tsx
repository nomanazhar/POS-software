import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react'
import type { BillItem, BillOrder } from '../data/schema'
import type { Bill } from '@/features/bills/data/schema'
import type { Inventory } from '../../inventory/data/schema'
import { useBillContext } from '@/features/bills/context/bill-context'
import { useAuthStore } from '@/stores/authStore'
import { useTax } from '@/context/tax-context'
import { toast } from 'sonner'
// Removed inventory dependency to prevent circular updates
// import { generateId } from '@/lib/utils'
// Removed event emitter to prevent circular updates

// Restore the local Bill interface for sales state
interface LocalBill {
  bill_id?: number;
  bill_unique_id: string;
  billno: string;
  account_unique_id: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  payment_method: string;
  payment_status: string;
  sale_type: 'retail' | 'wholesale' | 'quotation';
  is_returned: number;
  total_tax: number;
  total_discount: number;
  extra_charges: number;
  item_count: number;
  bill_items: string; // JSON string
  original_bill_billno?: string; // Track original bill number for returns
  // Per-bill mode states
  is_return_sale: boolean; // Track if this specific bill is a return sale
  is_quotation_to_invoice: boolean; // Track if this bill is quotation-to-invoice
  added_by: string;
  company_id: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
}

interface SalesState {
  bills: LocalBill[];
  currentBillId: string | null;
  isWholesale: boolean;
  transactions: any[];
  currentTransaction: any | null;
  isReturnSale: boolean;
  isQuotationToInvoice: boolean;
  isQuotationMode: boolean;
  inventory: Inventory[];
}

type SalesAction =
  | { type: 'ADD_TO_CART'; payload: Inventory }
  | { type: 'UPDATE_QUANTITY'; payload: { product_unique_id: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_WHOLESALE' }
  | { type: 'SET_CUSTOMER_INFO'; payload: { name: string; phone: string } }
  | { type: 'SET_ACCOUNT_UNIQUE_ID'; payload: string }
  | { type: 'SET_PAYMENT_METHOD'; payload: 'cash' | 'card' | 'ledger' }
  | { type: 'COMPLETE_SALE'; payload: any }
  | { type: 'SET_CURRENT_TRANSACTION'; payload: any | null }
  | { type: 'CREATE_NEW_BILL' }
  | { type: 'SWITCH_BILL'; payload: string }
  | { type: 'DELETE_BILL'; payload: string }
  | { type: 'SET_BILL_VALUES'; payload: { total_discount?: number; total_tax?: number; extracharges?: number } }
  | { type: 'SET_SALES_HISTORY'; payload: any[] }
  | { type: 'SET_SALE_TYPE'; payload: 'retail' | 'wholesale' | 'quotation' }
  | { type: 'RECALCULATE_PRICES'; payload: Inventory[] }
  | { type: 'SET_INVENTORY'; payload: Inventory[] }
  | { type: 'TOGGLE_RETURN_SALE' }
  | { type: 'TOGGLE_QUOTATION_TO_INVOICE' }
  | { type: 'SET_QUOTATION_MODE'; payload: boolean }
  | { type: 'SET_ORIGINAL_BILL_NO'; payload: string }
  | { type: 'TOGGLE_BILL_RETURN_SALE'; payload: string } // bill_unique_id
  | { type: 'TOGGLE_BILL_QUOTATION_TO_INVOICE'; payload: string }; // bill_unique_id

const initialState: SalesState = {
  bills: [{
    bill_unique_id: 'bill-' + Date.now(),
    billno: '0',
    account_unique_id: '1_1_walkin_customer', // Default walk-in customer
    total_amount: 0,
    paid_amount: 0,
    balance: 0,
    payment_method: 'cash',
    payment_status: 'pending',
    sale_type: 'retail',
    is_returned: 0,
    total_tax: 0,
    total_discount: 0,
    extra_charges: 0,
    item_count: 0,
    bill_items: '[]',
    is_return_sale: false,
    is_quotation_to_invoice: false,
    added_by: 'admin',
    company_id: '1',
    branch_id: '1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }],
  currentBillId: 'bill-' + Date.now(),
  isWholesale: false,
  transactions: [],
  currentTransaction: null,
  isReturnSale: false,
  isQuotationToInvoice: false,
  isQuotationMode: false,
  inventory: [],
}

function salesReducer(state: SalesState, action: SalesAction): SalesState {
  const currentBill = state.bills.find(bill => bill.bill_unique_id === state.currentBillId)

  switch (action.type) {
    case 'ADD_TO_CART': {
      if (!currentBill) return state

      // Check if product's category is disabled
      if (action.payload.category_status === 'inactive') {
        // Don't add to cart if category is disabled
        toast.error('Cannot add product: Category is disabled');
        return state;
      }

      // Check if product is inactive
      if (action.payload.product_status === 'inactive') {
        // Don't add to cart if product is inactive
        toast.error('Cannot add product: Product is inactive');
        return state;
      }

      const existingItemIndex = JSON.parse(currentBill.bill_items).findIndex((item: BillItem) => item.product_unique_id === action.payload.product_unique_id)
      let updatedBillItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');

      if (existingItemIndex > -1) {
        // Update quantity if product already exists
        updatedBillItems = updatedBillItems.map((item: BillItem, index: number) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        // Enhanced price handling for wholesale/retail
        const isWholesale = currentBill.sale_type === 'wholesale';
        const unitPrice = isWholesale 
          ? (action.payload.wholesale_price || 0)
          : (action.payload.retail_price || 0);
        
        // Add new product to cart
        console.log('Adding product to cart with details:', action.payload);
        
        const newItem: BillItem = {
          product_unique_id: action.payload.product_unique_id,
          product_name: action.payload.product_name || 'Product',
          barcode: action.payload.barcode || '',
          quantity: 1,
          unit_price: unitPrice,
          total_price: unitPrice,
          discount: 0,
          tax: 0,
          is_returned: 0,
          retail_price: action.payload.retail_price || 0,
          item_qty: 1,
          originalSoldQuantity: (action.payload as any).originalSoldQuantity || undefined,
          added_by: currentBill.added_by,
          company_id: currentBill.company_id,
          branch_id: currentBill.branch_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        
        console.log('Created bill item:', newItem);
        updatedBillItems = [...updatedBillItems, newItem]
      }

      // Recalculate item_count and update bill_items
      const newItemCount = updatedBillItems.length;

      // Reserve stock via Electron (best-effort; UI remains responsive)
      try {
        const billId = state.currentBillId;
        const terminalId = (window as any).__TERMINAL_ID__ || 'terminal-unknown';
        const lastItem = updatedBillItems[updatedBillItems.length - 1];
        if (lastItem && window.electronAPI?.createReservation) {
          const reservationId = `${terminalId}_${billId}_${lastItem.product_unique_id}`;
          window.electronAPI.createReservation({
            reservationId,
            productUniqueId: lastItem.product_unique_id,
            quantity: Number(lastItem.quantity || 1),
            terminalId,
            billId,
            ttlMinutes: 15,
          });
        }
      } catch (e) {
        console.warn('Reservation attempt failed (non-blocking):', e);
      }
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, bill_items: JSON.stringify(updatedBillItems), item_count: newItemCount }
            : bill
        ),
      }
    }

    case 'UPDATE_QUANTITY': {
      if (!currentBill) return state;

      let updatedBillItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');
      updatedBillItems = updatedBillItems.map((item: BillItem) =>
        item.product_unique_id === action.payload.product_unique_id
          ? { ...item, quantity: action.payload.quantity, total_price: item.unit_price * action.payload.quantity }
          : item
      );

      // Best-effort reservation quantity sync
      try {
        const billId = state.currentBillId;
        const terminalId = (window as any).__TERMINAL_ID__ || 'terminal-unknown';
        const changed = updatedBillItems.find((it: BillItem) => it.product_unique_id === action.payload.product_unique_id);
        if (changed && window.electronAPI?.updateReservationQty) {
          const reservationId = `${terminalId}_${billId}_${changed.product_unique_id}`;
          window.electronAPI.updateReservationQty({ reservationId, newQuantity: Number(changed.quantity || 0) });
        }
      } catch (e) {
        console.warn('Reservation qty update failed (non-blocking):', e);
      }

      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, bill_items: JSON.stringify(updatedBillItems) }
            : bill
        ),
      };
    }

    case 'REMOVE_FROM_CART': {
      if (!currentBill) return state;

      let updatedBillItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');
      const removed = updatedBillItems.find((item: BillItem) => item.product_unique_id === action.payload);
      updatedBillItems = updatedBillItems.filter((item: BillItem) => item.product_unique_id !== action.payload);

      const newItemCount = updatedBillItems.length;

      // Best-effort reservation cancel
      try {
        const billId = state.currentBillId;
        const terminalId = (window as any).__TERMINAL_ID__ || 'terminal-unknown';
        if (removed && window.electronAPI?.cancelReservation) {
          const reservationId = `${terminalId}_${billId}_${removed.product_unique_id}`;
          window.electronAPI.cancelReservation(reservationId);
        }
      } catch (e) {
        console.warn('Reservation cancel failed (non-blocking):', e);
      }
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, bill_items: JSON.stringify(updatedBillItems), item_count: newItemCount }
            : bill
        ),
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, bill_items: '[]', item_count: 0 }
            : bill
        ),
        currentTransaction: null,
      }

    case 'TOGGLE_WHOLESALE': {
      if (!currentBill) return state;
      
      const newIsWholesale = !state.isWholesale;
      const newSaleType = newIsWholesale ? 'wholesale' : 'retail';
      
      // Update existing cart items with new prices using stored inventory
      let updatedBillItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');
      
      if (state.inventory.length > 0) {
        updatedBillItems = updatedBillItems.map((item: BillItem) => {
          // Find the product in inventory to get current prices
          const product = state.inventory.find((p: Inventory) => p.product_unique_id === item.product_unique_id);
          if (!product) return item;
          
          // Calculate new unit price based on new sale type
          const newUnitPrice = newIsWholesale 
            ? (product.wholesale_price || 0)
            : (product.retail_price || 0);
          
          return {
            ...item,
            unit_price: newUnitPrice,
            total_price: newUnitPrice * item.quantity,
          };
        });
      }
      
      return {
        ...state,
        isWholesale: newIsWholesale,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? {
                ...bill,
                sale_type: newSaleType,
                bill_items: state.inventory.length > 0 ? JSON.stringify(updatedBillItems) : bill.bill_items,
              }
            : bill
        ),
      }
    }

    case 'SET_CUSTOMER_INFO':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? {
                ...bill,
                // customerName: action.payload.name, // Will be derived from account_unique_id on backend
                // customerPhone: action.payload.phone, // Will be derived from account_unique_id on backend
              }
            : bill
        ),
      }

    case 'SET_ACCOUNT_UNIQUE_ID':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, account_unique_id: action.payload }
            : bill
        ),
      }

    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, payment_method: action.payload }
            : bill
        ),
      }

    case 'COMPLETE_SALE':
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
        currentTransaction: action.payload,
      }

    case 'SET_CURRENT_TRANSACTION':
      return {
        ...state,
        currentTransaction: action.payload,
      }

    case 'CREATE_NEW_BILL': {
      const newBillUniqueId = 'bill-' + Date.now();
      const newBill: LocalBill = {
        bill_unique_id: newBillUniqueId,
        billno: '0', // Placeholder
        account_unique_id: '1_1_walkin_customer', // Default walk-in customer
        total_amount: 0,
        paid_amount: 0,
        balance: 0,
        payment_method: 'cash',
        payment_status: 'pending',
        sale_type: 'retail' as const,
        is_returned: 0,
        total_tax: 0,
        total_discount: 0,
        extra_charges: 0,
        item_count: 0,
        bill_items: '[]',
        is_return_sale: false,
        is_quotation_to_invoice: false,
        added_by: 'admin',
        company_id: '1',
        branch_id: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return {
        ...state,
        bills: [
          ...state.bills,
          newBill,
        ],
        currentBillId: newBillUniqueId,
        // Reset global quotation mode for new bills
        isQuotationMode: false,
        isWholesale: false,
      }
    }

    case 'SWITCH_BILL':
      return {
        ...state,
        currentBillId: action.payload,
      }

    case 'DELETE_BILL': {
      const remainingBills = state.bills.filter(bill => bill.bill_unique_id !== action.payload)
      if (remainingBills.length === 0) {
        const newBillUniqueId = 'bill-' + Date.now();
        const newBillAfterDeletion: LocalBill = {
          bill_unique_id: newBillUniqueId,
          billno: '0', // Placeholder
          account_unique_id: '1_1_walkin_customer', // Default walk-in customer
          total_amount: 0,
          paid_amount: 0,
          balance: 0,
          payment_method: 'cash',
          payment_status: 'pending',
          sale_type: 'retail' as const,
          is_returned: 0,
          total_tax: 0,
          total_discount: 0,
          extra_charges: 0,
          item_count: 0,
          bill_items: '[]',
          is_return_sale: false,
          is_quotation_to_invoice: false,
          added_by: 'admin',
          company_id: '1',
          branch_id: '1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        return {
          ...state,
          bills: [newBillAfterDeletion],
          currentBillId: newBillUniqueId,
          // Reset all global mode states for new bills - ensure only retail is selected by default
          isReturnSale: false,
          isQuotationMode: false,
          isQuotationToInvoice: false,
          isWholesale: false,
        }
      }
      return {
        ...state,
        bills: remainingBills,
        currentBillId: remainingBills[0].bill_unique_id,
      }
    }
    case 'SET_BILL_VALUES':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? {
                ...bill,
                total_discount: action.payload.total_discount ?? bill.total_discount,
                total_tax: action.payload.total_tax ?? bill.total_tax,
                extra_charges: action.payload.extracharges ?? bill.extra_charges,
              }
            : bill
        ),
      }

    case 'SET_SALES_HISTORY':
      return {
        ...state,
        transactions: action.payload,
      }

    case 'SET_SALE_TYPE':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, sale_type: action.payload, isWholesale: action.payload === 'wholesale' }
            : bill
        ),
      };

    case 'RECALCULATE_PRICES': {
      if (!currentBill) return state;
      
      const inventory = action.payload;
      let updatedBillItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');
      
      updatedBillItems = updatedBillItems.map((item: BillItem) => {
        // Find the product in inventory to get current prices
        const product = inventory.find((p: Inventory) => p.product_unique_id === item.product_unique_id);
        if (!product) return item;
        
        // Calculate new unit price based on current sale type
        const isWholesale = currentBill.sale_type === 'wholesale';
        const newUnitPrice = isWholesale 
          ? (product.wholesale_price || 0)
          : (product.retail_price || 0);
        
        return {
          ...item,
          unit_price: newUnitPrice,
          total_price: newUnitPrice * item.quantity,
        };
      });
      
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === state.currentBillId
            ? { ...bill, bill_items: JSON.stringify(updatedBillItems) }
            : bill
        ),
      };
    }

    case 'TOGGLE_RETURN_SALE':
      return {
        ...state,
        isReturnSale: !state.isReturnSale,
      };

    case 'TOGGLE_QUOTATION_TO_INVOICE':
      return {
        ...state,
        isQuotationToInvoice: !state.isQuotationToInvoice,
      };

    case 'TOGGLE_BILL_RETURN_SALE':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === action.payload
            ? { ...bill, is_return_sale: !bill.is_return_sale }
            : bill
        ),
      };

    case 'TOGGLE_BILL_QUOTATION_TO_INVOICE':
      return {
        ...state,
        bills: state.bills.map(bill =>
          bill.bill_unique_id === action.payload
            ? { ...bill, is_quotation_to_invoice: !bill.is_quotation_to_invoice }
            : bill
        ),
      };

    case 'SET_QUOTATION_MODE':
      return {
        ...state,
        isQuotationMode: action.payload,
      };

    case 'SET_ORIGINAL_BILL_NO':
      return {
        ...state,
        bills: state.bills.map(bill => 
          bill.bill_unique_id === state.currentBillId 
            ? { ...bill, original_bill_billno: action.payload }
            : bill
        )
      };

    case 'SET_INVENTORY':
      return {
        ...state,
        inventory: action.payload,
      };

    default:
      return state
  }
}

interface SalesContextType {
  state: SalesState
  currentBill: LocalBill | undefined
  addToCart: (product: Inventory) => void
  updateQuantity: (product_unique_id: string, quantity: number) => void
  removeFromCart: (product_unique_id: string) => void
  clearCart: () => void
  toggleWholesale: () => void
  setCustomerInfo: (name: string, phone: string) => void
  setAccountUniqueId: (id: string) => void
  setPaymentMethod: (method: 'cash' | 'card' | 'ledger') => void
  completeSale: (receivedPaidAmount?: number, overrideTotal?: number) => any | null
  completeQuotation: (overrideTotal?: number) => Promise<boolean>
  getCartTotal: () => { subtotal: number; total_tax: number; total: number; total_discount: number; extra_charges: number }
  scanBarcode: (barcode: string, inventory: Inventory[]) => void
  createNewBill: () => void
  switchBill: (billUniqueId: string) => void
  deleteBill: (billUniqueId: string) => void
  setBillValues: (values: { total_discount?: number; total_tax?: number; extracharges?: number }) => void
  refresh: () => Promise<void>
  setSaleType: (saleType: 'retail' | 'wholesale' | 'quotation') => void;
  recalculatePrices: (inventory: Inventory[]) => void;
  setInventory: (inventory: Inventory[]) => void;
  isReturnSale: boolean;
  toggleReturnSale: () => void;
  isQuotationToInvoice: boolean;
  toggleQuotationToInvoice: () => void;
  isQuotationMode: boolean;
  setQuotationMode: (on: boolean) => void;
  // Add validation functions for return bills
      canBillBeReturned: (bill: any) => Promise<boolean>;
  validateReturnBill: (bill: any) => Promise<string[]>;
  setOriginalBillNo: (billno: string) => void;
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(salesReducer, initialState)
  const { calculateTax } = useTax()
  const currentBill = state.bills.find(bill => bill.bill_unique_id === state.currentBillId)
  const billContext = useBillContext?.()
  const user = useAuthStore((state) => state.auth.user)
  // Removed inventory dependency to prevent circular updates
  const isReturnSale = state.isReturnSale;
  const isQuotationMode = state.isQuotationMode;

  // Load sales history from SQLite on mount
  useEffect(() => {
    async function loadSales() {
      try {
        const { getAllTransactions } = await import('../../transactions/data/data')
        const rows = await getAllTransactions()
        dispatch({ type: 'SET_SALES_HISTORY', payload: Array.isArray(rows) ? rows : [] })
      } catch (error) {
        console.error('Failed to load sales history:', error)
        dispatch({ type: 'SET_SALES_HISTORY', payload: [] })
      }
    }
    loadSales()
  }, [])

  // Add refresh method
        const refresh = async () => {
        try {
          const { getAllTransactions } = await import('../../transactions/data/data')
          const rows = await getAllTransactions()
          dispatch({ type: 'SET_SALES_HISTORY', payload: Array.isArray(rows) ? rows : [] })
        } catch (error) {
          console.error('Failed to refresh sales history:', error)
        }
      }

  const addToCart = useCallback((product: Inventory) => {
    dispatch({ type: 'ADD_TO_CART', payload: product })
  }, [])

  const updateQuantity = useCallback((product_unique_id: string, quantity: number) => {
    // For return sales, validate that quantity doesn't exceed original sold quantity
    if (state.isReturnSale) {
      const currentBill = state.bills.find(b => b.bill_unique_id === state.currentBillId)
      if (currentBill) {
        const billItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]')
        const item = billItems.find(item => item.product_unique_id === product_unique_id)
        if (item && (item as any).originalSoldQuantity) {
          const maxQuantity = (item as any).originalSoldQuantity
          if (quantity > maxQuantity) {
            toast.error(`Cannot return more than originally sold (${maxQuantity})`)
            return
          }
        }
      }
    }
    dispatch({ type: 'UPDATE_QUANTITY', payload: { product_unique_id, quantity } })
  }, [state.isReturnSale, state.bills, state.currentBillId])

  const removeFromCart = useCallback((product_unique_id: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: product_unique_id })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])

  const toggleWholesale = useCallback(() => {
    dispatch({ type: 'TOGGLE_WHOLESALE' })
  }, [])

  const setCustomerInfo = useCallback((name: string, phone: string) => {
    dispatch({ type: 'SET_CUSTOMER_INFO', payload: { name, phone } })
  }, [])

  const setAccountUniqueId = useCallback((id: string) => {
    dispatch({ type: 'SET_ACCOUNT_UNIQUE_ID', payload: id })
  }, [])

  const setPaymentMethod = useCallback((method: 'cash' | 'card' | 'ledger') => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method })
  }, [])

  const getCartTotal = useCallback(() => {
    const currentBill = state.bills.find(b => b.bill_unique_id === state.currentBillId)
    if (!currentBill) return { subtotal: 0, total_tax: 0, total: 0, total_discount: 0, extra_charges: 0 }

    const billItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');

    const subtotal = billItems.reduce((sum, item) => {
      // Calculate the correct price based on current sale type and inventory
      let unitPrice = item.unit_price;
      
      if (state.inventory.length > 0) {
        const product = state.inventory.find((p: Inventory) => p.product_unique_id === item.product_unique_id);
        if (product) {
          const isWholesale = currentBill.sale_type === 'wholesale';
          unitPrice = isWholesale 
            ? (product.wholesale_price || 0)
            : (product.retail_price || 0);
        }
      }
      
      return sum + (unitPrice * item.quantity);
    }, 0);

    const totalDiscountAmount = currentBill.total_discount || 0;
    const subtotalAfterDiscount = subtotal - totalDiscountAmount;
    const totalTaxAmount = currentBill.total_tax || 0;
    const totalExtraCharges = currentBill.extra_charges || 0;

    const total = subtotalAfterDiscount + totalTaxAmount + totalExtraCharges;

    return {
      subtotal,
      total_discount: totalDiscountAmount,
      total_tax: totalTaxAmount,
      extra_charges: totalExtraCharges,
      total
    };
  }, [state.bills, state.currentBillId, state.inventory]);

  const completeSale = useCallback(async (receivedPaidAmount?: number, overrideTotal?: number) => {
    if (!currentBill || JSON.parse(currentBill.bill_items || '[]').length === 0) return null;
    
    const { subtotal, total_tax, total: calcTotal } = getCartTotal();
    const total_amount = typeof overrideTotal === 'number' ? overrideTotal : calcTotal;

    const billItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');

    const immediatePay = currentBill.payment_method === 'cash' || currentBill.payment_method === 'card';
    // Fix: Allow overpayments by storing the actual amount received, not limiting it to total_amount
    const paidAmountCalc = immediatePay ? 
      (currentBill.payment_method === 'cash' ? 
        Math.max(0, receivedPaidAmount || 0) : // Remove Math.min to allow overpayments
        total_amount) : 0;
    const balanceCalc = total_amount - paidAmountCalc; // Allow negative balance for overpayments

    const billPayload: BillOrder = {
      ...currentBill, // Start with current bill state
      bill_unique_id: `${user?.companyId || '1'}_${user?.branchId || '1'}_${Date.now()}`, // Generate proper unique ID
      billno: isReturnSale ? `${Date.now()}` : (currentBill.billno === '0' ? `${Date.now()}` : currentBill.billno), // Always generate new billno for returns
      total_amount: total_amount,
      paid_amount: paidAmountCalc,
      balance: balanceCalc,
      payment_status: paidAmountCalc >= total_amount ? 'paid' : 'pending',
      is_returned: isReturnSale ? 1 : 0,
      bill_items: JSON.stringify(billItems.map(item => ({
        ...item,
        is_returned: isReturnSale ? 1 : 0, // Ensure individual items also reflect return status
      }))),
      item_count: billItems.length,
      added_by: user?.id ? String(user.id) : 'admin',
      company_id: user?.companyId ? String(user.companyId) : '1',
      branch_id: user?.branchId ? String(user.branchId) : '1',
      updated_at: new Date().toISOString(),
      // Use correct field name to match database schema
      extracharges: currentBill.extra_charges || 0,
      // Add original bill number for return bills
      original_bill_billno: isReturnSale ? currentBill.original_bill_billno : undefined,
    };

    // Debug logging for return bills
    if (isReturnSale) {
      console.log('=== DEBUG: Return Bill Creation ===');
      console.log('isReturnSale:', isReturnSale);
      console.log('currentBill.original_bill_billno:', currentBill.original_bill_billno);
      console.log('billPayload.original_bill_billno:', billPayload.original_bill_billno);
      console.log('=== END DEBUG ===');
    }

    try {
      if (window.electronAPI) {
        console.log('Sending bill payload to Electron:', billPayload);
    console.log('isReturnSale state:', isReturnSale);
    console.log('Bill payload is_returned field:', billPayload.is_returned);
    console.log('Bill payload is_returned type:', typeof billPayload.is_returned);
    console.log('Bill payload is_returned boolean check:', Boolean(billPayload.is_returned));
        
        // Debug: Check transactions table state before adding bill
        try {
          const debugResult = await window.electronAPI.invoke('debug:checkTransactionsTable');
          console.log('Transactions table debug result:', debugResult);
        } catch (debugError) {
          console.warn('Transactions debug call failed:', debugError);
        }
        
        // Use the correct API endpoint and wait for the result
        const result = await window.electronAPI.invoke('bills:add', billPayload);

        // Finalize reservations after successful bill add
        try {
          if (result?.success && state.currentBillId) {
            const terminalId = (window as any).__TERMINAL_ID__ || 'terminal-unknown';
            await window.electronAPI?.completeBillReservations?.({ billId: state.currentBillId, terminalId });
          }
        } catch (e) {
          console.warn('Completing reservations failed (non-blocking):', e);
        }
        console.log('Bill creation result:', result);
        
        // Debug: Check what's actually stored in bill_items
        try {
          const billItemsDebug = await window.electronAPI.invoke('debug:checkBillItems');
          console.log('Bill items debug result:', billItemsDebug);
        } catch (debugError) {
          console.warn('Bill items debug call failed:', debugError);
        }
        
        if (!result || !result.success) {
          console.error('Bill creation failed:', result);
          toast.error(result?.error || 'Failed to save bill record');
          return null;
        } else {
          // Success handling - only update frontend after successful database save
          const successMessage = isReturnSale ? 'Return sale completed successfully!' : 'Sale completed successfully!';
          toast.success(successMessage);
          
          // Update bill context state with the actual saved data
          if (billContext?.setBills) {
            // Add the new bill to the bills list
            const savedBill = {
              ...billPayload,
              bill_id: result.data?.bill_id || billPayload.bill_id,
              // Convert is_returned to isreturned to match bills context schema
              isreturned: billPayload.is_returned ? 1 : 0,
              bill_items: JSON.parse(billPayload.bill_items || '[]') as BillItem[],
              item_qty: billItems.length,
              retail_price: billItems.reduce((sum, item) => sum + item.unit_price, 0),
              total_price: billItems.reduce((sum, item) => sum + item.total_price, 0),
              added_by: billPayload.added_by || (user?.id ? String(user.id) : 'admin'),
              company_id: billPayload.company_id || (user?.companyId ? String(user.companyId) : '1'),
              branch_id: billPayload.branch_id || (user?.branchId ? String(user.branchId) : '1'),
              payment_status: billPayload.payment_status as 'pending' | 'paid' | 'cancelled',
              sale_type: billPayload.sale_type as 'retail' | 'wholesale',
              
               // Parse bill_items string to array
            };
            billContext.setBills(prev => [...prev, savedBill as Bill]);
          }
          
          // Clear the current bill after successful sale completion
          dispatch({ type: 'CLEAR_CART' });
        
          return {
            id: billPayload.bill_unique_id,
            items: billItems,
            subtotal: subtotal,
            total_tax: total_tax,
            total: total_amount,
            paymentMethod: billPayload.payment_method as any,
            createdAt: new Date(),
            receivedAmount: receivedPaidAmount || 0,
            change: Math.max(0, (receivedPaidAmount || 0) - total_amount),
          };
        }
      } else {
        toast.error('Electron API not available, bill not saved');
        return null;
      }
    } catch (err) {
      console.error('Error saving bill:', err);
      toast.error('Failed to save bill record');
      return null;
    }
  }, [currentBill, getCartTotal, billContext, user, isReturnSale]);

  const completeQuotation = useCallback(async (overrideTotal?: number) => {
    if (!currentBill || JSON.parse(currentBill.bill_items || '[]').length === 0) return false;
    try {
      const { total_tax, total: calcTotal, total_discount } = getCartTotal();
      const total_amount = typeof overrideTotal === 'number' ? overrideTotal : calcTotal;

      const quotationItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');

      const quotationPayload = {
        quotation_unique_id: `${user?.companyId || '1'}_${user?.branchId || '1'}_${Date.now()}`, // Generate proper unique ID
        quotationno: `QT${String(Date.now()).slice(-6)}`, // Generate readable quotation number like QT123456
        account_unique_id: currentBill.account_unique_id || '',
        tax_amount: total_tax,
        discount_amount: total_discount,
        total_amount: total_amount,
        paid_amount: 0, // Quotations are typically unpaid
        item_count: quotationItems.length,
        sale_type: currentBill.sale_type,
        quotation_items: JSON.stringify(quotationItems),
        added_by: user?.id ? String(user.id) : 'admin',
        company_id: user?.companyId ? String(user.companyId) : '1',
        branch_id: user?.branchId ? String(user.branchId) : '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('quotations:add', quotationPayload);
        if (!res || !res.success) {
          toast.error('Failed to save quotation');
          return false;
        }
        toast.success('Quotation saved');
        return true;
      } else {
        toast.error('Electron API not available, quotation not saved');
        return false;
      }
    } catch (e) {
      console.error('Failed to save quotation:', e);
      toast.error('Failed to save quotation');
      return false;
    }
  }, [currentBill, getCartTotal, user]);

  const scanBarcode = useCallback((barcode: string, inventory: Inventory[]) => {
    const product = inventory.find((p: any) => {
      const productBarcode = (p as any).barcode || (p as any).product_barcode || '';
      return productBarcode === barcode;
    });
    if (product) {
      addToCart(product);
    } else {
      console.warn(`Product with barcode ${barcode} not found in inventory`);
    }
  }, [addToCart]);

  const createNewBill = useCallback(() => {
    dispatch({ type: 'CREATE_NEW_BILL' });
  }, []);

  const switchBill = useCallback((billUniqueId: string) => {
    dispatch({ type: 'SWITCH_BILL', payload: billUniqueId });
  }, []);

  const deleteBill = useCallback((billUniqueId: string) => {
    dispatch({ type: 'DELETE_BILL', payload: billUniqueId });
  }, []);

  const setBillValues = useCallback((values: { total_discount?: number; total_tax?: number; extracharges?: number }) => {
    dispatch({ type: 'SET_BILL_VALUES', payload: values });
  }, []);

  // Auto-calculate tax when bill items change
  const autoCalculateTax = useCallback(() => {
    if (!currentBill) return;
    
    const billItems: BillItem[] = JSON.parse(currentBill.bill_items || '[]');
    if (billItems.length === 0) return;
    
    // Calculate subtotal
    const subtotal = billItems.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);
    
    // Calculate tax based on subtotal
    const calculatedTax = calculateTax(subtotal);
    
    // Only update if tax has changed significantly (avoid infinite loops)
    const currentTax = currentBill.total_tax || 0;
    if (Math.abs(calculatedTax - currentTax) > 0.01) {
      setBillValues({ total_tax: calculatedTax });
    }
  }, [currentBill, calculateTax, setBillValues]);

  // Auto-calculate tax when bill items change
  useEffect(() => {
    autoCalculateTax();
  }, [autoCalculateTax]);

  const setSaleType = useCallback((saleType: 'retail' | 'wholesale' | 'quotation') => {
    dispatch({ type: 'SET_SALE_TYPE', payload: saleType });
  }, []);

  const recalculatePrices = useCallback((inventory: Inventory[]) => {
    dispatch({ type: 'RECALCULATE_PRICES', payload: inventory });
  }, []);

  const setInventory = useCallback((inventory: Inventory[]) => {
    dispatch({ type: 'SET_INVENTORY', payload: inventory });
  }, []);

  const toggleReturnSale = useCallback(() => {
    if (state.currentBillId) {
      dispatch({ type: 'TOGGLE_BILL_RETURN_SALE', payload: state.currentBillId });
    }
  }, [state.currentBillId]);

  const toggleQuotationToInvoice = useCallback(() => {
    if (state.currentBillId) {
      dispatch({ type: 'TOGGLE_BILL_QUOTATION_TO_INVOICE', payload: state.currentBillId });
    }
  }, [state.currentBillId]);

  const setQuotationMode = useCallback((on: boolean) => {
    dispatch({ type: 'SET_QUOTATION_MODE', payload: on });
  }, []);

  // Helper functions to get current bill's state
  const getCurrentBillReturnSale = useCallback(() => {
    const currentBill = state.bills.find(bill => bill.bill_unique_id === state.currentBillId);
    return currentBill?.is_return_sale || false;
  }, [state.bills, state.currentBillId]);

  const getCurrentBillQuotationToInvoice = useCallback(() => {
    const currentBill = state.bills.find(bill => bill.bill_unique_id === state.currentBillId);
    return currentBill?.is_quotation_to_invoice || false;
  }, [state.bills, state.currentBillId]);

  // Validation functions for return bills using existing isreturned field
  const canBillBeReturned = useCallback(async (bill: any) => {
    // Can only return if:
    // 1. It's NOT already a return bill (is_returned === 0)
    // 2. It has items to return
    // 3. It hasn't been returned before (no other bills reference it as original)
    if (bill.is_returned === 1 || bill.isreturned === 1) {
      return false; // Already a return bill
    }
    
    if (!bill.bill_items || (typeof bill.bill_items === 'string' && JSON.parse(bill.bill_items).length === 0) || (Array.isArray(bill.bill_items) && bill.bill_items.length === 0)) {
      return false; // No items to return
    }
    
    // Check if this bill has been returned before using efficient backend check
    try {
      if (window.electronAPI) {
        const checkResult = await window.electronAPI.invoke('bills:checkIfAlreadyReturned', bill.billno);
        if (checkResult.success && checkResult.alreadyReturned) {
          return false; // Already returned
        }
      }
    } catch (error) {
      console.error('Error checking if bill already returned:', error);
      // If we can't check, allow the return but log the error
    }
    
    return true;
  }, []);

  const validateReturnBill = useCallback(async (bill: any): Promise<string[]> => {
    const errors: string[] = [];
    
    if (bill.is_returned === 1 || bill.isreturned === 1) {
      errors.push('This bill is already a return bill');
    }
    
    if (!bill.bill_items || (typeof bill.bill_items === 'string' && JSON.parse(bill.bill_items).length === 0) || (Array.isArray(bill.bill_items) && bill.bill_items.length === 0)) {
      errors.push('This bill has no items to return');
    }
    
    // Check if this bill has been returned before using efficient backend check
    try {
      if (window.electronAPI) {
        const checkResult = await window.electronAPI.invoke('bills:checkIfAlreadyReturned', bill.billno);
        if (checkResult.success && checkResult.alreadyReturned) {
          errors.push(`This bill has already been returned (Return Bill: ${checkResult.returnBill.billno})`);
        }
      }
    } catch (error) {
      console.error('Error checking if bill already returned:', error);
      // If we can't check, allow the return but log the error
    }
    
    return errors;
  }, []);

  const setOriginalBillNo = useCallback((billno: string) => {
    dispatch({ type: 'SET_ORIGINAL_BILL_NO', payload: billno });
  }, []);

  const value: SalesContextType = {
    state,
    currentBill,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleWholesale,
    setCustomerInfo,
    setAccountUniqueId,
    setPaymentMethod,
    completeSale,
    getCartTotal,
    scanBarcode,
    createNewBill,
    switchBill,
    deleteBill,
    setBillValues,
    refresh,
    setSaleType,
    recalculatePrices,
    setInventory,
    completeQuotation,
    isReturnSale: getCurrentBillReturnSale(),
    toggleReturnSale,
    isQuotationToInvoice: getCurrentBillQuotationToInvoice(),
    toggleQuotationToInvoice,
    isQuotationMode,
    setQuotationMode,
    canBillBeReturned,
    validateReturnBill,
    setOriginalBillNo,
  }

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
}

export function useSales() {
  const context = useContext(SalesContext)
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider')
  }
  return context
} 