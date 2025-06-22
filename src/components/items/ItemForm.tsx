
"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Item, ItemType, ItemCategory } from "@/types";
import { useEffect } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const itemTypeOptions: { value: ItemType; label: string }[] = [
  { value: "inventory", label: "Inventory" },
  { value: "non-inventory", label: "Non-Inventory" },
  { value: "service", label: "Service" },
  { value: "digital", label: "Digital Product" },
  { value: "bundle", label: "Bundle" },
];

const itemSchema = z.object({
  type: z.enum(["inventory", "non-inventory", "service", "digital", "bundle"]),
  name: z.string().min(1, { message: "Name is required" }),
  sku: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  sellingPrice: z.coerce.number().positive({ message: "Selling price must be a positive number" }),
  costPrice: z.coerce.number().nonnegative({ message: "Cost price must be a non-negative number" }).optional().or(z.literal("")),
  unit: z.string().optional(),
  trackInventory: z.boolean().default(false),
  isActive: z.boolean().default(true),
  quantityOnHand: z.coerce.number().nonnegative("Quantity must be non-negative").optional().or(z.literal("")),
  reorderLevel: z.coerce.number().nonnegative("Reorder level must be non-negative").optional().or(z.literal("")),
  warehouse: z.string().optional(),
  batchOrSerialNo: z.string().optional(),
  taxCode: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'inventory' && data.trackInventory && (data.quantityOnHand === undefined || data.quantityOnHand === "" || Number(data.quantityOnHand) < 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Quantity on hand is required and must be non-negative for tracked inventory items.",
      path: ["quantityOnHand"],
    });
  }
  if (data.costPrice === "") data.costPrice = undefined;
  if (data.quantityOnHand === "") data.quantityOnHand = undefined;
  if (data.reorderLevel === "") data.reorderLevel = undefined;
});


type ItemFormInputs = z.infer<typeof itemSchema>;

