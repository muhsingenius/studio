
"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import { employeeCompensationTypes, wagePeriods } from "@/types";
import { Switch } from "../ui/switch";

const employeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  role: z.string().min(2, "Role is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  ssnitNumber: z.string().optional(),
  tinNumber: z.string().optional(),
  isActive: z.boolean().default(true),
  compensationType: z.enum(employeeCompensationTypes),
  grossSalary: z.coerce.number().optional(),
  wageRate: z.coerce.number().optional(),
  wagePeriod: z.enum(wagePeriods).optional(),
}).superRefine((data, ctx) => {
  if (data.compensationType === "Salary" && (!data.grossSalary || data.grossSalary <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gross monthly salary is required and must be positive.",
      path: ["grossSalary"],
    });
  }
  if (data.compensationType === "Wage" && (!data.wageRate || data.wageRate <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wage rate is required and must be positive.",
      path: ["wageRate"],
    });
  }
  if (data.compensationType === "Wage" && !data.wagePeriod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Wage period (per Hour/Day) is required.",
      path: ["wagePeriod"],
    });
  }
});

type EmployeeFormInputs = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Employee;
  onSave: (data: Omit<Employee, "id" | "businessId" | "createdAt" | "updatedAt">) => Promise<void>;
  isSaving?: boolean;
  mode: "create" | "edit";
}

export default function EmployeeForm({ initialData, onSave, isSaving, mode }: EmployeeFormProps) {
  const router = useRouter();
  const { control, register, handleSubmit, watch, formState: { errors } } = useForm<EmployeeFormInputs>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialData || {
      name: "",
      role: "",
      startDate: new Date(),
      email: "",
      phone: "",
      ssnitNumber: "",
      tinNumber: "",
      isActive: true,
      compensationType: "Salary",
    },
  });

  const watchedCompensationType = watch("compensationType");

  const onSubmit: SubmitHandler<EmployeeFormInputs> = async (data) => {
    const dataToSave = { ...data };
    // Clear unused compensation fields before saving to prevent storing `undefined`
    if (dataToSave.compensationType === 'Salary') {
      delete (dataToSave as any).wageRate;
      delete (dataToSave as any).wagePeriod;
    } else {
      delete (dataToSave as any).grossSalary;
    }
    await onSave(dataToSave as Omit<Employee, "id" | "businessId" | "createdAt" | "updatedAt">);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{mode === 'create' ? "New Employee Profile" : "Edit Employee Profile"}</CardTitle>
          <CardDescription>Enter the employee's details and compensation information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 py-4">
          <fieldset className="space-y-4 p-4 border rounded-md">
            <legend className="text-lg font-medium px-2">Personal & Role</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="role">Role / Position *</Label>
                <Input id="role" {...register("role")} placeholder="e.g., Sales Manager" aria-invalid={!!errors.role} />
                {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" {...register("phone")} />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                 <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.startDate && "border-destructive")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                    </Popover>
                  )}
                />
                {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>}
              </div>
               <div className="flex items-center space-x-2 pt-6">
                    <Controller
                      name="isActive"
                      control={control}
                      render={({ field }) => ( <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} /> )}
                    />
                    <Label htmlFor="isActive">Employee is Active</Label>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 p-4 border rounded-md">
            <legend className="text-lg font-medium px-2">Compensation</legend>
            <div>
              <Label>Compensation Type *</Label>
              <Controller
                name="compensationType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Select compensation type" /></SelectTrigger>
                    <SelectContent>
                      {employeeCompensationTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {watchedCompensationType === 'Salary' && (
              <div>
                <Label htmlFor="grossSalary">Gross Monthly Salary (GHS) *</Label>
                 <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="grossSalary" type="number" step="0.01" {...register("grossSalary")} className="pl-8" />
                 </div>
                {errors.grossSalary && <p className="text-sm text-destructive mt-1">{errors.grossSalary.message}</p>}
              </div>
            )}
            {watchedCompensationType === 'Wage' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="wageRate">Wage Rate (GHS) *</Label>
                     <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="wageRate" type="number" step="0.01" {...register("wageRate")} className="pl-8" />
                     </div>
                    {errors.wageRate && <p className="text-sm text-destructive mt-1">{errors.wageRate.message}</p>}
                </div>
                <div>
                    <Label htmlFor="wagePeriod">Wage Period *</Label>
                    <Controller
                        name="wagePeriod"
                        control={control}
                        render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Per..." /></SelectTrigger>
                            <SelectContent>
                            {wagePeriods.map(period => <SelectItem key={period} value={period}>Per {period}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        )}
                    />
                    {errors.wagePeriod && <p className="text-sm text-destructive mt-1">{errors.wagePeriod.message}</p>}
                </div>
              </div>
            )}
          </fieldset>

           <fieldset className="space-y-4 p-4 border rounded-md">
            <legend className="text-lg font-medium px-2">Statutory Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <Label htmlFor="ssnitNumber">SSNIT Number</Label>
                <Input id="ssnitNumber" {...register("ssnitNumber")} />
              </div>
              <div>
                <Label htmlFor="tinNumber">TIN (Tax ID Number)</Label>
                <Input id="tinNumber" {...register("tinNumber")} />
              </div>
            </div>
          </fieldset>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => router.push("/employees")} disabled={isSaving}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <LoadingSpinner size={16} className="mr-2" />}
            {mode === "create" ? "Add Employee" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
