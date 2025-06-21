"use client";

import { useMemo } from 'react';
import type { CashSaleItem, TaxSettings, Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface CartTicketProps {
  cartItems: CashSaleItem[];
  taxSettings: TaxSettings;
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onFinalizeSale: () => void;
  isSaving: boolean;
}

const NO_CUSTOMER_ID = "__NO_CUSTOMER__";

export default function CartTicket({
  cartItems,
  taxSettings,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onUpdateQuantity,
  onRemoveItem,
  onFinalizeSale,
  isSaving,
}: CartTicketProps) {
  
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total, 0);
  }, [cartItems]);

  const taxAmounts = useMemo(() => {
    const vatAmount = subtotal * taxSettings.vat;
    const nhilAmount = subtotal * taxSettings.nhil;
    const getFundAmount = subtotal * taxSettings.getFund;
    const totalTax = vatAmount + nhilAmount + getFundAmount;
    return { vatAmount, nhilAmount, getFundAmount, totalTax };
  }, [subtotal, taxSettings]);

  const totalAmount = subtotal + taxAmounts.totalTax;

  const selectedCustomerName = useMemo(() => {
      if (!selectedCustomerId || selectedCustomerId === NO_CUSTOMER_ID) return "Walk-in Customer";
      return customers.find(c => c.id === selectedCustomerId)?.name || "Walk-in Customer";
  }, [selectedCustomerId, customers]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Current Sale</CardTitle>
        <Select
          value={selectedCustomerId || NO_CUSTOMER_ID}
          onValueChange={onSelectCustomer}
          disabled={isSaving}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CUSTOMER_ID}>Walk-in Customer</SelectItem>
            {customers.map(customer => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-y-auto">
        <ScrollArea className="h-full">
            <div className="px-6 space-y-3">
          {cartItems.length > 0 ? cartItems.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="flex-grow">
                <p className="font-medium">{item.description}</p>
                <p className="text-sm text-muted-foreground">GHS {item.unitPrice.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 border rounded-md">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={isSaving}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-medium">{item.quantity}</span>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} disabled={isSaving}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="font-semibold w-20 text-right">GHS {item.total.toFixed(2)}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemoveItem(item.id)} disabled={isSaving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )) : (
            <div className="text-center text-muted-foreground py-16">
              <p>Add items from the catalog to start a sale.</p>
            </div>
          )}
          </div>
        </ScrollArea>
      </CardContent>
      {cartItems.length > 0 && (
        <CardFooter className="flex-col items-stretch space-y-4 pt-4 border-t">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>GHS {subtotal.toFixed(2)}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes</span>
              <span>GHS {taxAmounts.totalTax.toFixed(2)}</span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>GHS {totalAmount.toFixed(2)}</span>
          </div>
          <Button size="lg" className="w-full h-12 text-lg" onClick={onFinalizeSale} disabled={isSaving}>
            {isSaving ? "Processing..." : "Charge"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}