interface ItemFormProps {
  item?: Item | null;
  categories: ItemCategory[];
  onSave: (data: Omit<Item, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  setOpen: (open: boolean) => void;
  isSaving?: boolean;
}

const NO_CATEGORY_VALUE = "__NO_CATEGORY__";

export default function ItemForm({ item, categories, onSave, setOpen, isSaving }: ItemFormProps) {
  const { currentBusiness } = useAuth();
  const currency = currentBusiness?.currency || 'GHS';
  
  const { control, register, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm<ItemFormInputs>({
    resolver: zodResolver(itemSchema),
    defaultValues: item ? {
      ...item,
      costPrice: item.costPrice ?? "",
      quantityOnHand: item.quantityOnHand ?? "",
      reorderLevel: item.reorderLevel ?? "",
      trackInventory: item.type === 'inventory' ? (item.trackInventory !== undefined ? item.trackInventory : true) : false,
    } : {
      type: "inventory",
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      sellingPrice: 0,
      costPrice: "",
      unit: "",
      trackInventory: true, 
      isActive: true,
      quantityOnHand: "",
      reorderLevel: "",
      warehouse: "",
      batchOrSerialNo: "",
      taxCode: "",
    },
  });

  const watchedTrackInventory = watch("trackInventory");
  const watchedType = watch("type");

  useEffect(() => {
    if (watchedType !== 'inventory') {
      setValue('trackInventory', false);
    } else {
      if (!item || getValues('trackInventory') === false) {
        setValue('trackInventory', true);
      }
    }
  }, [watchedType, setValue, item, getValues]);

  const isTrackInventoryDisabled = watchedType !== 'inventory';
  const showInventoryFields = watchedType === 'inventory' && watchedTrackInventory;

  const onSubmit: SubmitHandler<ItemFormInputs> = async (data) => {
    await onSave(data as Omit<Item, "id" | "createdAt" | "updatedAt">);
  };

  return (
    <DialogContent className="sm:max-w-2xl bg-card">
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{item ? "Edit Item/Service" : "Add New Item/Service"}</DialogTitle>
        <DialogDescription>
          Fill in the details for your item or service. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] p-1 pr-4">
        <TooltipProvider>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4 pr-2">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type *</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="type" aria-invalid={!!errors.type}>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                <Input id="sku" {...register("sku")} />
                {errors.sku && <p className="text-sm text-destructive mt-1">{errors.sku.message}</p>}
              </div>
               <div>
                <Label htmlFor="categoryId">Category</Label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => field.onChange(value === NO_CATEGORY_VALUE ? "" : value)}
                    >
                      <SelectTrigger id="categoryId">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value={NO_CATEGORY_VALUE}>-- No Category --</SelectItem>
                         {categories.map((cat) => (
                           <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                         ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sellingPrice">Selling Price ({currency}) *</Label>
                <Input id="sellingPrice" type="number" step="0.01" {...register("sellingPrice")} aria-invalid={!!errors.sellingPrice} />
                {errors.sellingPrice && <p className="text-sm text-destructive mt-1">{errors.sellingPrice.message}</p>}
              </div>
              <div>
                <Label htmlFor="costPrice">Cost Price ({currency})</Label>
                <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} aria-invalid={!!errors.costPrice}/>
                {errors.costPrice && <p className="text-sm text-destructive mt-1">{errors.costPrice.message}</p>}
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" {...register("unit")} placeholder="e.g., pcs, kg, hour, set" />
                {errors.unit && <p className="text-sm text-destructive mt-1">{errors.unit.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="trackInventory"
                      control={control}
                      render={({ field }) => (
                          <Switch
                              id="trackInventory"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isTrackInventoryDisabled}
                              aria-describedby={isTrackInventoryDisabled ? "trackInventoryTooltip" : undefined}
                          />
                      )}
                    />
                    <Label htmlFor="trackInventory" className={cn("cursor-pointer", isTrackInventoryDisabled && "cursor-not-allowed opacity-70")}>Track Inventory</Label>
                  </div>
                </TooltipTrigger>
                {isTrackInventoryDisabled && (
                  <TooltipContent id="trackInventoryTooltip">
                    <p>Inventory tracking is only available for 'Inventory' type items.</p>
                  </TooltipContent>
                )}
              </Tooltip>
              
              <div className="flex items-center space-x-2">
                <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            id="isActive"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    )}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Item is Active</Label>
              </div>
            </div>
            
            {showInventoryFields && (
              <div className="space-y-5 pt-4 border-t mt-4">
                <h3 className="text-md font-semibold text-primary">Inventory Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantityOnHand">Quantity on Hand *</Label>
                    <Input id="quantityOnHand" type="number" step="1" {...register("quantityOnHand")} aria-invalid={!!errors.quantityOnHand} />
                    {errors.quantityOnHand && <p className="text-sm text-destructive mt-1">{errors.quantityOnHand.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input id="reorderLevel" type="number" step="1" {...register("reorderLevel")} aria-invalid={!!errors.reorderLevel}/>
                    {errors.reorderLevel && <p className="text-sm text-destructive mt-1">{errors.reorderLevel.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="warehouse">Warehouse / Location</Label>
                    <Input id="warehouse" {...register("warehouse")} />
                    {errors.warehouse && <p className="text-sm text-destructive mt-1">{errors.warehouse.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="batchOrSerialNo">Batch / Serial No.</Label>
                    <Input id="batchOrSerialNo" {...register("batchOrSerialNo")} />
                    {errors.batchOrSerialNo && <p className="text-sm text-destructive mt-1">{errors.batchOrSerialNo.message}</p>}
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="taxCode">Tax Code (Future)</Label>
              <Input id="taxCode" {...register("taxCode")} placeholder="e.g., VAT Exempt, Standard Rate" disabled/>
              {errors.taxCode && <p className="text-sm text-destructive mt-1">{errors.taxCode.message}</p>}
            </div>


            <DialogFooter className="pt-5">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoadingSpinner size={16} className="mr-2" />}
                {item ? "Save Changes" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </ScrollArea>
    </DialogContent>
  );
}
