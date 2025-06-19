"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { InvoiceItem } from "@/types";
import { useEffect } from "react";

interface LineItemInputProps {
  item: InvoiceItem;
  index: number;
  onChange: (index: number, field: keyof InvoiceItem, value: string | number) => void;
  onRemove: (index: number) => void;
  isReadOnly?: boolean;
}

export default function LineItemInput({ item, index, onChange, onRemove, isReadOnly = false }: LineItemInputProps) {
  
  const handleInputChange = (field: keyof InvoiceItem, value: string) => {
    if (field === "quantity" || field === "unitPrice") {
      const numValue = parseFloat(value);
      onChange(index, field, isNaN(numValue) ? 0 : numValue);
    } else {
      onChange(index, field, value);
    }
  };

  // Auto-calculate total when quantity or unitPrice changes
  useEffect(() => {
    const newTotal = item.quantity * item.unitPrice;
    if (item.total !== newTotal) {
      onChange(index, "total", newTotal);
    }
  }, [item.quantity, item.unitPrice, item.total, index, onChange]);


  return (
    <div className="grid grid-cols-12 gap-2 items-center mb-2 p-2 border rounded-md bg-secondary/30">
      <div className="col-span-12 md:col-span-5">
        <Input
          type="text"
          placeholder="Item description"
          value={item.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          readOnly={isReadOnly}
          aria-label={`Item ${index + 1} description`}
        />
      </div>
      <div className="col-span-4 md:col-span-2">
        <Input
          type="number"
          placeholder="Qty"
          value={item.quantity === 0 && !isReadOnly ? "" : item.quantity.toString()} // Show empty for 0 when editable
          onChange={(e) => handleInputChange("quantity", e.target.value)}
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
          onChange={(e) => handleInputChange("unitPrice", e.target.value)}
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
