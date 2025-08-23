import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List, VariableSizeList, ListChildComponentProps } from 'react-window';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  width?: number;
  itemSize: number | ((index: number) => number);
  renderItem: (props: { item: T; index: number; style: React.CSSProperties }) => React.ReactNode;
  className?: string;
  overscan?: number;
  onItemsRendered?: (props: { visibleStartIndex: number; visibleStopIndex: number }) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  variable?: boolean;
}

// Phase 3: Virtual List Component for Large Datasets
export function VirtualList<T>({
  items,
  height,
  width = 300,
  itemSize,
  renderItem,
  className,
  overscan = 5,
  onItemsRendered,
  loading = false,
  loadingComponent,
  emptyComponent,
  variable = false,
}: VirtualListProps<T>) {
  const [listRef, setListRef] = useState<List | VariableSizeList | null>(null);

  const ItemRenderer = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const item = items[index];
      if (!item) return null;

      return (
        <div style={style}>
          {renderItem({ item, index, style })}
        </div>
      );
    },
    [items, renderItem]
  );

  const handleItemsRendered = useCallback(
    (props: any) => {
      onItemsRendered?.(props);
    },
    [onItemsRendered]
  );

  // Memoize the list component to prevent unnecessary re-renders
  const ListComponent = useMemo(() => {
    if (variable && typeof itemSize === 'function') {
      return (
        <VariableSizeList
          ref={setListRef}
          height={height}
          width={width}
          itemCount={items.length}
          itemSize={itemSize}
          overscanCount={overscan}
          onItemsRendered={handleItemsRendered}
          className={cn('scrollbar-thin scrollbar-thumb-muted scrollbar-track-background', className)}
        >
          {ItemRenderer}
        </VariableSizeList>
      );
    }

    return (
      <List
        ref={setListRef}
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={typeof itemSize === 'function' ? 100 : itemSize}
        overscanCount={overscan}
        onItemsRendered={handleItemsRendered}
        className={cn('scrollbar-thin scrollbar-thumb-muted scrollbar-track-background', className)}
      >
        {ItemRenderer}
      </List>
    );
  }, [
    variable,
    itemSize,
    height,
    items.length,
    overscan,
    handleItemsRendered,
    className,
    ItemRenderer
  ]);

  // Scroll to item programmatically
  const scrollToItem = useCallback(
    (index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start') => {
      if (listRef) {
        listRef.scrollToItem(index, align);
      }
    },
    [listRef]
  );

  // Expose scroll methods
  useEffect(() => {
    if (listRef && typeof window !== 'undefined') {
      (window as any).virtualListRef = {
        scrollToItem,
        scrollToTop: () => scrollToItem(0, 'start'),
        scrollToBottom: () => scrollToItem(items.length - 1, 'end'),
      };
    }
  }, [listRef, scrollToItem, items.length]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {loadingComponent || (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-center', className)} style={{ height }}>
        {emptyComponent || (
          <div className="text-muted-foreground">
            <div className="text-4xl mb-2">📋</div>
            <div>No items to display</div>
          </div>
        )}
      </div>
    );
  }

  return ListComponent;
}

// Hook for virtual list with pagination
export function useVirtualPagination<T>({
  items,
  pageSize = 50,
  threshold = 10,
}: {
  items: T[];
  pageSize?: number;
  threshold?: number;
}) {
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const endIndex = currentPage * pageSize;
    setVisibleItems(items.slice(0, endIndex));
  }, [items, currentPage, pageSize]);

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      const totalVisible = visibleItems.length;
      const remaining = items.length - totalVisible;
      
      if (remaining > 0 && visibleStopIndex >= totalVisible - threshold) {
        setCurrentPage(prev => prev + 1);
      }
    },
    [visibleItems.length, items.length, threshold]
  );

  return {
    visibleItems,
    handleItemsRendered,
    hasMore: visibleItems.length < items.length,
    reset: () => {
      setCurrentPage(1);
      setVisibleItems(items.slice(0, pageSize));
    },
  };
}