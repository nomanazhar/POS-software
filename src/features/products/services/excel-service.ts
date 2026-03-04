import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// Product template headers that users fill when adding products
export const PRODUCT_TEMPLATE_HEADERS = [
  'barcode',
  'productname', 
  'category',
  'brand',
  'purchaseprice',
  'wholesaleprice',
  'retailprice',
  'tax',
  'discount',
  'alerqty'
] as const

export type ProductTemplateRow = {
  barcode: string
  productname: string
  category: string
  brand: string
  purchaseprice: number
  wholesaleprice: number
  retailprice: number
  tax: number
  discount: number
  alerqty: number
}

export interface ImportedProductData {
  barcode: string
  productname: string
  category: string
  brand: string
  purchaseprice: number
  wholesaleprice: number
  retailprice: number
  tax: number
  discount: number
  alerqty: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  data: ImportedProductData[]
  missingCategories: string[]
  duplicates: DuplicateProduct[]
}

export interface DuplicateProduct {
  barcode?: string
  category?: string
  brand?: string
  existingProduct: any
}


/**
 * Generates and downloads an Excel template for product import
 */
export function generateProductTemplate(): void {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new()
    
    // Create worksheet with headers
    const worksheet = XLSX.utils.aoa_to_sheet([
      [...PRODUCT_TEMPLATE_HEADERS],
      // Add example row with sample data
      [
        '0000000000000',
        'Sample Product',
        'sample category',
        'Sample Brand',
        0.00,
        0.00,
        0.00,
        0.00,
        0.00,
        0
      ]
    ])
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 20 }, // barcode
      { wch: 30 }, // productname
      { wch: 25 }, // category
      { wch: 20 }, // brand
      { wch: 15 }, // purchaseprice
      { wch: 15 }, // wholesaleprice
      { wch: 15 }, // retailprice
      { wch: 10 },  // tax
      { wch: 10 },  // discount
      { wch: 10 }   // alerqty
    ]
    worksheet['!cols'] = columnWidths
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template')
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const fileName = `products_template_${new Date().toISOString().split('T')[0]}.xlsx`
    saveAs(blob, fileName)
    
  } catch (error) {
    console.error('Error generating product template:', error)
    throw new Error('Failed to generate product template')
  }
}

/**
 * Reads and validates Excel file for product import
 */
