
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Product } from "@/types";
import { useState }  from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const productSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().optional(),
  unitPrice: z.coerce.number().positive({ message: "Unit price must be a positive number" }),
  quantityInStock: z.coerce.number().min(0, { message: "Quantity must be a non-negative number" }),
});

type ProductFormInputs = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSave: (data: ProductFormInputs) => Promise<void>;
  setOpen: (open: boolean) => void;
}

export default function ProductForm({ product, onSave, setOpen }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      description: product.description || "",
      unitPrice: product.unitPrice,
      quantityInStock: product.quantityInStock || 0,
    } : {
      name: "",
      description: "",
      unitPrice: 0,
      quantityInStock: 0,
    },
  });

  const onSubmit: SubmitHandler<ProductFormInputs> = async (data) => {
    setLoading(true);
    await onSave(data);
    setLoading(false);
    // setOpen(false); // Dialog close is handled by onSave completion in parent
  };

  return (
    <DialogContent className="sm:max-w-lg bg-card">
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{product ? "Edit Product/Service" : "Add New Product/Service"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...register("name")} aria-invalid={errors.name ? "true" : "false"} />
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea id="description" {...register("description")} aria-invalid={errors.description ? "true" : "false"} />
          {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
        </div>
        <div>
          <Label htmlFor="unitPrice">Unit Price (GHS)</Label>
          <Input id="unitPrice" type="number" step="0.01" {...register("unitPrice")} aria-invalid={errors.unitPrice ? "true" : "false"} />
          {errors.unitPrice && <p className="text-sm text-destructive mt-1">{errors.unitPrice.message}</p>}
        </div>
        <div>
          <Label htmlFor="quantityInStock">Quantity in Stock</Label>
          <Input id="quantityInStock" type="number" step="1" {...register("quantityInStock")} aria-invalid={errors.quantityInStock ? "true" : "false"} />
          {errors.quantityInStock && <p className="text-sm text-destructive mt-1">{errors.quantityInStock.message}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading && <LoadingSpinner size={16} className="mr-2" />}
            {product ? "Save Changes" : "Add Product/Service"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
