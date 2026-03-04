import { lazy, Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { IconMinus, IconPlus, IconTrash, IconShoppingCart, IconChevronDown,
  //  IconEdit, 
   IconClock } from '@tabler/icons-react';
import { useSales } from '../context/sales-context';
import { useInventory } from '@/features/inventory/context/inventory-context';
import { Inventory } from '@/features/inventory/data/schema';
import { useCurrency } from '@/context/currency-context';
import { useTax } from '@/context/tax-context';

// Lazy-load components
const BarcodeScanner = lazy(() =>  import('./barcode-scanner').then(m => ({ default: m.BarcodeScanner })));
const ConfirmDialog = lazy(() => import('@/components/confirm-dialog').then(m => ({ default: m.ConfirmDialog })));

interface CartProps {
  barcodeInputRef?: React.RefObject<HTMLInputElement>;
  keyboardRefs?: {
    barcodeInputRef?: React.RefObject<HTMLInputElement>;
    quantityInputRef?: React.RefObject<HTMLInputElement>;
    discardButtonRef?: React.RefObject<HTMLButtonElement>;
  };
  inventory: Inventory[];
}

export function Cart({ barcodeInputRef, keyboardRefs }: CartProps) {
  const { state, currentBill, updateQuantity, removeFromCart, getCartTotal, createNewBill, deleteBill, switchBill, isReturnSale, 
    // toggleReturnSale 
  } = useSales();
  const { formatAmount } = useCurrency();
  const { calculateTax } = useTax();
  const { bills, currentBillId } = state;
  const { subtotal } = getCartTotal();
  const { products: inventoryProducts, refresh: refreshInventory } = useInventory();
  const [showConfirm, setShowConfirm] = useState(false);
  const { isQuotationMode } = useSales() as any;

  // Refresh inventory on mount and when sales are completed
  useEffect(() => {
    refreshInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBill, refreshInventory]);

  // Listen for inventory refresh events
  useEffect(() => {
    const handleInventoryRefresh = () => {
      refreshInventory();
    };

    // Import eventEmitter dynamically to avoid circular dependencies
    import('@/lib/event-emitter').then(({ eventEmitter }) => {
      eventEmitter.on('inventory:refresh', handleInventoryRefresh);
      return () => {
        eventEmitter.off('inventory:refresh', handleInventoryRefresh);
      };
    });
  }, [refreshInventory]); 

  const handleQuantityChange = (product_unique_id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(product_unique_id);
    } else {
      updateQuantity(product_unique_id, newQuantity);
    }
  };

  const handleNewBill = () => {
    createNewBill();
  };

  const handleSwitchBill = (billId: string) => {
    switchBill(billId);
  };

  const handleCancelBill = () => {
    setShowConfirm(true);
  };

  const formatBillTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getBillSummary = (bill: typeof bills[0]) => {
    const billItems = JSON.parse(bill.bill_items || '[]');
    const itemCount = billItems.length;
    const totalItems = billItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalValue = billItems.reduce((sum: number, item: any) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);
    return { itemCount, totalItems, totalValue };
  };

  if (!currentBill) return null;

  return (
    <Card className="w-full lg:w-[100%] h-[100%] flex flex-col gap-0 overflow-y-hidden">
      <CardHeader className="h-[12vh] p-2 shrink-0  ">
        
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {bills.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    {/* <IconList className="h-3 w-3" /> */}
                    Bill {bills.findIndex((b) => b.bill_unique_id === currentBillId) + 1} / {bills.length}
                    <IconChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Switch Bills
                  </div>
                  <DropdownMenuSeparator />
                  {bills.map((bill, index) => {
                    const summary = getBillSummary(bill);
                    const isActive = bill.bill_unique_id === currentBillId;
                    return (
                      <DropdownMenuItem
                        key={bill.bill_unique_id}
                        onClick={() => handleSwitchBill(bill.bill_unique_id)}
                        className={`flex items-center justify-between p-3 cursor-pointer ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Bill {index + 1}</span>
                              {isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <IconClock className="h-3 w-3" />
                              {formatBillTime(new Date(bill.created_at))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-medium">{formatAmount(summary.totalValue)}</div>
                          <div className="text-muted-foreground">{summary.totalItems} items</div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              onClick={handleNewBill}
              variant="outline"
              size="sm"
              className="h-8"
            >
              <IconPlus className="h-3 w-3 " />
              New Bill
            </Button>
          </div>
          <div className="w-[80%]">
            <Suspense fallback={<div>Loading scanner...</div>}>
              <BarcodeScanner 
                inventory={inventoryProducts} 
                barcodeInputRef={keyboardRefs?.barcodeInputRef || barcodeInputRef} 
              />
            </Suspense>
          </div>
          <div className="flex items-center gap-2">
            {currentBill && (
              <Button
                ref={keyboardRefs?.discardButtonRef}
                onClick={handleCancelBill}
                variant="outline"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                title="Cancel current bill"
              >
                Discard
              </Button>
            )}
          </div>
        </div>
      

      </CardHeader>
      {/* ===== Cart Content ===== */}
      <CardContent className=" flex-1 max-h-[73vh]  p-0">
        {JSON.parse(currentBill.bill_items || '[]').length === 0 ? (
          <div className="flex-1 h-[88vh] flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <IconShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-2">Cart is Empty</h3>
            <p className="text-muted-foreground text-sm">
              Scans to add them to your cart
            </p>
            {bills.length > 1 && (
              <p className="text-muted-foreground text-xs mt-2">
                You have {bills.length - 1} other bill{bills.length > 2 ? 's' : ''} with items
              </p>
            )}
          </div>
        ) : (
          <div className=' h-full w-full flex flex-col justify-between '>
            <div className="flex-1 min-h-[90%] w-[100%] overflow-y-auto ">
              <Table >
                <TableHeader className='bg-muted-foreground/10 '>
                  <TableRow>
                    {!isReturnSale && <TableHead className="w-[200px]">Barcode</TableHead>}
                    <TableHead className="text-left">Product</TableHead>
                    <TableHead className="text-left">Price</TableHead>
                    <TableHead className="text-left">Quantity</TableHead>
                    <TableHead className="text-left">Discount</TableHead>
                    <TableHead className="text-left">Tax</TableHead>
                    <TableHead className="text-left">Total Price</TableHead>
                    <TableHead className="text-left">Profit Margin</TableHead>
                    <TableHead className="text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody >
                  {JSON.parse(currentBill.bill_items || '[]').map((item: any) => {
                    // Find the product in inventory to get stock and full product details
                    const productInInventory = inventoryProducts.find(p => p.product_unique_id === item.product_unique_id);
                    
                    // Calculate the correct price based on current sale type
                    let price = item.unit_price;
                    if (productInInventory) {
                      const isWholesale = currentBill.sale_type === 'wholesale';
                      price = isWholesale 
                        ? (productInInventory.wholesale_price || 0)
                        : (productInInventory.retail_price || 0);
                    }
                    
                    const itemTotal = price * item.quantity;
                    // Calculate profit margin
                    const purchasePrice = productInInventory?.purchase_price || 0;
                    const profitPerUnit = price - purchasePrice;
                    const profitMargin = purchasePrice > 0 ? profitPerUnit : 0;

                    return (
                      <TableRow key={item.product_unique_id}>
                        {!isReturnSale && (
                          <TableCell className="text-left font-mono text-sm">
                            {item.barcode}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{item.product_name}</h4>
                               <div className='flex flex-col gap-2'>
                                {productInInventory && productInInventory.stock === 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Out of Stock
                                  </Badge>
                                )} 
                              
                                {!isReturnSale && !isQuotationMode && productInInventory && productInInventory.stock > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Stock: {productInInventory.stock}
                                  </Badge>
                                )}
                                

                                {currentBill.sale_type === 'wholesale' && (
                                  <Badge variant="secondary" className="text-xs">
                                    Wholesale
                                  </Badge>
                                )}
                        </div>

                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="font-medium text-primary">
                            {formatAmount(price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-start">
                            <div className="flex items-center border rounded-lg">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuantityChange(item.product_unique_id, item.quantity - 1)}
                                className="h-8 w-8 p-0 hover:bg-red-600"
                              >
                                <IconMinus className="h-3 w-3" />
                              </Button>
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 0;
                                  let maxQuantity = Infinity;
                                  
                                  if (isReturnSale && (item as any).originalSoldQuantity) {
                                    // For return sales, limit to original sold quantity
                                    maxQuantity = (item as any).originalSoldQuantity;
                                  } else if (!isReturnSale && !isQuotationMode && productInInventory) {
                                    // For regular sales, limit to available stock
                                    maxQuantity = productInInventory.stock;
                                  }
                                  
                                  const validQuantity = Math.min(Math.max(0, newQuantity), maxQuantity);
                                  handleQuantityChange(item.product_unique_id, validQuantity);
                                }}
                                min="0"
                                max={isReturnSale && (item as any).originalSoldQuantity ? (item as any).originalSoldQuantity : (!isReturnSale && !isQuotationMode && productInInventory ? productInInventory.stock : undefined)}
                                className="px-2 w-[3vw] text-center font-medium text-sm"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuantityChange(item.product_unique_id, item.quantity + 1)}
                                className="h-8 w-8 p-0 hover:bg-green-500"
                                disabled={
                                  (isReturnSale && (item as any).originalSoldQuantity && item.quantity >= (item as any).originalSoldQuantity) ||
                                  (!isReturnSale && !isQuotationMode && productInInventory && item.quantity >= productInInventory.stock)
                                }
                                title={
                                  isReturnSale && (item as any).originalSoldQuantity && item.quantity >= (item as any).originalSoldQuantity 
                                    ? `Cannot return more than originally sold ({(item as any).originalSoldQuantity})` 
                                    : !isReturnSale && !isQuotationMode && productInInventory && item.quantity >= productInInventory.stock 
                                      ? 'Stock limit reached' 
                                      : 'Increase quantity'
                                }
                              >
                                <IconPlus className="h-3 w-3" />
                              </Button>
                            </div>
                            {isReturnSale && (
                              <div className="text-xs text-muted-foreground mt-1 ml-2">
                                Original Sold: {item.originalSoldQuantity || item.quantity}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="font-medium text-green-700">{formatAmount(item.discount ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-left">
                          <span className="font-medium text-blue-700">{formatAmount(calculateTax(item.unit_price * item.quantity))}</span>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="font-bold text-sm">{formatAmount(itemTotal)}</div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-medium text-sm ${
                            profitMargin > 0 ? 'text-green-600' : profitMargin < 0 ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                            {formatAmount(profitMargin)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-start">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.product_unique_id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <IconTrash className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Separator />
            <div className=" p-2 border-t shrink-0 bg-muted-foreground/10 h-[10%] w-[100%] ">
              <div className="flex flex-row justify-between items-center gap-2 font-bold text-lg">
                <div className="flex justify-between items-center">
                  <span>Total</span>
                </div>

                <div className='flex flex-row gap-8 pr-16'  >
                <div className="flex justify-between items-center text-sm font-normal pr-18">
                  <span>{JSON.parse(currentBill.bill_items || '[]').reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-normal pr-4">
                  <span className="text-green-700">{formatAmount(JSON.parse(currentBill.bill_items || '[]').reduce((sum: number, item: any) => sum + (item.discount ?? 0) * item.quantity, 0))}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-normal">
                  <span className="text-blue-700">{formatAmount(calculateTax(subtotal))}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-normal">
                  <span className="text-primary">{formatAmount(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-normal">
                  <span className="text-green-700">
                    {(() => {
                      const totalProfit = JSON.parse(currentBill.bill_items || '[]').reduce((sum: number, item: any) => {
                        const product = inventoryProducts.find(p => p.product_unique_id === item.product_unique_id);
                        if (!product) return sum;
                        const purchasePrice = product.purchase_price || 0;
                        const profitPerUnit = (item.retail_price - purchasePrice) * item.quantity;
                        return sum + profitPerUnit;
                      }, 0);
                      return formatAmount(totalProfit);
                    })()}
                  </span>
                </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </CardContent>


      <Suspense fallback={<div>Loading dialog...</div>}>
        <ConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          title={`Discard Bill  ${bills.findIndex((b) => b.bill_unique_id === currentBillId) + 1}`}
          desc={`
            This will erase all the data for 
            BILL
            ${bills.findIndex((b) => b.bill_unique_id === currentBillId) + 1}. 
            Are you sure you want to discard this bill?`}
          confirmText="Discard"
          destructive
          handleConfirm={() => {
            setShowConfirm(false);
            if (currentBillId) deleteBill(currentBillId);
          }}
        />
      </Suspense>
    </Card>
  );
}