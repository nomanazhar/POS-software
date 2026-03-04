import { useProductContext } from '../context/product-context'
import { ProductsMutateDrawer } from './product-mutate-drawer'

export function ProductDialogs() {
  const { open, setOpen, currentProduct } = useProductContext()

  return (
    <>
      <ProductsMutateDrawer
        open={open === 'create'}
        onOpenChange={() => setOpen(null)}
        key='product-create'
      />
      {currentProduct && (
        <ProductsMutateDrawer
          open={open === 'update'}
          onOpenChange={() => setOpen(null)}
          currentProduct={currentProduct}
          key={`product-update-${currentProduct.product_id}`}
        />
      )}
      {currentProduct && (
        <ProductsMutateDrawer
          open={open === 'delete'}
          onOpenChange={() => setOpen(null)}
          currentProduct={currentProduct}
          key='product-delete'
          isDelete
        />
      )}
    </>
  )
}