export function readAndValidateExcelFile(file: File, existingProducts: any[] = [] ): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get the first worksheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length < 2) {
          resolve({
            isValid: false,
            errors: ['File must contain at least a header row and one data row'],
            data: [],
            missingCategories: [],
            duplicates: []
          })
          return
        }
        
        // Validate headers
        const headers = jsonData[0] as string[]
        const headerValidation = validateHeaders(headers)
        if (!headerValidation.isValid) {
          resolve({
            isValid: false,
            errors: headerValidation.errors,
            data: [],
            missingCategories: [],
            duplicates: []
          })
          return
        }
        
        // Process data rows
        const dataRows = jsonData.slice(1) as any[][]
        const validationResult = validateAndProcessData(dataRows, existingProducts)
        
        resolve(validationResult)
        
      } catch (error) {
        console.error('Error reading Excel file:', error)
        reject(new Error('Failed to read Excel file'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Validates that all required headers are present
 */
function validateHeaders(headers: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())
  
  for (const requiredHeader of PRODUCT_TEMPLATE_HEADERS) {
    if (!normalizedHeaders.includes(requiredHeader.toLowerCase())) {
      errors.push(`Missing required column: ${requiredHeader}`)
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates and processes data rows
 */
function validateAndProcessData(dataRows: any[][] , existingProducts: any[] = []): ValidationResult {
  const errors: string[] = []
  const validData: ImportedProductData[] = []
  const missingCategories = new Set<string>()
  const duplicates: DuplicateProduct[] = []
  dataRows.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because we start from row 2 (after header)
    
    try {
      // Skip empty rows
      if (row.every(cell => !cell || cell.toString().trim() === '')) {
        return
      }
      
      // Map row data to object
      const rowData: any = {}
      PRODUCT_TEMPLATE_HEADERS.forEach((header, colIndex) => {
        rowData[header] = row[colIndex]
      })
      
      // Validate required fields
      const rowErrors = validateRowData(rowData, rowNumber)
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
        return
      }
      
      // Convert and validate data types
      const processedData: ImportedProductData = {
        barcode: String(rowData.barcode || '').trim(),
        productname: String(rowData.productname || '').trim(),
        category: String(rowData.category || '').trim(),
        brand: String(rowData.brand || '').trim(),
        purchaseprice: parseFloat(rowData.purchaseprice) || 0,
        wholesaleprice: parseFloat(rowData.wholesaleprice) || 0,
        retailprice: parseFloat(rowData.retailprice) || 0,
        tax: parseFloat(rowData.tax) || 0,
        discount: parseFloat(rowData.discount) || 0,
        alerqty: parseInt(rowData.alerqty) || 0
      }
      
      // Additional validations
      if (processedData.purchaseprice < 0) {
        errors.push(`Row ${rowNumber}: Purchase price cannot be negative`)
        return
      }
      
      if (processedData.wholesaleprice < 0) {
        errors.push(`Row ${rowNumber}: Wholesale price cannot be negative`)
        return
      }
      
      if (processedData.retailprice < 0) {
        errors.push(`Row ${rowNumber}: Retail price cannot be negative`)
        return
      }
      
      if (processedData.tax < 0) {
        errors.push(`Row ${rowNumber}: Tax cannot be negative`)
        return
      }
      
      if (processedData.discount < 0) {
        errors.push(`Row ${rowNumber}: Discount cannot be negative`)
        return
      }
      
      if (processedData.alerqty < 0) {
        errors.push(`Row ${rowNumber}: Alert quantity cannot be negative`)
        return
      }
      
      // Track category for later validation
      if (processedData.category) {
        missingCategories.add(processedData.category)
      }

      // Check for duplicates against existing products
      const duplicateCheck = checkForDuplicates(processedData, existingProducts)
      if (duplicateCheck.length > 0) {
        duplicates.push(...duplicateCheck)
        errors.push(`Row ${rowNumber}: Product already exists with similar barcode, category, or brand`)
        return // Skip this product - don't add it to validData
      }
      
      validData.push(processedData)
      
    } catch (error) {
      errors.push(`Row ${rowNumber}: Invalid data format`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    data: validData,
    missingCategories: Array.from(missingCategories),
    duplicates: duplicates
  }
}

/**
 * Checks if a product already exists in the database
 */
function checkForDuplicates(
  productData: ImportedProductData, 
  existingProducts: any[]
): DuplicateProduct[] {
  const duplicates: DuplicateProduct[] = []
  
  // Loop through all existing products
  existingProducts.forEach(existingProduct => {
    // Check if barcode matches
    if (productData.barcode && existingProduct.barcode === productData.barcode) {
      duplicates.push({
        barcode: productData.barcode,
        existingProduct: existingProduct
      })
    }
    
    // Check if category matches
    if (productData.category && existingProduct.category === productData.category) {
      duplicates.push({
        category: productData.category,
        existingProduct: existingProduct
      })
    }
    
    // Check if brand matches
    if (productData.brand && existingProduct.brand === productData.brand) {
      duplicates.push({
        brand: productData.brand,
        existingProduct: existingProduct
      })
    }
  })
  
  return duplicates
}

/**
 * Validates individual row data
 */
function validateRowData(rowData: any, rowNumber: number): string[] {
  const errors: string[] = []
  
  // Check required fields
  if (!rowData.productname || String(rowData.productname).trim() === '') {
    errors.push(`Row ${rowNumber}: Product name is required`)
  }
  
  if (!rowData.category || String(rowData.category).trim() === '') {
    errors.push(`Row ${rowNumber}: Category is required`)
  }
  
  if (!rowData.brand || String(rowData.brand).trim() === '') {
    errors.push(`Row ${rowNumber}: Brand is required`)
  }
  
  // Validate numeric fields
  const numericFields = ['purchaseprice', 'wholesaleprice', 'retailprice', 'tax', 'discount', 'alerqty']
  numericFields.forEach(field => {
    const value = rowData[field]
    if (value !== null && value !== undefined && value !== '') {
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        errors.push(`Row ${rowNumber}: ${field} must be a valid number`)
      }
    }
  })
  
  return errors
}
