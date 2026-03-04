import { Product } from "@/features/products/data/schema"

export async function getBrands(products: Product[]) {
  // Group products by brand and count them
  const brandMap = new Map<string, number>()
  
  products.forEach(product => {
    const brand = product.brand || 'Uncategorized'
    brandMap.set(brand, (brandMap.get(brand) || 0) + 1)
  })

  // Convert to array of { brand, count } and sort by count (descending)
  const brands = Array.from(brandMap.entries())
    .map(([brand, count]) => ({
      brand,
      count
    }))
    .sort((a, b) => b.count - a.count)

  return { brands }
}
