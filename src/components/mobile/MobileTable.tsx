import React from 'react'
import { cn } from '@/lib/utils'
import { useEnhancedMobileDetection } from '@/hooks/useEnhancedMobileDetection'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface Column {
  key: string
  label: string
  width?: number
  render?: (value: any, row: any) => React.ReactNode
  sortable?: boolean
  sticky?: boolean
}

interface MobileTableProps<T = any> {
  data: T[]
  columns: Column[]
  className?: string
  stickyHeader?: boolean
  cardView?: boolean
  expandableRows?: boolean
  keyExtractor?: (item: T, index: number) => string
  onRowPress?: (item: T, index: number) => void
  emptyState?: React.ReactNode
}

export function MobileTable<T = any>({
  data,
  columns,
  className,
  stickyHeader = true,
  cardView,
  expandableRows = false,
  keyExtractor = (_, index) => index.toString(),
  onRowPress,
  emptyState,
}: MobileTableProps<T>) {
  const { isMobile, isTablet } = useEnhancedMobileDetection()
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())
  
  // Auto-switch to card view on mobile
  const useCardView = cardView ?? isMobile
  
  const toggleRowExpansion = React.useCallback((key: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  // Get primary columns (first 2-3 for mobile)
  const primaryColumns = React.useMemo(() => {
    return columns.slice(0, isMobile ? 2 : 3)
  }, [columns, isMobile])

  // Get secondary columns (remaining for expandable content)
  const secondaryColumns = React.useMemo(() => {
    return columns.slice(isMobile ? 2 : 3)
  }, [columns, isMobile])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-center">
        {emptyState || (
          <div className="text-muted-foreground">
            <div className="text-lg font-medium mb-1">No data available</div>
            <div className="text-sm">There are no items to display</div>
          </div>
        )}
      </div>
    )
  }

  if (useCardView) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item, index) => {
          const key = keyExtractor(item, index)
          const isExpanded = expandedRows.has(key)
          const hasSecondaryContent = secondaryColumns.length > 0
          
          return (
            <Card
              key={key}
              className={cn(
                "transition-all duration-200",
                onRowPress && "cursor-pointer hover:shadow-md active:scale-[0.98]"
              )}
              onClick={() => onRowPress?.(item, index)}
            >
              <CardContent className="p-4">
                {/* Primary content */}
                <div className="space-y-2">
                  {primaryColumns.map((column) => {
                    const value = item[column.key]
                    const displayValue = column.render ? column.render(value, item) : value
                    
                    return (
                      <div key={column.key} className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground font-medium min-w-0 flex-1">
                          {column.label}:
                        </span>
                        <div className="text-sm ml-2 min-w-0 flex-1 text-right">
                          {displayValue}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Expandable content */}
                {hasSecondaryContent && expandableRows && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 p-2 h-auto justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRowExpansion(key)
                      }}
                    >
                      <span className="text-xs mr-1">
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        {secondaryColumns.map((column) => {
                          const value = item[column.key]
                          const displayValue = column.render ? column.render(value, item) : value
                          
                          return (
                            <div key={column.key} className="flex justify-between items-start">
                              <span className="text-sm text-muted-foreground font-medium min-w-0 flex-1">
                                {column.label}:
                              </span>
                              <div className="text-sm ml-2 min-w-0 flex-1 text-right">
                                {displayValue}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Traditional table view for desktop and tablet
  return (
    <div className={cn(
      "overflow-auto rounded-lg border border-border",
      className
    )}>
      <table className="w-full min-w-full">
        <thead className={cn(
          "bg-muted/50",
          stickyHeader && "sticky top-0 z-10"
        )}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                  column.sticky && "sticky left-0 bg-muted/50",
                  isTablet && "px-3 py-2"
                )}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            {expandableRows && <th className="w-10"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {data.map((item, index) => {
            const key = keyExtractor(item, index)
            const isExpanded = expandedRows.has(key)
            
            return (
              <React.Fragment key={key}>
                <tr
                  className={cn(
                    "transition-colors",
                    onRowPress && "cursor-pointer hover:bg-muted/30 active:bg-muted/50"
                  )}
                  onClick={() => onRowPress?.(item, index)}
                >
                  {columns.map((column) => {
                    const value = item[column.key]
                    const displayValue = column.render ? column.render(value, item) : value
                    
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-3 text-sm text-foreground",
                          column.sticky && "sticky left-0 bg-background",
                          isTablet && "px-3 py-2"
                        )}
                      >
                        {displayValue}
                      </td>
                    )
                  })}
                  {expandableRows && (
                    <td className="px-2 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRowExpansion(key)
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
                
                {/* Expanded content for table view */}
                {expandableRows && isExpanded && (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-3 bg-muted/20">
                      <div className="text-sm space-y-1">
                        {/* Additional expandable content can be rendered here */}
                        <div className="text-muted-foreground">Additional details:</div>
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}