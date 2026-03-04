export type QuotationItem = {
  product_unique_id: string
  product_name: string
  quantity: number
  retail_price: number
  wholesale_price: number
  total_price: number
  discount: number
  tax: number
}

export type Quotation = {
  quotation_id?: number
  quotation_unique_id: string
  quotationno: string
  account_unique_id: string
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  item_count: number
  sale_type: string
  quotation_items: QuotationItem[]
  added_by: string
  company_id: string
  branch_id: string
  created_at?: string
  updated_at?: string
}


