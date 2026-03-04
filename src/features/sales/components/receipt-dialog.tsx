import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconPrinter, IconDownload, IconReceipt } from '@tabler/icons-react'
import { useSales } from '../context/sales-context'
import { useCurrency } from '@/context/currency-context'
import { useAuthStore } from '@/stores/authStore'

interface ReceiptDialogProps {
  onClose: () => void
  saleReportMode?: boolean
  bills?: Array<{
    bill_unique_id: string;
    payment_method?: string | undefined | null; 
    total_amount: number;
  }>
  purchaseReportMode?: boolean
  purchases?: Array<{
    purchase_unique_id: string;
    purchase_id?: number;
    purchase_billno?: string;
    supplier_name?: string | null | undefined;
    total_amount: number;
    isreturned?: number;
  }>
  quotationMode?: boolean
  completedTransaction?: {
    id: string;
    items: any[];
    subtotal: number;
    total_tax: number;
    total: number;
    paymentMethod: string;
    createdAt: Date;
    receivedAmount?: number;
    change?: number;
  } | null
}

const receiptStyles = `
  .receipt-preview { 
    font-family: Arial; 
    // max-width: 300px;
    min-width:300px;
    margin: 0 auto;
    background: white;
    padding: 0 12px 20px;
    box-sizing: border-box;
    font-size: 14px;
    line-height: 1.4;
  }
  .receipt-preview .header { text-align: center; height:95px; }
  .receipt-preview .sale-report-header { text-align: center; height:100px; }
  .receipt-preview .store-icon { font-size: 24px; color: #0066cc; margin-bottom: 2px; }
  .receipt-preview .store-name{ font-size: 18px; font-weight: bold; color: #000; margin-bottom: 1px; }
  .receipt-preview .store-details{ display:flex; flex-direction:row; justify-content:center; align-items:center; height:20px; gap:8px; }
  .receipt-preview .sale-report-date { display: flex; flex-direction: row; justify-content: center; align-items: center; height: 20px; gap: 8px; }
  .receipt-preview .store-location{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
  .receipt-preview .store-phone{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
  .receipt-preview .separator{ border-top: 1px solid #000; margin: 10px 0; }
  .receipt-preview .transaction-details{ display: flex; flex-direction:row; justify-content: space-between; width:100%; }
  .receipt-preview .transaction-details-left{ display:flex; flex-direction:column; justify-content:start; align-items:left; width:55%; }
  .receipt-preview .transaction-details-right{ display:flex; flex-direction:column; justify-content:space-between; align-items:left; width:45%; }
  .receipt-preview .bill-number{ font-weight: bold; font-size: 14px; }
  .receipt-preview .transaction-date{ font-size: 12px; color: black; font-weight: 400; }
  .receipt-preview .customer-info{ display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
  .receipt-preview .customer-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
  .receipt-preview .cashier-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
  .receipt-preview .items-table{ width: 100%; border-collapse: collapse; margin: 2px 0; font-size: 12px; }
  .receipt-preview .items-table th{ text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
  .receipt-preview .items-table td{ padding: 3px 0; text-align: left; }
  .receipt-preview .items-table .item-name{ width: 45%; }
  .receipt-preview .items-table .item-price{ width: 35%; text-align: left; }
  .receipt-preview .items-table .item-total{ width: 20%; text-align: left; }
  .receipt-preview .summary-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; padding: 0px 5px; }
  .receipt-preview .total-row{ display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 2px; }
  .receipt-preview .payment-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
  .receipt-preview .barcode{ text-align: center; margin: 10px 0; font-size: 10px; }
  .receipt-preview .footer{ text-align: center; margin-top: 5px; }
  .receipt-preview .thank-you{ font-weight: bold; font-size: 14px; margin-bottom: 3px; }
  .receipt-preview .footer-text{ font-size: 10px; color: #666; margin-bottom: 5px; }
  .receipt-preview .footer-bottom{ text-align: center; font-size: 10px; color: #666; }
  .receipt-preview .mini { font-size: 8px; }
  .receipt-preview .full { font-size: 12px; }
  @media print {
    body { font-family: Arial; margin: 0; padding: 2px; line-height: 1.2; background: white; min-width: 76mm; }
    .receipt-preview { max-width: 76mm;  margin: 0 auto; }
    .receipt-preview .header { text-align: center; margin-bottom: 10px; height: 95px; }
    .receipt-preview .sale-report-header { text-align: center; height:100px; }
    .receipt-preview .store-icon { font-size: 24px; color: #0066cc; margin-bottom: 2px; }
    .receipt-preview .store-name { font-size: 18px; font-weight: bold; color: #000; margin-bottom: 1px; }
    .receipt-preview .store-details { display: flex; flex-direction: row; justify-content: center; align-items: center; height: 20px; gap: 8px; }
    .receipt-preview .sale-report-date { display: flex; flex-direction: row; justify-content: center; align-items: center; height: 20px; gap: 8px; }
    .receipt-preview .store-location { font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
    .receipt-preview .store-phone { font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
    .receipt-preview .separator { border-top: 1px solid #000; margin: 10px 0; }
    .receipt-preview .items-table { width: 100%; border-collapse: collapse; margin: 2px 0; font-size: 12px; }
    .receipt-preview .items-table th { text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
    .receipt-preview .items-table td { padding: 3px 0; text-align: left; }
    .receipt-preview .items-table .item-name { width: 45%; }
    .receipt-preview .items-table .item-price { width: 35%; text-align: left; }
    .receipt-preview .items-table .item-total { width: 20%; text-align: left; }
    .receipt-preview .total-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 2px; }
  }
`;

