"use client";

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Item } from '@/types';
import { Search } from 'lucide-react';

interface ItemCatalogProps {
  items: Item[];
  onAddItem: (item: Item) => void;
  disabled?: boolean;
}

export default function ItemCatalog({ items, onAddItem, disabled }: ItemCatalogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return items;
    }
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [items, searchTerm]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Item Catalog</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items by name or SKU..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full">
            <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => onAddItem(item)}
                    disabled={disabled || !item.isActive}
                    className="flex flex-col items-center justify-center p-2 text-center border rounded-lg aspect-square shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="text-sm font-medium leading-tight">{item.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">GHS {item.sellingPrice.toFixed(2)}</span>
                    {!item.isActive && <span className="text-xs text-destructive mt-1">(Inactive)</span>}
                </button>
            ))}
             {filteredItems.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    <p>No items match your search.</p>
                </div>
            )}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}