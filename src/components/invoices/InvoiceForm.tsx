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
import { PlusCircle, CalendarIcon, Wand2, Save, Send, Download, Printer } from "lucide-react";
import LineItemInput from "./LineItemInput";
import type { Invoice, InvoiceItem, Customer, TaxSettings, InvoiceStatus } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { generateInvoiceText, type GenerateInvoiceTextInput } from "@/ai/flows/invoice-autocompletion";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const invoiceItemSchema = z.object({
  id: z.string().default(() => Date.now().toString() + Math.random().toString(36).substring(2, 7)), // Auto-generate ID
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.number().min(0.01, "Unit price must be greater than 0"),
  total: z.number(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  dateIssued: z.date({ required_error: "Issue date is required." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  status: z.enum(["Pending", "Paid", "Overdue"]).default("Pending"),
  // Fields for AI
  companyDetailsForAI: z.string().optional(),
  customerInformationForAI: z.string().optional(), // Will be prefilled from selected customer
  optionalDataForAI: z.string().optional(),
});

export type InvoiceFormInputs = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  customers: Customer[]; // Assume customers are passed as props
  taxSettings: TaxSettings; // Assume tax settings are passed as props
  onSave: (data: Invoice, formData: InvoiceFormInputs) => Promise<void>;
  isSaving?: boolean;
}

// Helper to generate next invoice number (placeholder logic)
const generateInvoiceNumber = async () => {
  // In a real app, this would query Firestore for the last invoice number and increment it.
  // For example: "INV-YYYYMM-0001"
  await new Promise(resolve => setTimeout(resolve, 200)); // simulate async
  const prefix = "INV";
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  // This random part should be replaced with a sequence number from DB
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${randomSuffix}`;
};


export default function InvoiceForm({ invoice, customers, taxSettings, onSave, isSaving }: InvoiceFormProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || "");
  const { toast } = useToast();

  const defaultValues = useMemo(() => {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 30); // Default due date 30 days from now

    return invoice
      ? {
          customerId: invoice.customerId,
          dateIssued: new Date(invoice.dateIssued),
          dueDate: new Date(invoice.dueDate),
          items: invoice.items.map(item => ({...item})), // Ensure fresh copy for form
          notes: invoice.notes || "",
          status: invoice.status,
          companyDetailsForAI: "", // Add appropriate default or fetch
          customerInformationForAI: customers.find(c => c.id === invoice.customerId)?.name || "",
          optionalDataForAI: "",
        }
      : {
          customerId: "",
          dateIssued: now,
          dueDate: dueDate,
          items: [{ description: "", quantity: 1, unitPrice: 0, total: 0, id: Date.now().toString() }],
          notes: "",
          status: "Pending" as InvoiceStatus,
          companyDetailsForAI: "Ghana SME Tracker Inc.\nAccra, Ghana\nVAT Reg: X001234567", // Placeholder
          customerInformationForAI: "",
          optionalDataForAI: "",
        };
  }, [invoice, customers]);

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<InvoiceFormInputs>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedCustomerId = watch("customerId");

  useEffect(() => {
    if (!invoice && !invoiceNumber) {
      generateInvoiceNumber().then(setInvoiceNumber);
    }
  }, [invoice, invoiceNumber]);
  
  useEffect(() => {
    if (watchedCustomerId) {
      const customer = customers.find(c => c.id === watchedCustomerId);
      if (customer) {
        setValue("customerInformationForAI", `Name: ${customer.name}\nPhone: ${customer.phone}\nLocation: ${customer.location}\nEmail: ${customer.email || 'N/A'}`);
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
    append({ description: "", quantity: 1, unitPrice: 0, total: 0, id: Date.now().toString() + Math.random().toString(36).substring(2,7) });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const currentItem = fields[index];
    const newItem = { ...currentItem, [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
        newItem.total = (field === 'quantity' ? Number(value) : currentItem.quantity) * 
                        (field === 'unitPrice' ? Number(value) : currentItem.unitPrice);
    }
    update(index, newItem as any); // RHF update expects full item structure
  };


  const handleGenerateAIDescription = async () => {
    setAiLoading(true);
    const formData = getValues();
    const purchasedProductsString = formData.items
      .map(item => `${item.description} (Qty: ${item.quantity}, Unit Price: GHS ${item.unitPrice.toFixed(2)})`)
      .join("\n");

    const aiInput: GenerateInvoiceTextInput = {
      companyDetails: formData.companyDetailsForAI || "Default Company Details: [Your Company Name], [Address], [Contact Info]",
      customerInformation: formData.customerInformationForAI || "No customer selected or details missing.",
      purchasedProducts: purchasedProductsString,
      optionalData: formData.optionalDataForAI || "",
    };

    try {
      const result = await generateInvoiceText(aiInput);
      if (result.invoiceText) {
        setValue("notes", result.invoiceText);
        toast({ title: "AI Invoice Text Generated", description: "The invoice notes have been populated." });
      } else {
        toast({ title: "AI Generation Issue", description: "The AI returned an empty response.", variant: "destructive" });
      }
    } catch (error) {
      console.error("AI generation error:", error);
      toast({ title: "AI Generation Failed", description: "Could not generate invoice text. Check console for details.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const processSubmit: SubmitHandler<InvoiceFormInputs> = (data) => {
    const finalInvoiceData: Invoice = {
      id: invoice?.id || Date.now().toString(), // Use existing ID or generate new
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`, // Use state or generate
      customerId: data.customerId,
      items: data.items,
      subtotal: subtotal,
      taxDetails: {
        vatRate: taxSettings.vat,
        nhilRate: taxSettings.nhil,
        getFundRate: taxSettings.getFund,
        ...taxAmounts,
      },
      totalAmount: totalAmount,
      status: data.status,
      dateIssued: data.dateIssued,
      dueDate: data.dueDate,
      notes: data.notes,
      createdAt: invoice?.createdAt || new Date(),
    };
    onSave(finalInvoiceData, data);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)}>
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="font-headline text-2xl md:text-3xl">{invoice ? "Edit Invoice" : "Create New Invoice"}</CardTitle>
              {invoiceNumber && <p className="text-muted-foreground">Invoice #: {invoiceNumber}</p>}
            </div>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="w-full md:w-[180px] mt-2 md:mt-0">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Customer and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <Controller
                name="customerId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="customerId" aria-invalid={errors.customerId ? "true" : "false"}>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Label htmlFor="dateIssued">Date Issued</Label>
              <Controller
                name="dateIssued"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="dateIssued"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.dateIssued && "border-destructive"
                        )}
                        aria-invalid={errors.dateIssued ? "true" : "false"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dateIssued && <p className="text-sm text-destructive">{errors.dateIssued.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Controller
                name="dueDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="dueDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.dueDate && "border-destructive"
                        )}
                        aria-invalid={errors.dueDate ? "true" : "false"}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label className="text-lg font-medium">Items</Label>
            {fields.map((field, index) => (
              <LineItemInput
                key={field.id}
                item={watchedItems[index]}
                index={index}
                onChange={handleItemChange}
                onRemove={() => remove(index)}
              />
            ))}
             {errors.items && typeof errors.items === 'object' && !Array.isArray(errors.items) && (
              <p className="text-sm text-destructive">{(errors.items as any).message || "Please add at least one item."}</p>
            )}
            {errors.items && Array.isArray(errors.items) && errors.items.map((itemError, index) => (
              itemError && <p key={index} className="text-sm text-destructive">Error in item {index + 1}: {JSON.stringify(itemError)}</p>
            ))}
            <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          {/* AI Autocompletion Section */}
          <Card className="bg-secondary/20 border-dashed">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center">
                <Wand2 className="mr-2 h-5 w-5 text-primary" /> AI Invoice Text (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="companyDetailsForAI">Your Company Details (for AI)</Label>
                <Textarea
                  id="companyDetailsForAI"
                  placeholder="e.g., Your Company Name, Address, VAT Reg No."
                  {...control.register("companyDetailsForAI")}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="customerInformationForAI">Customer Information (for AI)</Label>
                <Textarea
                  id="customerInformationForAI"
                  placeholder="Prefilled from selected customer. You can edit if needed."
                  {...control.register("customerInformationForAI")}
                  rows={3}
                />
              </div>
               <div>
                <Label htmlFor="optionalDataForAI">Optional Data (for AI)</Label>
                <Textarea
                  id="optionalDataForAI"
                  placeholder="e.g., Specific terms, project codes, bank details for payment"
                  {...control.register("optionalDataForAI")}
                  rows={2}
                />
              </div>
              <Button type="button" onClick={handleGenerateAIDescription} disabled={aiLoading} variant="outline" className="w-full md:w-auto">
                {aiLoading ? <LoadingSpinner size={16} className="mr-2"/> : <Wand2 className="mr-2 h-4 w-4" />}
                {aiLoading ? "Generating..." : "Generate Invoice Notes with AI"}
              </Button>
            </CardContent>
          </Card>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-lg font-medium">Notes / Payment Instructions</Label>
            <Textarea
              id="notes"
              placeholder="Additional information, terms and conditions, or payment details..."
              {...control.register("notes")}
              rows={4}
            />
          </div>

          {/* Totals Summary */}
          <div className="space-y-4 rounded-lg border bg-card p-6 shadow">
            <h3 className="text-xl font-semibold font-headline text-center md:text-left">Invoice Summary</h3>
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
                <span className="text-muted-foreground">NHIL ({ (taxSettings.nhil * 100).toFixed(1) }%):</span>
                <span className="font-medium">GHS {taxAmounts.nhilAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GETFund ({ (taxSettings.getFund * 100).toFixed(1) }%):</span>
                <span className="font-medium">GHS {taxAmounts.getFundAmount.toFixed(2)}</span>
              </div>
              <hr className="my-2 border-border" />
              <div className="flex justify-between text-xl">
                <span className="font-semibold text-primary">Total Amount Due:</span>
                <span className="font-bold text-primary">GHS {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row justify-end gap-3 border-t pt-6">
          <Button type="button" variant="outline" disabled={isSaving}>
            <Printer className="mr-2 h-4 w-4" /> Print (Placeholder)
          </Button>
          <Button type="button" variant="outline" disabled={isSaving}>
            <Download className="mr-2 h-4 w-4" /> Download PDF (Placeholder)
          </Button>
          <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? <LoadingSpinner size={16} className="mr-2"/> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? (invoice ? "Updating..." : "Saving...") : (invoice ? "Update Invoice" : "Save Invoice")}
          </Button>
          <Button type="button" variant="default" disabled={isSaving} className="bg-accent hover:bg-accent/90 text-accent-foreground w-full md:w-auto">
            <Send className="mr-2 h-4 w-4" /> Send Invoice (Placeholder)
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

