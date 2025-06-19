
"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useRouter } from "next/navigation";
import type { User, Role } from "@/types";

const roles: Role[] = ["Admin", "Accountant", "Sales", "Staff"];

const userFormSchemaBase = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  role: z.enum(roles, { required_error: "Role is required" }),
});

const createUserSchema = userFormSchemaBase.extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Confirm password is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const editUserSchema = userFormSchemaBase; // Password not editable here directly

export type UserFormInputs = z.infer<typeof createUserSchema>; // Use the more comprehensive one for type

interface UserFormProps {
  mode: "create" | "edit";
  existingUser?: User;
  onSubmit: (data: UserFormInputs) => Promise<void>;
  isSaving: boolean;
}

export default function UserForm({ mode, existingUser, onSubmit, isSaving }: UserFormProps) {
  const router = useRouter();
  const schema = mode === "create" ? createUserSchema : editUserSchema;

  const { control, register, handleSubmit, formState: { errors } } = useForm<UserFormInputs>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: existingUser?.name || "",
      email: existingUser?.email || "",
      role: existingUser?.role || "Staff",
      password: "",
      confirmPassword: "",
    },
  });

  const processSubmit: SubmitHandler<UserFormInputs> = async (data) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          {mode === "create" ? "Create New User" : `Edit User: ${existingUser?.name || existingUser?.email}`}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(processSubmit)}>
        <CardContent className="space-y-6 py-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              {...register("email")} 
              aria-invalid={!!errors.email} 
              readOnly={mode === "edit"} // Email usually not editable after creation or tied to auth
              className={mode === "edit" ? "bg-muted cursor-not-allowed" : ""}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={mode === "edit"} // Role editing deferred for edit mode
                >
                  <SelectTrigger id="role" aria-invalid={!!errors.role} className={mode === "edit" ? "bg-muted cursor-not-allowed" : ""}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((roleOption) => (
                      <SelectItem key={roleOption} value={roleOption}>{roleOption}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
          </div>

          {mode === "create" && (
            <>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} aria-invalid={!!errors.password} />
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" {...register("confirmPassword")} aria-invalid={!!errors.confirmPassword} />
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/users")} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <LoadingSpinner size={16} className="mr-2" />}
            {mode === "create" ? "Create User" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
