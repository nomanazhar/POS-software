import { useState } from 'react'
import { BillLineItem } from '../data/schema'

interface ExpandableBillItemsProps {
  items: BillLineItem[]
}

export function ExpandableBillItems({ items }: ExpandableBillItemsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (items.length === 0) {
    return <span className="text-muted-foreground text-xs">No items</span>
  }

  const displayItems = isExpanded ? items : items.slice(0, 3)
  const hasMoreItems = items.length > 3

  return (
    <div className={`text-left space-y-1 w-[15vw] transition-all duration-200 ease-in-out ${
      isExpanded ? 'bg-muted/30 p-2 rounded-md border border-border/50' : ''
    }`}>
      <div className="transition-all duration-200 ease-in-out">
        {displayItems.map((item, index) => (
          <div key={index} className="text-sm">
            <div className="flex items-center gap-2">
              <div className="font-medium truncate">{item.product_name}</div>
            </div>
            {/* <div className="text-muted-foreground text-xs font-mono">
              ID: {item.product_unique_id}
            </div> */}
            <div className="text-muted-foreground text-xs">
              ${Number(item.retail_price).toFixed(2)} × {item.item_qty} = {Number(item.total_price).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      {hasMoreItems && (
        <div className="pt-1">
          {!isExpanded ? (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-primary hover:text-primary/80 text-xs font-medium cursor-pointer hover:underline transition-colors flex items-center gap-1 group"
              title={`Click to see all ${items.length} items`}
            >
              <span>+{items.length - 3} more items</span>
              <svg 
                className="w-3 h-3 transition-transform group-hover:translate-x-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-primary hover:text-primary/80 text-xs font-medium cursor-pointer hover:underline transition-colors flex items-center gap-1 group"
              title="Click to collapse items"
            >
              <span>Show less</span>
              <svg 
                className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
