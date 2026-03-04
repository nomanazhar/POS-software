import { ImportedProductData, ValidationResult } from './excel-service'
import { Product } from '../data/schema'
import { Category } from '@/features/categories/data/schema'
import { useAuthStore } from '@/stores/authStore'

export interface ImportProgress {
  stage: 'validating' | 'creating_categories' | 'importing_products' | 'completed' | 'error'
  message: string
  progress: number
  errors?: string[]
}

export interface ImportResult {
  success: boolean
  message: string
  importedCount: number
  categoryCount: number
  errors?: string[]
}

/**
 * Service to handle product import with category validation and creation
 */
export class ProductImportService {
  private onProgress?: (progress: ImportProgress) => void

  constructor(onProgress?: (progress: ImportProgress) => void) {
    this.onProgress = onProgress
  }

  /**
   * Gets current user info from auth store
   */
  private getCurrentUser() {
    return useAuthStore.getState().auth.user
  }

  /**
   * Imports products from validated Excel data
   */
  async importProducts(
    validationResult: ValidationResult
  ): Promise<ImportResult> {
    try {
      if (!validationResult.isValid) {
        return {
          success: false,
          message: 'Validation failed',
          importedCount: 0,
          categoryCount: 0,
          errors: validationResult.errors
        }
      }

      // Get current user info
      const user = this.getCurrentUser()
      const currentUserId = user?.id ? String(user.id) : user?.name || user?.email || 'admin'
      const companyId = user?.companyId || user?.company_id || '1'
      const branchId = user?.branchId || user?.branch_id || '1'

      this.updateProgress('validating', 'Validating data...', 10)

      // Step 1: Validate and create missing categories
      const categoryResult = await this.handleCategories(
        validationResult.missingCategories,
        currentUserId,
        companyId,
        branchId
      )

      if (!categoryResult.success) {
        return {
          success: false,
          message: 'Failed to create categories',
          importedCount: 0,
          categoryCount: 0,
          errors: categoryResult.errors
        }
      }

      this.updateProgress('importing_products', 'Importing products...', 60)

      // Step 2: Import products
      const productResult = await this.importProductsData(
        validationResult.data,
        currentUserId,
        companyId,
        branchId
      )

      this.updateProgress('completed', 'Import completed successfully!', 100)

      return {
        success: true,
        message: `Successfully imported ${productResult.importedCount} products and created ${categoryResult.categoryCount} categories`,
        importedCount: productResult.importedCount,
        categoryCount: categoryResult.categoryCount
      }

    } catch (error) {
      console.error('Error during import:', error)
      this.updateProgress('error', 'Import failed', 0, [error instanceof Error ? error.message : 'Unknown error'])
      
      return {
        success: false,
        message: 'Import failed',
        importedCount: 0,
        categoryCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Handles category validation and creation
   */
  private async handleCategories(
    categories: string[],
    currentUserId: string,
    companyId: string,
    branchId: string
  ): Promise<{ success: boolean; categoryCount: number; errors?: string[] }> {
    if (categories.length === 0) {
      return { success: true, categoryCount: 0 }
    }

    this.updateProgress('creating_categories', `Creating ${categories.length} categories...`, 30)

    try {
      const errors: string[] = []
      let createdCount = 0

      for (const categoryName of categories) {
        try {
          // Check if category already exists
          const existingCategory = await this.getCategoryByName(categoryName)
          
          if (!existingCategory) {
            // Create new category
            const newCategory = this.createCategoryData(
              categoryName,
              currentUserId,
              companyId,
              branchId
            )
            
            const result = await this.createCategory(newCategory)
            if (result.success) {
              createdCount++
            } else {
              errors.push(`Failed to create category "${categoryName}": ${result.error}`)
            }
          }
        } catch (error) {
          errors.push(`Error creating category "${categoryName}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: errors.length === 0,
        categoryCount: createdCount,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      return {
        success: false,
        categoryCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Imports product data
   */
  private async importProductsData(
    products: ImportedProductData[],
    currentUserId: string,
    companyId: string,
    branchId: string
  ): Promise<{ success: boolean; importedCount: number; errors?: string[] }> {
    try {
      const errors: string[] = []
      let importedCount = 0

      for (const productData of products) {
        try {
          // Get category unique ID
          const category = await this.getCategoryByName(productData.category)
          if (!category) {
            errors.push(`Category "${productData.category}" not found for product "${productData.productname}"`)
            continue
          }

          // Create product data
          const newProduct = this.createProductData(
            productData,
            category.category_unique_id!,
            currentUserId,
            companyId,
            branchId
          )

          // Import product
          const result = await this.createProduct(newProduct)
          if (result.success) {
            importedCount++
          } else {
            errors.push(`Failed to import product "${productData.productname}": ${result.error}`)
          }

        } catch (error) {
          errors.push(`Error importing product "${productData.productname}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      return {
        success: errors.length === 0,
        importedCount,
        errors: errors.length > 0 ? errors : undefined
      }

    } catch (error) {
      return {
        success: false,
        importedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Creates category data with default values
   */
  private createCategoryData(
    categoryName: string,
    currentUserId: string,
    companyId: string,
    branchId: string
  ): Omit<Category, 'category_id'> {
    const now = new Date().toISOString()
    const uniqueId = this.generateUniqueId(companyId, branchId)

    return {
      category_unique_id: uniqueId,
      category_name: categoryName,
      description: `Auto-created category for imported products`,
      status: 'active',
      icon: '📦', // Default icon
      added_by: currentUserId,
      company_id: companyId,
      branch_id: branchId,
      created_at: now,
      updated_at: now,
      products_count: 0
    }
  }

  /**
   * Creates product data from imported data
   */
  private createProductData(
    productData: ImportedProductData,
    categoryUniqueId: string,
    currentUserId: string,
    companyId: string,
    branchId: string
  ): Omit<Product, 'product_id' | 'created_at' | 'updated_at'> {
    const uniqueId = this.generateUniqueId(companyId, branchId)

    return {
      product_unique_id: uniqueId,
      product_name: productData.productname,
      barcode: productData.barcode || uniqueId, // Use unique ID as fallback barcode
      brand: productData.brand,
      category_unique_id: categoryUniqueId,
      retail_price: productData.retailprice,
      wholesale_price: productData.wholesaleprice,
      purchase_price: productData.purchaseprice,
      alertqty: productData.alerqty,
      tax: productData.tax,
      discount: productData.discount,
      status: 'active',
      returnable: 0, // Default to non-returnable
      added_by: currentUserId,
      company_id: companyId,
      branch_id: branchId
    }
  }

  /**
   * Generates a unique ID using the consistent pattern: companyId_branchId_timestamp
   */
  private generateUniqueId(companyId: string, branchId: string): string {
    return `${companyId}_${branchId}_${Date.now()}`
  }

  /**
   * Updates progress callback
   */
  private updateProgress(
    stage: ImportProgress['stage'],
    message: string,
    progress: number,
    errors?: string[]
  ): void {
    if (this.onProgress) {
      this.onProgress({ stage, message, progress, errors })
    }
  }

  // Database interaction methods (these would call the Electron API)

  /**
   * Gets category by name
   */
  private async getCategoryByName(categoryName: string): Promise<Category | null> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available')
      }

      const result = await window.electronAPI.invoke('categories:getByName', categoryName)
      
      if (result.success && result.data) {
        return result.data
      }
      
      return null
    } catch (error) {
      console.error('Error getting category by name:', error)
      return null
    }
  }

  /**
   * Creates a new category
   */
  private async createCategory(category: Omit<Category, 'category_id'>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }

      const result = await window.electronAPI.invoke('categories:add', category)
      return { success: result.success, error: result.error }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Creates a new product
   */
  private async createProduct(product: Omit<Product, 'product_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }

      const result = await window.electronAPI.invoke('products:add', product)
      return { success: result.success, error: result.error }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}
