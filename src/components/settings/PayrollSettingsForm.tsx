
"use client";

import { useForm, SubmitHandler, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PayrollSettings } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { PlusCircle, Trash2 } from "lucide-react";

const payeBracketSchema = z.object({
  id: z.string(),
  from: z.coerce.number().nonnegative("Must be non-negative"),
  to: z.coerce.number().positive("Must be positive").nullable(),
  rate: z.coerce.number().min(0, "Rate must be >= 0").max(1, "Rate must be <= 1"),
});

const payrollSettingsSchema = z.object({
  ssnitRates: z.object({
    employeeContribution: z.coerce.number().min(0).max(1),
    employerContribution: z.coerce.number().min(0).max(1),
  }),
  payeBrackets: z.array(payeBracketSchema),
});

type FormInputs = z.infer<typeof payrollSettingsSchema>;

interface PayrollSettingsFormProps {
  settings: PayrollSettings;
  onSave: (data: Omit<PayrollSettings, "id" | "businessId">) => Promise<void>;
  isSaving: boolean;
}

export default function PayrollSettingsForm({ settings, onSave, isSaving }: PayrollSettingsFormProps) {
  const { control, register, handleSubmit, formState: { errors } } = useForm<FormInputs>({
    resolver: zodResolver(payrollSettingsSchema),
    defaultValues: {
      ssnitRates: settings.ssnitRates,
      payeBrackets: settings.payeBrackets.map(b => ({ ...b, to: b.to === null ? null : b.to }))
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "payeBrackets",
  });

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    // Ensure 'to' field is correctly null for infinity
    const processedData = {
      ...data,
      payeBrackets: data.payeBrackets.map(bracket => ({
        ...bracket,
        to: bracket.to === null || bracket.to === undefined || bracket.to === 0 ? null : bracket.to,
      })),
    };
    await onSave(processedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SSNIT Contribution Rates</CardTitle>
            <CardDescription>Enter rates in decimal format (e.g., 5.5% is 0.055).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ssnitEmployee">Employee Contribution Rate</Label>
              <Input id="ssnitEmployee" type="number" step="0.001" {...register("ssnitRates.employeeContribution")} />
              {errors.ssnitRates?.employeeContribution && <p className="text-sm text-destructive mt-1">{errors.ssnitRates.employeeContribution.message}</p>}
            </div>
            <div>
              <Label htmlFor="ssnitEmployer">Employer Contribution Rate</Label>
              <Input id="ssnitEmployer" type="number" step="0.001" {...register("ssnitRates.employerContribution")} />
              {errors.ssnitRates?.employerContribution && <p className="text-sm text-destructive mt-1">{errors.ssnitRates.employerContribution.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PAYE Income Tax Brackets</CardTitle>
            <CardDescription>Define the monthly income bands for PAYE calculation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>From (GHS)</Label>
                  <Input type="number" {...register(`payeBrackets.${index}.from`)} />
                </div>
                <div className="flex-1">
                  <Label>To (GHS)</Label>
                  <Input type="number" placeholder="Leave empty for infinity" {...register(`payeBrackets.${index}.to`)} />
                </div>
                <div className="flex-1">
                  <Label>Rate</Label>
                  <Input type="number" step="0.001" placeholder="e.g., 0.175" {...register(`payeBrackets.${index}.rate`)} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {errors.payeBrackets && <p className="text-sm text-destructive mt-1">Please check for errors in your tax brackets.</p>}
            <Button type="button" variant="outline" onClick={() => append({ id: new Date().toISOString(), from: 0, to: null, rate: 0 })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Bracket
            </Button>
          </CardContent>
        </Card>
      </div>
      <CardFooter className="mt-6 border-t pt-6">
        <Button type="submit" disabled={isSaving} className="ml-auto">
          {isSaving && <LoadingSpinner className="mr-2" />}
          Save Payroll Settings
        </Button>
      </CardFooter>
    </form>
  );
}
