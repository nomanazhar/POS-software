import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconCreditCard, IconReceipt, IconSearch, IconUser } from '@tabler/icons-react';
import { useSales } from '../context/sales-context';
import { ReceiptDialog } from './receipt-dialog';
import { useAuthStore } from '@/stores/authStore';
import { useAccountContext } from '@/features/accounts/context/account-context';
import { useTax } from '@/context/tax-context';
import { toast } from 'sonner';

interface CheckoutProps {
  keyboardRefs?: {
    discountInputRef?: React.RefObject<HTMLInputElement>;
    extraChargesInputRef?: React.RefObject<HTMLInputElement>;
    receivedCashInputRef?: React.RefObject<HTMLInputElement>;
    customerNameInputRef?: React.RefObject<HTMLInputElement>;
    wholesaleToggleRef?: React.RefObject<HTMLButtonElement>;
  };
  inventory?: any[];
}

export function Checkout({ keyboardRefs, inventory }: CheckoutProps) {
  const { currentBill, setAccountUniqueId, setPaymentMethod, completeSale, setQuotationMode, isReturnSale, toggleReturnSale, completeQuotation, clearCart, setBillValues, setSaleType, recalculatePrices, isQuotationToInvoice, toggleQuotationToInvoice,
    //  isQuotationMode,  canBillBeReturned, validateReturnBill, toggleWholesale
     } = useSales();
  const { calculateTax, taxRate } = useTax();
  const { accounts, fetchAccounts } = useAccountContext();
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptIsQuotation, setReceiptIsQuotation] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<any>(null);
  const user = useAuthStore((state) => state.auth.user);
  const [receivedCash, setReceivedCash] = useState<number | ''>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [customerInfoExpanded, setCustomerInfoExpanded] = useState(false);
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [extraDiscount, setExtraDiscount] = useState<string>('');
  // Use the current bill's sale_type instead of local state
  const saleMode = currentBill?.sale_type || 'retail';
  
  // Reset form fields when switching bills
  useEffect(() => {
    if (currentBill) {
      // Reset form fields for new bills
      setExtraDiscount('');
      setReceivedCash('');
      setCustomerNameInput('');
      setCustomerInfoExpanded(false);
      setShowCustomerSearch(false);
      setCustomerSearchQuery('');
    }
  }, [currentBill?.bill_unique_id]);
  
  // Customer search state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  
  // Use keyboard refs if provided, otherwise use local refs
  const discountInputRef = keyboardRefs?.discountInputRef || useRef<HTMLInputElement>(null);
  const extraChargesInputRef = keyboardRefs?.extraChargesInputRef || useRef<HTMLInputElement>(null);
  const receivedCashInputRef = keyboardRefs?.receivedCashInputRef || useRef<HTMLInputElement>(null);
  const customerNameInputRef = keyboardRefs?.customerNameInputRef || useRef<HTMLInputElement>(null);
  const wholesaleToggleRef = keyboardRefs?.wholesaleToggleRef || useRef<HTMLButtonElement>(null);

  // Enhanced calculation logic - memoized to prevent infinite loops
  const {
    billItems,
    // subtotal,
    // cartDiscount,
    // tax,
    totalWithExtras,
    change
  } = useMemo(() => {
    const items = currentBill ? JSON.parse(currentBill.bill_items || '[]') : [];
    
    // Calculate subtotal with proper price handling based on current sale type
    const subtotal = items.reduce((sum: number, item: any) => {
      let unitPrice = Number(item.unit_price || item.retail_price || 0);
      
      // If inventory is available, calculate the correct price based on sale type
      if (inventory && inventory.length > 0) {
        const product = inventory.find((p: any) => p.product_unique_id === item.product_unique_id);
        if (product) {
          const isWholesale = currentBill?.sale_type === 'wholesale';
          unitPrice = isWholesale 
            ? Number(product.wholesale_price || 0)
            : Number(product.retail_price || 0);
        }
      }
      
      const quantity = Number(item.quantity || 0);
      const itemTotal = unitPrice * quantity;
      return sum + itemTotal;
    }, 0);
    
    // Calculate item-level discounts
    const cartDiscount = items.reduce((sum: number, item: any) => {
      const itemDiscount = Number(item.discount || 0);
      const quantity = Number(item.quantity || 0);
      return sum + (itemDiscount * quantity);
    }, 0);
    
    // Calculate tax using centralized tax rate
    const calculatedTax = calculateTax(subtotal);
    
    // Get extra charges and discount
    const extraCharges = Number(currentBill?.extra_charges || 0);
    const extraDiscountAmount = Number(extraDiscount || 0);
    
    // Calculate final total with proper order: subtotal - discounts + taxes + extra charges
    const totalWithExtras = Math.max(
      subtotal - cartDiscount - extraDiscountAmount + calculatedTax + extraCharges, 
      0
    );
    
    // Calculate change
    const change = typeof receivedCash === 'number' && receivedCash > 0 ? Math.max(0, receivedCash - totalWithExtras) : 0;
    
    return {
      billItems: items,
      subtotal,
      cartDiscount,
      tax: calculatedTax,
      totalWithExtras,
      change
    };
  }, [currentBill, extraDiscount, receivedCash, inventory, calculateTax]);

  useEffect(() => {
    if (!customerInfoExpanded) {
      return;
    }
  }, [customerNameInput, customerInfoExpanded]);

  // Load customer accounts when customer info is expanded
  useEffect(() => {
    if (customerInfoExpanded) {
      fetchAccounts();
    }
  }, [customerInfoExpanded, fetchAccounts]);

  // Filter customers based on search query
  useEffect(() => {
    if (!customerSearchQuery.trim()) {
      setFilteredCustomers([]);
      return;
    }

    const customers = accounts.filter(account => 
      account.account_type === 'customer' && 
      account.account_status === 'active' &&
      (account.fullname?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
       account.account_unique_id?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
       account.phone_no?.includes(customerSearchQuery) ||
       account.email?.toLowerCase().includes(customerSearchQuery.toLowerCase()))
    );
    
    setFilteredCustomers(customers.slice(0, 10)); // Limit to 10 results
  }, [customerSearchQuery, accounts]);

  const handleCustomerSelect = (customer: any) => {
    setAccountUniqueId(customer.account_unique_id);
    setCustomerNameInput(customer.fullname);
    setCustomerSearchQuery('');
    setShowCustomerSearch(false);
    setCustomerInfoExpanded(false);
    toast.success(`Selected customer: ${customer.fullname}`);
  };

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('#customer-search') && !target.closest('.customer-search-dropdown')) {
        setShowCustomerSearch(false);
      }
    };

    if (showCustomerSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCustomerSearch]);

  const handleCompleteSale = async () => {
    // Enhanced validation
    if (!currentBill || JSON.parse(currentBill.bill_items || '[]').length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    const isWalkIn = currentBill.account_unique_id === '1_1_walkin_customer';
    
    // Validate received cash for cash payments (only for actual sales, not quotations)
    if (saleMode !== 'quotation' && currentBill?.payment_method === 'cash') {
      if (isWalkIn) {
        // Walk-in must pay full amount
        if (typeof receivedCash !== 'number') {
          toast.error('Walk-in customer must pay full amount');
          return;
        }
        if (receivedCash < totalWithExtras) {
          toast.error('Walk-in customer must pay full amount');
          return;
        }
      } else {
        // Non walk-in: allow partial or zero cash (credit)
        // No blocking validation here; backend will record remaining as ledger
      }
    }
    
    if (saleMode === 'quotation') {
      const ok = await completeQuotation(totalWithExtras);
      if (ok) {
        setReceiptIsQuotation(true);
        setShowReceipt(true);
        setReceivedCash('');
        setCustomerNameInput('');
        setExtraDiscount('');
        setErrors({});
      }
      return;
    }
    
    
    // The receivedCash value from the "Received Cash" input field 
    // will be saved to the 'paid_amount' column in the bills table
    // Note: This can exceed the bill total (overpayment) and will store the actual amount received
    // console.log('Completing sale with received cash:', receivedCash, 'total:', totalWithExtras);
    const transaction = await completeSale(typeof receivedCash === 'number' ? receivedCash : 0, totalWithExtras);
    if (transaction) {
      setCompletedTransaction(transaction);
      setReceiptIsQuotation(false);
      setShowReceipt(true);
      setReceivedCash('');
      setCustomerNameInput('');
      setExtraDiscount('');
      setErrors({});
    }
  };
  const handleReceiptClose = () => {
    setShowReceipt(false);
    setCompletedTransaction(null);
    clearCart();
  };
  const validateField = (field: string, value: string | number) => {
    let error = '';
    if (typeof value === 'string' && value !== '' && isNaN(Number(value))) {
      error = 'Must be a number';
    } else if (Number(value) < 0) {
      error = 'Cannot be negative';
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === '';
  };

  const handleExtraChargesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    validateField('extra_charges', value);
    setBillValues({ extracharges: parseFloat(value) || 0 });
  };

  const isCheckoutDisabled = !currentBill || billItems.length === 0;

  if (!currentBill) return null;

  return (
    <div className=' h-[100%] xl:h-[100%] lg:h-[100%] md:h-[140%] w-full lg:w-[100%]'>
      <Card className="w-[100%] h-[100%]  flex flex-col gap-0 ">
        <CardHeader className="h-[10%] w-full  p-2 flex items-center justify-between gap-2 shrink-0 rounded-t-xl  ">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-1 bg-primary/10 rounded-lg">
              <IconReceipt className="h-5 w-5 text-primary" />
            </div>
            {`Billing${user && user.accountNo ? ` by ${user.accountNo}` : ''}`} 
          </CardTitle>
          <div className="xl:w-24 lg:w-24 md:w-24 w-20" >
            <Select

              value={saleMode}
              onValueChange={(val: 'retail' | 'wholesale' | 'quotation') => {
                if (val === 'retail') {
                  setSaleType('retail');
                  setQuotationMode(false);
                  if (inventory) {
                    recalculatePrices(inventory);
                    toast.success('Prices updated to retail rates');
                  }
                } else if (val === 'wholesale') {
                  setSaleType('wholesale');
                  setQuotationMode(false);
                  if (inventory) {
                    recalculatePrices(inventory);
                    toast.success('Prices updated to wholesale rates');
                  }
                } else if (val === 'quotation') {
                  setSaleType('quotation');
                  setQuotationMode(true);
                  if (inventory) {
                    recalculatePrices(inventory);
                    toast.success('Prices updated for quotation');
                  }
                }
              }}
            >
              <SelectTrigger ref={wholesaleToggleRef as any} className="h-8 w-[100%]">
                <SelectValue placeholder="Retail" />
              </SelectTrigger>
              <SelectContent className="w-[60%]">
                <SelectItem value="retail" className="w-[100%]">Retail</SelectItem>
                <SelectItem value="wholesale" className="w-[100%]">Wholesale</SelectItem>
                <SelectItem value="quotation" className="w-[100%]">Quotation</SelectItem>
                <div className="px-2 py-2 space-y-2">
                  <Button
                    type="button"
                    variant={isQuotationToInvoice ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-[100%] justify-center"
                    onMouseDown={(e) => { e.preventDefault(); }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleQuotationToInvoice(); }}
                    title="Toggle to load quotation by scanning its number"
                  >
                    quotationTOinvoice
                  </Button>
                  <Button
                    type="button"
                    variant={isReturnSale ? 'default' : 'outline'}
                    size="sm"
                    className="h-8  w-[100%] justify-center"
                    onMouseDown={(e) => { e.preventDefault(); }}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleReturnSale(); }}
                    title="Toggle return sale mode"
                  >
                    Return Sale
                  </Button>
                </div>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[90%] w-full flex-1 flex flex-col min-h-0 space-y-1 overflow-y-auto rounded-b-xl  ">
          <div className='h-[100%]  w-full gap-2 flex flex-col'>
          <div className="h-[45%] xl:h-[40%] lg:h-[45%] md:h-[43%]  mt-0 w-full flex flex-col gap-1 ">
            <div className="w-full flex justify-between gap-1">
              <div className="w-[45%] lg:w-[44%]">
                <Label htmlFor="discount" className="text-sm font-medium block">
                  Discount
                </Label>
                <Input
                  ref={discountInputRef}
                  id="discount"
                  type="text"
                  inputMode="decimal"
                  value={extraDiscount}
                  onChange={(e) => {
                    setExtraDiscount(e.target.value);
                    validateField('total_discount', e.target.value);
                    const v = parseFloat(e.target.value);
                    setBillValues({ total_discount: isNaN(v) ? 0 : v });
                  }}
                  className="h-10 text-base px-3 mt-1"
                  placeholder="00"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Discount: {(currentBill.total_discount || 0).toFixed(2)}
                </div>
                {errors.total_discount && <span className="text-xs text-red-500">{errors.total_discount}</span>}
              </div>
              <div className="w-[45%] lg:w-[51%]">
                <Label htmlFor="extra-charges" className="text-sm font-medium">
                  Extra Charges
                </Label>
                <Input
                  ref={extraChargesInputRef}
                  id="extra-charges"
                  type="text"
                  inputMode="decimal"
                  value={currentBill.extra_charges === 0 ? '' : currentBill.extra_charges}
                  onChange={handleExtraChargesChange}
                  className="h-10 text-base px-3 mt-1"
                  placeholder="00"
                />
                {errors.extra_charges && <span className="text-xs text-red-500">{errors.extra_charges}</span>}
              </div>
            </div>
            <div className="w-full flex justify-between gap-4">
              <div className="w-[100%]">
                <Label htmlFor="total" className="text-md font-medium block">
                  Grand Total (with {taxRate}% Sales Tax)
                </Label>
                <Input
                  id="total"
                  type="text"
                  value={totalWithExtras.toFixed(2)}
                  readOnly
                  className="h-10  px-3 mt-1 cursor-not-allowed !text-destructive  font-bold !bg-muted "
                  placeholder="00"
                />
              </div>
            </div>
            {/* Hide received cash and change fields for quotations since no payment is made */}
            {saleMode !== 'quotation' && (
              <div className="w-full flex justify-between gap-1">
                <div className="w-[45%] lg:w-[57%]">
                  {/* This "Received Cash" value gets saved to the 'paid_amount' column in the bills table */}
                  {/* It stores the actual amount received, even if customer pays more than bill total */}
                  <Label htmlFor="received-cash" className="text-sm font-medium block">
                    Received Cash
                  </Label>
                  <Input
                    ref={receivedCashInputRef}
                    id="received-cash"
                    type="text"
                    inputMode="decimal"
                    value={receivedCash === '' ? '' : receivedCash}
                    onChange={(e) => {
                      const val = e.target.value;
                      validateField('receivedCash', val);
                      if (val === '') {
                        setReceivedCash('');
                      } else {
                        const numVal = parseFloat(val);
                        setReceivedCash(isNaN(numVal) ? '' : numVal);
                      }
                    }}
                    className="h-10 text-base !text-green-500 px-3 mt-1"
                    placeholder="00"
                  />
                  {errors.receivedCash && <span className="text-xs text-red-500">{errors.receivedCash}</span>}
                </div>
                <div className="w-[45%] lg:w-[41%]">
                  <Label htmlFor="change" className="text-sm font-medium block">
                    Change
                  </Label>
                  <Input
                    id="change"
                    type="text"
                    value={receivedCash === '' ? '' : `${change.toFixed(2)}`}
                    readOnly
                    className="h-10 text-base px-3 mt-1 !text-yellow-600  !bg-muted cursor-not-allowed "
                    placeholder="00"
                  />
                  {typeof receivedCash === 'number' && receivedCash > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {/* <div>Total: ${totalWithExtras.toFixed(2)}</div>
                      <div>Received: ${receivedCash.toFixed(2)}</div>
                      <div>Change: ${change.toFixed(2)}</div> */}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="h-[16%] xl:h-[14%] lg:h-[14%] md:h-[14%] lg:mt-6  space-y-3 ">
            <div className=" flex items-center gap-2">
              <IconCreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Payment Method</h3>
            </div>
            <RadioGroup
              value={currentBill.payment_method}
              onValueChange={(value: 'cash' | 'card' | 'ledger') => setPaymentMethod(value)}
              className="grid  gap-4 "
            >
              <div>
                <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                <Label
                  htmlFor="cash"
                  className="flex flex-col items-center justify-between rounded-lg border-1 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  {/* <IconCash className="mb-2 h-6 w-6" /> */}
                  <span className="text-sm font-medium">Cash</span>
                </Label>
              </div>
              {/* <div>
                <RadioGroupItem value="card" id="card" className="peer sr-only" />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  {/* <IconCard className="mb-2 h-6 w-6" /> 
                  <span className="text-sm font-medium">Card</span>
                </Label>
              </div> */}
            </RadioGroup>
          </div>
          <Separator />
          <div className="h-[34%] xl:h-[42%] lg:h-[34%] md:h-[38%]   space-y-2 overflow-y-auto  "> 
            <button
              type="button"
              className="w-full flex items-center gap-2 p-1 rounded-lg border bg-muted hover:bg-accent transition-all text-left"
              onClick={() => setCustomerInfoExpanded((prev) => !prev)}
            >
              <span className="font-medium">
                {currentBill.account_unique_id === '1_1_walkin_customer' ? 'Walk-in Customer' : customerNameInput || `Customer ID: ${currentBill.account_unique_id}`}
              </span>
              <span className="ml-auto text-xs text-primary underline">
                {customerInfoExpanded ? 'Hide' : currentBill.account_unique_id ? 'Edit' : ''}
              </span>
            </button>
            {customerInfoExpanded && (
              <div className="grid grid-cols-1 gap-2 mt-2 relative">
                <div className="space-y-2 relative">
                  <Label htmlFor="customer-search" className="text-sm font-medium">
                    Search Customer
                  </Label>
                  <div className="relative">
                    <Input
                      ref={customerNameInputRef}
                      id="customer-search"
                      placeholder="Search by name, ID, phone, or email..."
                      value={customerSearchQuery}
                      onChange={(e) => { 
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerSearch(true);
                      }}
                      onFocus={() => { setShowCustomerSearch(true); }}
                      className="h-10 pr-10"
                      autoComplete="off"
                    />
                    <IconSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  {/* Customer search results dropdown */}
                  {showCustomerSearch && (customerSearchQuery.trim() || filteredCustomers.length > 0) && (
                    <div className="customer-search-dropdown absolute  w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                          <div 
                            key={customer.account_unique_id}
                            className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                            onClick={() => handleCustomerSelect(customer)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <IconUser className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{customer.fullname}</p>
                                 
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                Balance: ${customer.balance?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : customerSearchQuery.trim() ? (
                        <div className="p-3 text-center text-muted-foreground">
                          <p className="text-sm">No customers found</p>
                          <p className="text-xs">Try searching by name, ID, phone, or email</p>
                        </div>
                      ) : null}
                      
                      {/* Quick actions */}
                      <div className="p-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => {
                            setAccountUniqueId('1_1_walkin_customer');
                            setCustomerNameInput('Walk-in Customer');
                            setCustomerSearchQuery('');
                            setShowCustomerSearch(false);
                            setCustomerInfoExpanded(false);
                            toast.success('Selected: Walk-in Customer');
                          }}
                        >
                          <IconUser className="h-3 w-3 mr-1" />
                          Use Walk-in Customer
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Selected customer display */}
                  {currentBill.account_unique_id && currentBill.account_unique_id !== '1_1_walkin_customer' && (
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <p className="text-sm font-medium">Selected Customer:</p>
                      <p className="text-xs text-muted-foreground">{customerNameInput || currentBill.account_unique_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
          {/* <div className="flex-1 !bg-pink-500" /> */}
          <Separator />
          <div className="space-y-1 pb-2">
            <Button
              onClick={handleCompleteSale}
              disabled={isCheckoutDisabled}
              className="w-full h-12 text-base font-medium p-2"
              size="lg"
            >
              <IconReceipt className="mr-2 h-5 w-5" />
              Complete Sale
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {showReceipt && (
          <ReceiptDialog 
            onClose={handleReceiptClose} 
            quotationMode={receiptIsQuotation} 
            completedTransaction={completedTransaction}
          />
      )}
    </div>
  );
}