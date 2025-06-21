
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { ItemCategory } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const categorySchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }),
});

type CategoryFormInputs = z.infer<typeof categorySchema>;

interface ItemCategoryFormProps {
  category?: ItemCategory | null;
  onSave: (data: CategoryFormInputs) => Promise<void>;
  setOpen: (open: boolean) => void;
  isSaving?: boolean;
}

export default function ItemCategoryForm({ category, onSave, setOpen, isSaving }: ItemCategoryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryFormInputs>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
    },
  });

  const onSubmit: SubmitHandler<CategoryFormInputs> = async (data) => {
    await onSave(data);
  };

  return (
    <DialogContent className="sm:max-w-md bg-card">
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{category ? "Edit Category" : "Add New Category"}</DialogTitle>
        <DialogDescription>
          {category ? "Update the name of your item category." : "Create a new category to organize your items and services."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div>
          <Label htmlFor="name">Category Name *</Label>
          <Input 
            id="name" 
            {...register("name")} 
            aria-invalid={!!errors.name} 
            placeholder="e.g., Electronics, Consulting Services"
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <DialogFooter className="pt-5">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <LoadingSpinner size={16} className="mr-2" />}
            {category ? "Save Changes" : "Add Category"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
