
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { InvoiceItem, Item as ProductItem } from "@/types"; // Renamed Item to ProductItem to avoid conflict
import { useEffect } from "react";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"; // Import the new Combobox

interface LineItemInputProps {
  item: InvoiceItem;
  index: number;
  availableItems: ProductItem[];
  onItemSelect: (index: number, itemId: string | null) => void;
  onChange: (index: number, field: keyof InvoiceItem, value: string | number) => void;
  onRemove: (index: number) => void;
  isReadOnly?: boolean;
}

export default function LineItemInput({ 
  item, 
  index, 
  availableItems,
  onItemSelect,
  onChange, 
  onRemove, 
  isReadOnly = false 
}: LineItemInputProps) {
  
  const handleNumericInputChange = (field: 'quantity' | 'unitPrice', value: string) => {
    const numValue = parseFloat(value);
    onChange(index, field, isNaN(numValue) ? 0 : numValue);
  };

  const comboboxOptions: ComboboxOption[] = availableItems.map(product => ({
    value: product.id,
    label: product.name,
  }));

  // Auto-calculate total when quantity or unitPrice changes via direct input
  useEffect(() => {
    if (!item.itemId) { // Only auto-calculate if not linked to a selected item, or allow override
        const newTotal = item.quantity * item.unitPrice;
        if (item.total !== newTotal) {
          onChange(index, "total", newTotal);
        }
    }
    // If item.itemId is set, total is calculated in InvoiceForm's handleItemSelect or when quantity changes
  }, [item.quantity, item.unitPrice, item.itemId, item.total, index, onChange]);


  return (
    <div className="grid grid-cols-12 gap-2 items-center mb-2 p-2 border rounded-md bg-secondary/30">
      <div className="col-span-12 md:col-span-5">
        <Combobox
          options={comboboxOptions}
          value={item.itemId}
          onChange={(selectedItemId) => onItemSelect(index, selectedItemId)}
          placeholder="Select or type item..."
          searchPlaceholder="Search items..."
          notFoundText="No item found."
          disabled={isReadOnly}
          className={isReadOnly ? "bg-muted" : ""}
        />
      </div>
      <div className="col-span-4 md:col-span-2">
        <Input
          type="number"
          placeholder="Qty"
          value={item.quantity === 0 && !isReadOnly ? "" : item.quantity.toString()}
          onChange={(e) => handleNumericInputChange("quantity", e.target.value)}
          min="0"
          step="any"
          readOnly={isReadOnly}
          aria-label={`Item ${index + 1} quantity`}
        />
      </div>
      <div className="col-span-4 md:col-span-2">
        <Input
          type="number"
          placeholder="Price"
          value={item.unitPrice === 0 && !isReadOnly ? "" : item.unitPrice.toString()}
          onChange={(e) => handleNumericInputChange("unitPrice", e.target.value)}
          min="0"
          step="0.01"
          readOnly={isReadOnly}
          aria-label={`Item ${index + 1} unit price`}
        />
      </div>
      <div className="col-span-4 md:col-span-2 flex items-center justify-end">
        <span className="font-medium text-sm md:text-base">GHS {item.total.toFixed(2)}</span>
      </div>
      {!isReadOnly && (
        <div className="col-span-12 md:col-span-1 flex justify-end md:justify-center">
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(index)} aria-label={`Remove item ${index + 1}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}
