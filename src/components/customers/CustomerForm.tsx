
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const customerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits" }).regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format"),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal("")),
  location: z.string().min(3, { message: "Location must be at least 3 characters" }),
});

export type CustomerFormInputs = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: CustomerFormInputs; // Make initialData optional for create form
  onSave: (data: CustomerFormInputs) => Promise<void>;
  isSaving?: boolean;
  mode?: "create" | "edit";
}

export default function CustomerForm({ initialData, onSave, isSaving, mode = "create" }: CustomerFormProps) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormInputs>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || {
      name: "",
      phone: "",
      email: "",
      location: "",
    },
  });

  const onSubmit: SubmitHandler<CustomerFormInputs> = async (data) => {
    await onSave(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          {mode === "create" ? "Add New Customer" : "Edit Customer"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 py-4">
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
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <LoadingSpinner size={16} className="mr-2" />}
            {mode === "create" ? "Add Customer" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
