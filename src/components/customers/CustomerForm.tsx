"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Customer } from "@/types";
import { useState }  from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }).regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format"),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
  location: z.string().min(3, { message: "Location must be at least 3 characters" }),
});

type CustomerFormInputs = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer | null;
  onSave: (data: CustomerFormInputs) => Promise<void>;
  setOpen: (open: boolean) => void;
}

export default function CustomerForm({ customer, onSave, setOpen }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormInputs>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      name: "",
      phone: "",
      email: "",
      location: "",
    },
  });

  const onSubmit: SubmitHandler<CustomerFormInputs> = async (data) => {
    setLoading(true);
    await onSave(data);
    setLoading(false);
  };

  return (
    <DialogContent className="sm:max-w-lg bg-card">
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" {...register("name")} aria-invalid={errors.name ? "true" : "false"} />
          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" {...register("phone")} aria-invalid={errors.phone ? "true" : "false"} />
          {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email Address (Optional)</Label>
          <Input id="email" type="email" {...register("email")} aria-invalid={errors.email ? "true" : "false"} />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="location">Location / Address</Label>
          <Textarea id="location" {...register("location")} aria-invalid={errors.location ? "true" : "false"} />
          {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading && <LoadingSpinner size={16} className="mr-2" />}
            {customer ? "Save Changes" : "Add Customer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
