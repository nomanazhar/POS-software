import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Category } from '../data/schema'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
}

export function CategoryViewDialog({ open, onOpenChange, category }: Props) {
  if (!category) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
          <DialogDescription>
            View the details of the selected category.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{category.category_name}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
                {category.status}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Unique ID:</span>
              <span className="text-sm">{category.category_unique_id}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Added By:</span>
              <span className="text-sm">{category.added_by}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Company ID:</span>
              <span className="text-sm">{category.company_id}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Branch ID:</span>
              <span className="text-sm">{category.branch_id}</span>
            </div>
            
            {category.icon && (
              <div className="flex justify-between">
                <span className="font-medium">Icon:</span>
                <span className="text-sm">{category.icon}</span>
              </div>
            )}
            
            {category.created_at && (
              <div className="flex justify-between">
                <span className="font-medium">Created:</span>
                <span className="text-sm">{new Date(category.created_at).toLocaleString()}</span>
              </div>
            )}
            
            {category.updated_at && (
              <div className="flex justify-between">
                <span className="font-medium">Updated:</span>
                <span className="text-sm">{new Date(category.updated_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 