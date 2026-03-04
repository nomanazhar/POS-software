import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useProductContext } from "@/features/products/context/product-context"
import { getBrands } from "../api/get-brands"

interface BrandItem {
  brand: string
  count: number
}

export function BrandList() {
  const { products } = useProductContext()
  const [searchTerm, setSearchTerm] = useState("")
  const [brands, setBrands] = useState<BrandItem[]>([])
  const [filteredBrands, setFilteredBrands] = useState<BrandItem[]>([])

  useEffect(() => {
    const loadBrands = async () => {
      const { brands } = await getBrands(products)
      setBrands(brands)
      setFilteredBrands(brands)
    }
    loadBrands()
  }, [products])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredBrands(brands)
    } else {
      const filtered = brands.filter(brand => 
        brand.brand.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredBrands(filtered)
    }
  }, [searchTerm, brands])

  return (
    <div className="space-y-4 ">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 ">
            
              <Input
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[60%]"
              />
          
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[70%] font-semibold">Brand Name</TableHead>
                <TableHead className="w-[30%] text-right font-semibold">Product Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.length > 0 ? (
                filteredBrands.map((item, index) => (
                  <TableRow 
                    key={item.brand}
                    className={index % 2 === 0 ? 'bg-background' : 'bg-muted/5 hover:bg-muted/10'}
                  >
                    <TableCell className="font-medium py-3">{item.brand || 'Unbranded'}</TableCell>
                    <TableCell className="text-right py-3">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {item.count} {item.count === 1 ? 'product' : 'products'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                    No brands found matching "{searchTerm}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
