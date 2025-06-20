
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, SubmitHandler, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, CalendarIcon, Save, DollarSign } from "lucide-react";
import LineItemInput from "@/components/invoices/LineItemInput"; // Reusing for consistency
import type { DirectSale, DirectSaleItem, Customer, TaxSettings, Item as ProductItem, PaymentMethod } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { paymentMethods } from "@/types"; // Now correctly imports the exported constant

const directSaleItemSchema = z.object({
  id: z.string().default(() => Date.now().toString() + Math.random().toString(36).substring(2, 7)),
  itemId: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  total: z.number(),
});

const directSaleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(), // For manually entered names if no customer selected
  date: z.date({ required_error: "Sale date is required." }),
  items: z.array(directSaleItemSchema).min(1, "At least one item is required"),
  paymentMethod: z.enum(paymentMethods, { required_error: "Payment method is required" }),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

export type DirectSaleFormInputs = z.infer<typeof directSaleSchema>;

interface DirectSaleFormProps {
  sale?: DirectSale; 
  customers: Customer[];
  taxSettings: TaxSettings;
  availableItems: ProductItem[];
  onSave: (data: Omit<DirectSale, "id" | "createdAt" | "businessId" | "recordedBy" | "saleNumber">, formData: DirectSaleFormInputs) => Promise<void>;
  isSaving?: boolean;
  formMode?: "create" | "edit";
  initialSaleNumber?: string;
}