export function ReceiptDialog({ onClose, saleReportMode = false, bills = [], purchaseReportMode = false, purchases = [], quotationMode = false, completedTransaction = null }: ReceiptDialogProps) {
  const { formatAmount } = useCurrency()
  const [receiptType, 
    // setReceiptType
  ] = useState<'mini' | 'full'>('full')
  const { currentBill, getCartTotal } = useSales()
  const user = useAuthStore((state) => state.auth.user)
  const receiptRef = useRef<HTMLDivElement>(null)
  const saleReportRef = useRef<HTMLDivElement>(null)
  const purchaseReportRef = useRef<HTMLDivElement>(null)

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Get data from completed transaction or current bill (for reports)
  const { subtotal, total_tax, total } = completedTransaction ? {
    subtotal: completedTransaction.subtotal,
    total_tax: completedTransaction.total_tax,
    total: completedTransaction.total
  } : getCartTotal();
  
  const transactionId = completedTransaction?.id || currentBill?.billno  || `TXN-${Date.now()}`
  const customerId = currentBill?.account_unique_id || 'Walk-in Customer'
  const paymentMethod = completedTransaction?.paymentMethod || currentBill?.payment_method || 'cash'
  const createdAt = completedTransaction?.createdAt || (currentBill?.created_at ? new Date(currentBill.created_at) : new Date())
  const items = completedTransaction ? completedTransaction.items : JSON.parse(currentBill?.bill_items || '[]')
  const discount = currentBill?.total_discount || 0
  const extraCharges = currentBill?.extra_charges || 0
  const receivedAmount = completedTransaction?.receivedAmount || (currentBill?.paid_amount || 0)
  const change = completedTransaction?.change || (currentBill?.balance || 0)

  const handleDownload = () => {
    const content = `
MART POS
Receipt #${transactionId}
${formatDate(createdAt)}

${receiptType === 'full' ? `
${customerId ? `Customer: ${customerId}` : ''}
` : ''}
${items.map((item: any) => 
  `${item.product_name}\n${item.quantity} x ${formatAmount(item.unit_price ?? item.retail_price ?? 0)} = ${formatAmount((item.unit_price ?? item.retail_price ?? 0) * item.quantity)}`
).join('\n')}

Subtotal: ${formatAmount(subtotal)}
${total_tax > 0 ? 'Tax: ' + formatAmount(total_tax) : ''}
${discount > 0 ? 'Discount: -' + formatAmount(discount) : ''}
Total: ${formatAmount(total)}
Payment: ${paymentMethod.toUpperCase()}
${extraCharges > 0 ? 'Extra Charges: ' + formatAmount(extraCharges) : ''}

Thank you for your purchase!
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${transactionId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    if (!receiptRef.current) return;
    
    // Get the actual rendered HTML from the screen receipt
    const receiptHTML = receiptRef.current.innerHTML;
    
    const printContent = `
      <html>
        <head>
          <title>Receipt - ${transactionId}</title>
          <style>
            body { 
              font-family: Arial; 
              margin: 0;
              padding: 2px;
              font-size: 12px;
              line-height: 1.2;
              background: white;
              width: 76mm;
            padding-bottom: 10px;
            }
            
            .receipt-preview { 
              font-family: Arial; 
              margin: 0 auto;
              background: white;
            }
            .receipt-preview .header { text-align: center; height:95px; }
            .receipt-preview .store-icon { font-size: 24px; color: #0066cc; margin-bottom: 2px; }
            .receipt-preview .store-name{ font-size: 18px; font-weight: bold; color: #000; margin-bottom: 1px; }
            .receipt-preview .store-details{ display:flex; flex-direction:row; justify-content:center; align-items:center; height:20px; gap:8px; }
            .receipt-preview .store-location{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
            .receipt-preview .store-phone{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
            .receipt-preview .separator{ border-top: 1px solid #000; margin: 10px 0; }
            .receipt-preview .transaction-details{ display: flex; flex-direction:row; justify-content: space-between; width:100%; }
            .receipt-preview .transaction-details-left{ display:flex; flex-direction:column; justify-content:start; align-items:left; width:55%; }
            .receipt-preview .transaction-details-right{ display:flex; flex-direction:column; justify-content:space-between; align-items:left; width:45%; }
            .receipt-preview .bill-number{ font-weight: bold; font-size: 14px; }
            .receipt-preview .transaction-date{ font-size: 12px; color: black; font-weight: 400; }
            .receipt-preview .customer-info{ display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
            .receipt-preview .customer-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
            .receipt-preview .cashier-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
            .receipt-preview .items-table{ width: 100%; border-collapse: collapse; margin: 2px 0; font-size: 12px; }
            .receipt-preview .items-table th{ text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
            .receipt-preview .items-table td{ padding: 3px 0; text-align: left; }
            .receipt-preview .items-table .item-name{ width: 45%; }
            .receipt-preview .items-table .item-price{ width: 35%; text-align: left; }
            .receipt-preview .items-table .item-total{ width: 20%; text-align: right; }
            .receipt-preview .summary-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; padding: 0px 5px; }
            .receipt-preview .total-row{ display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 2px; }
            .receipt-preview .payment-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
            .receipt-preview .barcode{ text-align: center; margin: 10px 0; font-size: 10px; }
            .receipt-preview .footer{ text-align: center; margin-top: 5px; }
            .receipt-preview .thank-you{ font-weight: bold; font-size: 14px; margin-bottom: 3px; }
            .receipt-preview .footer-text{ font-size: 10px; color: #666; margin-bottom: 5px; }
            .receipt-preview .footer-bottom{ text-align: center; font-size: 10px; color: #666; }
            .receipt-preview .footer-bottom{ height: 15px; padding: 10px; }
            .receipt-preview .mini { font-size: 8px; }
            .receipt-preview .full { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt-preview">
            ${receiptHTML}
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      // Comment out auto-print and close to allow styling
      printWindow.print()
      printWindow.close()
    }
  }

  function handlePurchaseReportPrint(_purchases: Array<{ purchase_unique_id: string; supplier_name?: string | null | undefined; total_amount: number }>) {
    if (!purchaseReportRef.current) return;
    
    // Get the actual rendered HTML from the screen purchase report
    const receiptHTML = purchaseReportRef.current.innerHTML;
    
    const html = `
      <html>
        <head>
          <title>Purchase Report</title>
          <style>
            body { 
              font-family: Arial; 
              margin: 0;
              padding: 2px;
              font-size: 12px;
              line-height: 1.2;
              background: white;
              width: 75mm;
              padding-bottom: 10px;
            }
            
            .receipt-preview { 
              font-family: Arial; 
              margin: 0 auto;
              background: white;
            }
            .receipt-preview .header { text-align: center; height:95px; }
            .receipt-preview .sale-report-header { text-align: center; height:100px; }
            .receipt-preview .store-icon { font-size: 24px; color: #0066cc; margin-bottom: 2px; }
            .receipt-preview .store-name{ font-size: 18px; font-weight: bold; color: #000; margin-bottom: 1px; }
            .receipt-preview .store-details{ display:flex; flex-direction:row; justify-content:center; align-items:center; height:20px; gap:8px; }
            .receipt-preview .sale-report-date { display: flex; flex-direction: row; justify-content: center; align-items: center; height: 20px; gap: 8px; }
            .receipt-preview .store-location{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
            .receipt-preview .store-phone{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
            .receipt-preview .separator{ border-top: 1px solid #000; margin: 10px 0; }
            .receipt-preview .transaction-details{ display: flex; flex-direction:row; justify-content: space-between; width:100%; }
            .receipt-preview .transaction-details-left{ display:flex; flex-direction:column; justify-content:start; align-items:left; width:55%; }
            .receipt-preview .transaction-details-right{ display:flex; flex-direction:column; justify-content:space-between; align-items:left; width:45%; }
            .receipt-preview .bill-number{ font-weight: bold; font-size: 14px; }
            .receipt-preview .transaction-date{ font-size: 12px; color: black; font-weight: 400; }
            .receipt-preview .customer-info{ display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
            .receipt-preview .customer-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
            .receipt-preview .cashier-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
            .receipt-preview .items-table{ width: 100%; border-collapse: collapse; margin: 2px 0; font-size: 12px; }
            .receipt-preview .items-table th{ text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
            .receipt-preview .items-table td{ padding: 3px 0; text-align: left; }
            .receipt-preview .items-table .item-name{ width: 45%; }
            .receipt-preview .items-table .item-price{ width: 35%; text-align: left; }
            .receipt-preview .items-table .item-total{ width: 20%; text-align: right; }
            .receipt-preview .summary-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; padding: 0px 5px; }
            .receipt-preview .total-row{ display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 2px; }
            .receipt-preview .payment-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
            .receipt-preview .barcode{ text-align: center; margin: 10px 0; font-size: 10px; }
            .receipt-preview .footer{ text-align: center; margin-top: 5px; }
            .receipt-preview .thank-you{ font-weight: bold; font-size: 14px; margin-bottom: 3px; }
            .receipt-preview .footer-text{ font-size: 10px; color: #666; margin-bottom: 5px; }
            .receipt-preview .footer-bottom{ text-align: center; font-size: 10px; color: #666; }
            .receipt-preview .footer-bottom{ height: 15px; padding: 10px; }
            .receipt-preview .mini { font-size: 8px; }
            .receipt-preview .full { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt-preview">
            ${receiptHTML}
          </div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  function handleSaleReportPrint(_bills: Array<{ bill_unique_id: string; payment_method?: string | null | undefined; total_amount: number }>) {
    if (!saleReportRef.current) return;
    
    // Get the actual rendered HTML from the screen sale report
    const receiptHTML = saleReportRef.current.innerHTML;
    
    const html = `
      <html>
        <head>
          <title>Sale Report</title>
          <style>
            body { 
              font-family: Arial; 
              margin: 0;
              padding: 2px;
              font-size: 12px;
              line-height: 1.2;
              background: white;
              width: 75mm;
              padding-bottom: 10px;
            }
            
            .receipt-preview { 
              font-family: Arial; 
              margin: 0 auto;
              background: white;
            }
            .receipt-preview .header { text-align: center; height:95px; }
            .receipt-preview .sale-report-header { text-align: center; height:100px; }
            .receipt-preview .store-icon { font-size: 24px; color: #0066cc; margin-bottom: 2px; }
            .receipt-preview .store-name{ font-size: 18px; font-weight: bold; color: #000; margin-bottom: 1px; }
            .receipt-preview .store-details{ display:flex; flex-direction:row; justify-content:center; align-items:center; height:20px; gap:8px; }
            .receipt-preview .sale-report-date { display: flex; flex-direction: row; justify-content: center; align-items: center; height: 20px; gap: 8px; }
            .receipt-preview .store-location{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
            .receipt-preview .store-phone{ font-size: 12px; color: black; margin-bottom: 2px; font-weight: 400; }
            .receipt-preview .separator{ border-top: 1px solid #000; margin: 10px 0; }
            .receipt-preview .transaction-details{ display: flex; flex-direction:row; justify-content: space-between; width:100%; }
            .receipt-preview .transaction-details-left{ display:flex; flex-direction:column; justify-content:start; align-items:left; width:55%; }
            .receipt-preview .transaction-details-right{ display:flex; flex-direction:column; justify-content:space-between; align-items:left; width:45%; }
            .receipt-preview .bill-number{ font-weight: bold; font-size: 14px; }
            .receipt-preview .transaction-date{ font-size: 12px; color: black; font-weight: 400; }
            .receipt-preview .customer-info{ display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
            .receipt-preview .customer-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
            .receipt-preview .cashier-name{ font-size: 12px; font-weight: normal; color: #000; text-transform: uppercase; }
            .receipt-preview .items-table{ width: 100%; border-collapse: collapse; margin: 2px 0; font-size: 12px; }
            .receipt-preview .items-table th{ text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
            .receipt-preview .items-table td{ padding: 3px 0; text-align: left; }
            .receipt-preview .items-table .item-name{ width: 45%; }
            .receipt-preview .items-table .item-price{ width: 35%; text-align: left; }
            .receipt-preview .items-table .item-total{ width: 20%; text-align: right; }
            .receipt-preview .summary-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; padding: 0px 5px; }
            .receipt-preview .total-row{ display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 2px; }
            .receipt-preview .payment-row{ display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
            .receipt-preview .barcode{ text-align: center; margin: 10px 0; font-size: 10px; }
            .receipt-preview .footer{ text-align: center; margin-top: 5px; }
            .receipt-preview .thank-you{ font-weight: bold; font-size: 14px; margin-bottom: 3px; }
            .receipt-preview .footer-text{ font-size: 10px; color: #666; margin-bottom: 5px; }
            .receipt-preview .footer-bottom{ text-align: center; font-size: 10px; color: #666; }
            .receipt-preview .footer-bottom{ height: 15px; padding: 10px; }
            .receipt-preview .mini { font-size: 8px; }
            .receipt-preview .full { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="receipt-preview">
            ${receiptHTML}
          </div>
        </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  if (purchaseReportMode) {
    const grandTotal = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0)
    console.log('Purchase report data:', purchases.map(p => ({ 
      id: p.purchase_id, 
      unique_id: p.purchase_unique_id, 
      isreturned: p.isreturned, 
      type: typeof p.isreturned 
    })))
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px] w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-white">
          <DialogHeader className='sticky top-0 border-b px-6 '>
            <DialogTitle className="flex items-center gap-2">
              <div className=" bg-primary/10 rounded-lg">
                <IconReceipt className="h-5 w-5 text-primary" />
              </div>
              <span>Purchase Report</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto">
            <div ref={purchaseReportRef} className="border p-2 rounded-lg font-mono text-sm bg-gray-50/50 receipt-preview !text-black">
              <style>{receiptStyles}</style>
              <div className="sale-report-header">
                <div className="store-icon">🛒</div>
                <div className="store-name">TWC - Mart</div>
                <div className="store-details">
                  <div className="store-location">Faisalabad</div>
                  <div className="store-phone">+92 312 1234567</div>
                </div>
                <div className="bill-type">bill-type:purchase-report</div>
                <div className="sale-report-date">{formatDate(createdAt)}</div>
              </div>
              <div className="separator"></div>
              <table className="items-table">
                <thead>
                  <tr>
                    <th className="item-name">Purchase ID</th>
                    <th className="item-price">Supplier</th>
                    <th className="item-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, idx) => (
                    <tr key={p.purchase_unique_id || idx}>
                      <td className="item-name">{p.purchase_unique_id || p.purchase_billno }</td>
                      <td className="item-price">{p.supplier_name ? String(p.supplier_name).toUpperCase() : 'N/A'}</td>
                      {/* <td className="item-price">{(p.isreturned === 1) ? 'RETURN' : 'ACTIVE'}</td> */}
                      <td className="item-total">{formatAmount(p.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="separator"></div>
              <div className="total-row">
                <span>Grand Total</span>
                <span>{formatAmount(grandTotal)}</span>
              </div>
              <div className="footer">
            <p className="thank-you">your purchases!</p>
            <p className="footer-bottom">
              <span>POS powered by TWC - Mart</span>
            </p>
            <div className="footer-bottom height-10 p-2">
             <span>----------------------</span>
            </div>
          </div>
            </div>
            <div className="flex gap-3 ">
              <Button onClick={() => handlePurchaseReportPrint(purchases)} className="flex-1">
                <IconPrinter className="mr-2 h-4 w-4" />
                Print Report
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (saleReportMode) {
    const grandTotal = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0)
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[420px] w-[95vw] max-h-[90vh] overflow-y-auto p-0 bg-white">
          <DialogHeader className='sticky top-0 border-b px-6 '>
            <DialogTitle className="flex items-center gap-2">
              <div className=" bg-primary/10 rounded-lg">
                <IconReceipt className="h-5 w-5 text-primary" />
              </div>
              <span>Sale Report</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto">
            {/* Receipt Content */}
            <div ref={saleReportRef} className="border p-2 rounded-lg font-mono text-sm bg-gray-50/50 receipt-preview !text-black">
              <style>${receiptStyles}</style>
              {/* Header */}
              <div className="sale-report-header">
                <div className="store-icon">🛒</div>
                <div className="store-name">TWC - Mart</div>
                <div className="store-details">
                  <div className="store-location">Faisalabad</div>
                  <div className="store-phone">+92 312 1234567</div>
                </div>
                <div className="bill-type">bill-type:sale-report</div>
                <div className="sale-report-date">${formatDate(createdAt)}</div>
              </div>
              <div className="separator"></div>
              {/* Sale Report Table */}
              <table className="items-table">
                <thead>
                  <tr>
                    <th className="item-name">Bill ID</th>
                    <th className="item-price">Payment Method</th>
                    <th className="item-total">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b, idx) => (
                    <tr key={b.bill_unique_id || idx}>
                      <td className="item-name">{b.bill_unique_id}</td>
                      <td className="item-price">{b.payment_method ? b.payment_method.replace('_', ' ').toUpperCase() : 'N/A'}</td>
                      <td className="item-total">{formatAmount(b.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
            </table>
            <div className="separator"></div>
            {/* Grand Total */}
            <div className="total-row">
              <span>Grand Total</span>
              <span>{formatAmount(grandTotal)}</span>
            </div>
            <div className="footer">
            <p className="thank-you">your purchases!</p>
            <p className="footer-bottom">
              <span>POS powered by TWC - Mart</span>
            </p>
            <div className="footer-bottom height-10 p-2">
             <span>----------------------</span>
            </div>
          </div>
          </div>
            <div className="flex gap-3 ">
              <Button onClick={() => handleSaleReportPrint(bills)} className="flex-1">
                <IconPrinter className="mr-2 h-4 w-4" />
                Print Report
              </Button>
              <Button onClick={onClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[22rem]  h-[80vh]">
        <DialogHeader className='sticky top-0 border-b px-6'>
          <DialogTitle className="flex items-center gap-2">
            <div className=" bg-primary/10 rounded-lg">
              <IconReceipt className="h-5 w-5 text-primary" />
            </div>
            <span>Receipt 
              {/* - {transactionId} */}
              </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Receipt Type Toggle */}
          {/* <div className="flex gap-2 p-2 bg-muted/50 rounded-lg">
            <Button
              variant={receiptType === 'mini' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setReceiptType('mini')}
              className="flex-1"
            >
              Mini Receipt
            </Button>
            <Button
              variant={receiptType === 'full' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setReceiptType('full')}
              className="flex-1"
            >
              Full Receipt
            </Button>
          </div> */}

          {/* Receipt Content */}
          <div ref={receiptRef} className="border p-2 rounded-lg font-mono text-sm bg-gray-50/50 receipt-preview !text-black">
            <style>{receiptStyles}</style>
            
            {/* Header */}
            <div className="header">
              <div className="store-icon">🛒</div>
              <div className="store-name">TWC ----- Mart</div>
              <div className="store-details">
              <div className="store-location">Faisalabad</div>
              <div className="store-phone">+92 312 1234567</div>
              </div>
              <div className="bill-type">bill-type:{quotationMode ? 'quotation' : 'sale'}</div>
            </div>
            
            <div className="separator"></div>
            
            {/* Transaction Details */}
            <div className="transaction-details">
              <div className="transaction-details-left">
                <div className="bill-number">Bill {transactionId}</div>
                <div className="customer-name">{customerId}</div>
              </div>
              <div className="transaction-details-right">
                <div className="transaction-date">{formatDate(createdAt)}</div>
                <div className="cashier-name">Cashier: {user?.name || 'Cashier'}</div>
              </div>
            </div>
            
            <div className="separator"></div>
            
            {/* Items Table */}
            <table className="items-table">
              <thead>
                <tr>
                  <th className="item-name">Items</th>
                  <th className="item-price">Qty x U-Rs</th>
                  <th className="item-total">Sub Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: any) => (
                  <tr key={index}>
                    <td className="item-name">{item.product_name}</td>
                    <td className="item-price">
                      {item.quantity} × {formatAmount(item.unit_price ?? item.retail_price ?? 0)}
                    </td>
                    <td className="item-total">
                      {formatAmount((item.unit_price ?? item.retail_price ?? 0) * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="separator"></div>
            
            {/* Summary */}
            <div className="summary-row">
              <span>Total Items</span>
              <span>{items.reduce((acc: number, item: any) => acc + item.quantity, 0)}</span>
              <span>{formatAmount(subtotal)}</span>
            </div>
            {extraCharges > 0 && (
              <div className="summary-row">
                <span>Extra</span>
                <span>{formatAmount(extraCharges)}</span>
              </div>
            )}
            {total_tax > 0 && (
              <div className="summary-row">
                <span>Tax</span>
                <span>{formatAmount(total_tax)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="summary-row">
                <span>Discount</span>
                <span>-{formatAmount(discount)}</span>
              </div>
            )}
            
          
            
            {/* Grand Total */}
            <div className="total-row">
              <span>Grand Total</span>
              <span>{formatAmount(total)}</span>
            </div>
            
            <div className="separator"></div>
            
            {/* Payment Details */}
            <div className="payment-row">
              <span>Received</span>
              <span>{formatAmount(receivedAmount)}</span>
            </div>
            <div className="payment-row">
              <span>Change</span>
              <span>{formatAmount(change)}</span>
            </div>
            
            {/* Barcode */}
          <div className="barcode">
            |||||||||||||||||
          </div>
         
          <div className="footer">
            <p className="thank-you">Thank you for your purchase!</p>
            <p className="footer-text">Please visit us again!</p>
            <p className="footer-bottom">
              <span>POS powered by TWC - Mart</span>
            </p>
            <div className="footer-bottom height-10 p-2">
             <span>----------------------</span>
            </div>
          </div>
          </div>
      </div>
        <div className="flex gap-3 ">
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <IconDownload className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handlePrint} className="flex-1">
              <IconPrinter className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
            
          </div>
      </DialogContent>
    </Dialog>
  )
} 