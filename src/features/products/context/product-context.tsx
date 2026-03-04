import React, { useEffect, useState } from 'react'
import useDialogState from '@/hooks/use-dialog-state'
import { toast } from 'sonner'
import { useInventory } from '@/features/inventory/context/inventory-context';
// import { useAuthStore } from '@/stores/authStore';
import { Product, productSchema } from '../data/schema';

type ProductDialogType = 'create' | 'update' | 'delete' | 'import'

interface ProductContextType {
  products: Product[]
  loading: boolean
  error: string | null
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  addProduct: (product: Product) => Promise<void>
  updateProduct: (id: number, product: Product) => Promise<void>
  updateProductByBarcode: (barcode: string, patch: Partial<Product>) => Promise<void>
  deleteProduct: (id: number) => Promise<void>
  getProductById: (id: number) => Product | undefined
  open: ProductDialogType | null
  setOpen: (str: ProductDialogType | null) => void
  currentProduct: Product | null
  setCurrentProduct: React.Dispatch<React.SetStateAction<Product | null>>
  refresh: () => Promise<void>
}
interface Props {
  children: React.ReactNode
}
// Helper function to validate and transform database data
const validateProductData = (data: any[]): Product[] => {
  // console.log('Raw product data from database:', data);
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
        
        // Map database fields to schema fields and provide defaults
        const mappedItem = {
          product_id: Number(item.product_id || 0),
          product_unique_id: String(item.product_unique_id || ''),
          product_name: String(item.product_name || ''),
          barcode: String(item.barcode || ''),
          brand: String(item.brand || ''),
          category_unique_id: String(item.category_unique_id || ''),
          retail_price: Number(item.retail_price || 0),
          wholesale_price: Number(item.wholesale_price || 0),
          purchase_price: Number(item.purchase_price || 0),
          alertqty: Number(item.alertqty || 0),
          tax: Number(item.tax || 0),
          discount: Number(item.discount || 0),
          status: (item.status || 'active') as 'active' | 'inactive',
          returnable: Number(item.returnable || 0),
          added_by: String(item.added_by || 'admin'),
          company_id: String(item.company_id || '1'),
          branch_id: String(item.branch_id || '1'),
          created_at: String(item.created_at || new Date().toISOString()),
          updated_at: String(item.updated_at || new Date().toISOString()),
        };
        
        // console.log(`Mapped product item ${index}:`, mappedItem);
        
        // Validate the mapped item using the schema with safe parsing
        try {
          const validatedItem = productSchema.parse(mappedItem);
          // console.log(`Validated product item ${index}:`, validatedItem);
          return validatedItem;
        } catch (validationError) {
          console.error(`Schema validation failed for item at index ${index}:`, validationError);
          console.error('Mapped item that failed validation:', mappedItem);
          // Return a safe fallback item instead of null
          return {
            product_id: 0,
            product_unique_id: String(item.product_unique_id || `fallback_${index}`),
            product_name: String(item.product_name || 'Unknown Product'),
            barcode: String(item.barcode || ''),
            brand: String(item.brand || ''),
            category_unique_id: String(item.category_unique_id || ''),
            retail_price: 0,
            wholesale_price: 0,
            purchase_price: 0,
            alertqty: 0,
            tax: 0,
            discount: 0,
            status: 'active' as const,
            returnable: 0,
            added_by: 'admin',
            company_id: '1',
            branch_id: '1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Product;
        }
      } catch (error) {
        console.error(`Invalid product item at index ${index}:`, item, error);
        return null;
      }
    })
    .filter((item): item is Product => item !== null);
};

const ProductContext = React.createContext<ProductContextType | undefined>(undefined)

export default function ProductProvider({ children }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useDialogState<ProductDialogType>(null)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const { refresh: refreshInventory } = useInventory()
  // const user = useAuthStore((s) => s.auth.user);

  // Helper to fetch all products from Electron
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (window.electronAPI) {
        console.log('Fetching product data from Electron...');
        
        const data = await window.electronAPI.invoke('products:getAll');
        // console.log('Raw data received from Electron:', data);
        
        // Handle new backend response format
        let productsData;
        if (data && typeof data === 'object' && 'success' in data) {
          // New format with success/error wrapper
          if (data.success) {
            productsData = data.data;
            // console.log('Success response, products data:', productsData);
          } else {
            console.error('Error response from backend:', data.error);
            setError(data.error || 'Failed to fetch products');
            setProducts([]);
            return;
          }
        } else {
          // Legacy format - direct array
          productsData = data;
          // console.log('Legacy response format, products data:', productsData);
        }
        
        // Ensure we have an array
        if (!Array.isArray(productsData)) {
          console.error('Products data is not an array:', productsData);
          setError('Invalid data format received from server');
          setProducts([]);
          return;
        }
        
        console.log('Products data is array with length:', productsData.length);
        const validatedData = validateProductData(productsData);
        // console.log('Validated product data:', validatedData);
        console.log('Final products count:', validatedData.length);
        
        setProducts(validatedData);
      } else {
        console.warn('Electron API not available, using empty products');
        setError('Electron API not available');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Product) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      console.log('Adding product:', product);
      const result = await window.electronAPI.invoke('products:add', product);
      
      // Handle new backend response format
      if (result.success) {
        toast.success('Product added successfully');
        await fetchProducts();
        await refreshInventory();
      } else {
        toast.error(result.error || 'Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add product');
    }
  };

  const updateProduct = async (id: number, product: Product) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      console.log('Updating product:', { id, product });
      const result = await window.electronAPI.invoke('products:update', product);
      
      // Handle new backend response format
      if (result.success) {
        toast.success('Product updated successfully');
        await fetchProducts();
        await refreshInventory();
      } else {
        toast.error(result.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update product');
    }
  };

  const updateProductByBarcode = async (barcode: string, patch: Partial<Product>) => {
    try {
      const product = products.find(p => p.barcode === barcode);
      if (!product) {
        toast.error('Product not found');
        return;
      }

      const updatedProduct = { ...product, ...patch };
      await updateProduct(product.product_id, updatedProduct);
    } catch (error) {
      console.error('Error updating product by barcode:', error);
      toast.error('Failed to update product');
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      if (!window.electronAPI) {
        toast.error('Electron API not available');
        return;
      }

      console.log('Deleting product:', id);
      const result = await window.electronAPI.invoke('products:delete', id);
      
      // Handle new backend response format
      if (result.success) {
        toast.success('Product deleted successfully');
        await fetchProducts();
        await refreshInventory();
      } else {
        toast.error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete product');
    }
  };

  const getProductById = (id: number) => {
    return products.find(product => product.product_id === id);
  };

  const refresh = async () => {
    await fetchProducts();
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const value = {
    products,
    loading,
    error,
    setProducts,
    addProduct,
    updateProduct,
    updateProductByBarcode,
    deleteProduct,
    getProductById,
    open,
    setOpen,
    currentProduct,
    setCurrentProduct,
    refresh,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProductContext() {
  const context = React.useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProductContext must be used within a ProductProvider');
  }
  return context;
}