export default function DirectSaleForm({
  sale,
  customers,
  taxSettings,
  availableItems,
  onSave,
  isSaving,
  formMode = "create",
  initialSaleNumber,
}: DirectSaleFormProps) {
  const [saleNumber, setSaleNumber] = useState(initialSaleNumber || "");
  const { toast } = useToast();

  const defaultValues = useMemo(() => {
    return {
      customerId: sale?.customerId || "",
      customerName: sale?.customerName || "",
      date: sale ? new Date(sale.date) : new Date(),
      items: sale?.items.map(item => ({...item})) || [{ description: "", quantity: 1, unitPrice: 0, total: 0, id: Date.now().toString(), itemId: undefined }],
      paymentMethod: sale?.paymentMethod || undefined,
      paymentReference: sale?.paymentReference || "",
      notes: sale?.notes || "",
    };
  }, [sale]);

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<DirectSaleFormInputs>({
    resolver: zodResolver(directSaleSchema),
    defaultValues,
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedCustomerId = watch("customerId");

  useEffect(() => {
    if (formMode === "create" && !saleNumber && initialSaleNumber) {
      setSaleNumber(initialSaleNumber);
    } else if (sale?.saleNumber) {
      setSaleNumber(sale.saleNumber);
    }
  }, [sale, saleNumber, formMode, initialSaleNumber]);

  useEffect(() => {
    if (watchedCustomerId) {
      const customer = customers.find(c => c.id === watchedCustomerId);
      if (customer) {
        setValue("customerName", customer.name); // Autofill customer name if selected
      }
    }
  }, [watchedCustomerId, customers, setValue]);


  const subtotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [watchedItems]);

  const taxAmounts = useMemo(() => {
    const vatAmount = subtotal * taxSettings.vat;
    const nhilAmount = subtotal * taxSettings.nhil;
    const getFundAmount = subtotal * taxSettings.getFund;
    const totalTax = vatAmount + nhilAmount + getFundAmount;
    return { vatAmount, nhilAmount, getFundAmount, totalTax };
  }, [subtotal, taxSettings]);

  const totalAmount = subtotal + taxAmounts.totalTax;

  const handleAddItem = () => {
    append({ description: "", quantity: 1, unitPrice: 0, total: 0, id: Date.now().toString() + Math.random().toString(36).substring(2,7), itemId: undefined });
  };

  const handleItemChange = (index: number, field: keyof DirectSaleItem, value: string | number) => {
    const currentItem = getValues(`items.${index}`);
    const newItemData = { ...currentItem, [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : currentItem.quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : currentItem.unitPrice;
      newItemData.total = quantity * unitPrice;
    }
    update(index, newItemData as any);
  };
  
  const handleItemSelect = (index: number, selectedItemId: string | null) => {
    const currentItem = getValues(`items.${index}`);
    if (selectedItemId) {
      const selectedFullItem = availableItems.find(item => item.id === selectedItemId);
      if (selectedFullItem) {
        update(index, {
          ...currentItem,
          itemId: selectedFullItem.id,
          description: selectedFullItem.name,
          unitPrice: selectedFullItem.sellingPrice,
          total: currentItem.quantity * selectedFullItem.sellingPrice,
        });
      }
    } else {
      update(index, { ...currentItem, itemId: undefined, description: "" });
    }
  };

  const processSubmit: SubmitHandler<DirectSaleFormInputs> = (data) => {
    let finalCustomerName = data.customerName;
    if (data.customerId) {
        const selectedCustomer = customers.find(c => c.id === data.customerId);
        if (selectedCustomer) finalCustomerName = selectedCustomer.name;
    }

    const finalSaleData: Omit<DirectSale, "id" | "createdAt" | "businessId" | "recordedBy" | "saleNumber"> = {
      customerId: data.customerId,
      customerName: finalCustomerName,
      items: data.items.map(item => ({ 
        id: item.id, 
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: subtotal,
      taxDetails: {
        vatRate: taxSettings.vat,
        nhilRate: taxSettings.nhil,
        getFundRate: taxSettings.getFund,
        ...taxAmounts,
      },
      totalAmount: totalAmount,
      paymentMethod: data.paymentMethod,
      paymentReference: data.paymentReference,
      date: data.date,
      notes: data.notes,
    };
    onSave(finalSaleData, data);
  };
  
  const isReadOnly = formMode === "edit" && !!sale; // Simplified: make all fields read-only in edit mode for now

  return (
    <form onSubmit={handleSubmit(processSubmit)}>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="font-headline text-2xl md:text-3xl">{formMode === "edit" ? "Edit Direct Sale" : "Record New Direct Sale"}</CardTitle>
              {saleNumber && <p className="text-muted-foreground">Sale #: {saleNumber}</p>}
            </div>
          </div>
           {isReadOnly && <p className="text-sm text-destructive mt-2">Editing items and amounts for completed sales is restricted. Only notes and payment reference can be updated.</p>}
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Customer and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer (Optional)</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                    <SelectTrigger id="customerId" aria-invalid={errors.customerId ? "true" : "false"}>
                      <SelectValue placeholder="Select a customer or leave blank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- No Customer --</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerId && <p className="text-sm text-destructive">{errors.customerId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">Or Enter Customer Name</Label>
              <Input 
                id="customerName" 
                {...register("customerName")} 
                placeholder="Walk-in Customer"
                disabled={isReadOnly || !!watchedCustomerId} // Disable if a customer is selected from dropdown
                className={(isReadOnly || !!watchedCustomerId) ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date of Sale</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.date && "border-destructive")}
                        aria-invalid={errors.date ? "true" : "false"}
                        disabled={isReadOnly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={isReadOnly} />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label className="text-lg font-medium">Items Sold</Label>
            {fields.map((field, index) => (
              <LineItemInput
                key={field.id} 
                item={watchedItems[index]} 
                index={index}
                availableItems={availableItems}
                onItemSelect={handleItemSelect} 
                onChange={handleItemChange} 
                onRemove={() => remove(index)}
                isReadOnly={isReadOnly}
              />
            ))}
            {errors.items && typeof errors.items === 'object' && !Array.isArray(errors.items) && (
              <p className="text-sm text-destructive">{(errors.items as any).message || "Please add at least one item."}</p>
            )}
            {!isReadOnly && (
                <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            )}
          </div>

          {/* Payment Details */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium font-headline">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Controller
                        name="paymentMethod"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                            <SelectTrigger id="paymentMethod" aria-invalid={!!errors.paymentMethod}>
                            <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                            {paymentMethods.map(method => (
                                <SelectItem key={method} value={method}>{method}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.paymentMethod && <p className="text-sm text-destructive mt-1">{errors.paymentMethod.message}</p>}
                </div>
                 <div>
                    <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
                    <Input 
                        id="paymentReference" 
                        {...register("paymentReference")} 
                        placeholder="e.g., Transaction ID, Momo Name" 
                        disabled={formMode === "edit" && sale?.paymentReference ? true : false} // Only notes editable in edit mode
                    />
                </div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-lg font-medium">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional information about the sale..."
              {...register("notes")}
              rows={3}
              disabled={formMode === 'edit' && !isReadOnly ? false : isReadOnly} // Notes editable
            />
          </div>

          {/* Totals Summary */}
          <div className="space-y-4 rounded-lg border bg-card p-6 shadow">
            <h3 className="text-xl font-semibold font-headline text-center md:text-left">Sale Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">GHS {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT ({ (taxSettings.vat * 100).toFixed(1) }%):</span>
                <span className="font-medium">GHS {taxAmounts.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">NHIL ({ (taxSettings.nhilRate * 100).toFixed(1) }%):</span>
                <span className="font-medium">GHS {taxAmounts.nhilAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GETFund ({ (taxSettings.getFundRate * 100).toFixed(1) }%):</span>
                <span className="font-medium">GHS {taxAmounts.getFundAmount.toFixed(2)}</span>
              </div>
              <hr className="my-2 border-border" />
              <div className="flex justify-between text-xl">
                <span className="font-semibold text-primary">Total Amount:</span>
                <span className="font-bold text-primary">GHS {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row justify-end gap-3 border-t pt-6">
          <Button type="submit" disabled={isSaving || (formMode === 'edit' && isReadOnly && !getValues("notes"))} className="w-full md:w-auto">
            {isSaving ? <LoadingSpinner size={16} className="mr-2"/> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? (formMode === "edit" ? "Updating..." : "Saving...") : (formMode === "edit" ? "Update Sale" : "Record Sale & Payment")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
