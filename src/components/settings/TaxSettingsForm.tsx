"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaxSettings, TaxRate } from "@/types";
import { useState } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { PlusCircle, Trash2 } from "lucide-react";

const taxRateSchema = z.object({
  id: z.string().optional(), // ID for existing custom taxes
  name: z.string().min(1, "Tax name is required"),
  rate: z.number().min(0, "Rate must be non-negative").max(1, "Rate must be between 0 and 1 (e.g., 0.15 for 15%)"),
  description: z.string().optional(),
});

const taxSettingsSchema = z.object({
  vat: z.number().min(0).max(1),
  nhil: z.number().min(0).max(1),
  getFund: z.number().min(0).max(1),
  customTaxes: z.array(taxRateSchema).optional(),
});

type TaxSettingsFormInputs = z.infer<typeof taxSettingsSchema>;

interface TaxSettingsFormProps {
  settings: TaxSettings;
  onSave: (data: TaxSettingsFormInputs) => Promise<void>;
}

export default function TaxSettingsForm({ settings, onSave }: TaxSettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const { control, register, handleSubmit, formState: { errors } } = useForm<TaxSettingsFormInputs>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      vat: settings.vat,
      nhil: settings.nhil,
      getFund: settings.getFund,
      customTaxes: settings.customTaxes || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "customTaxes",
  });

  const onSubmit: SubmitHandler<TaxSettingsFormInputs> = async (data) => {
    setLoading(true);
    await onSave(data);
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Tax Configuration</CardTitle>
        <CardDescription>Set the tax rates for VAT, NHIL, GETFund, and add custom taxes if needed. Rates should be in decimal format (e.g., 0.15 for 15%).</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="vat">VAT Rate (%)</Label>
              <Input 
                id="vat" 
                type="number" 
                step="0.001" 
                placeholder="e.g., 0.15 for 15%" 
                {...register("vat", { valueAsNumber: true })} 
                className={errors.vat ? "border-destructive" : ""}
              />
              {errors.vat && <p className="text-sm text-destructive mt-1">{errors.vat.message}</p>}
            </div>
            <div>
              <Label htmlFor="nhil">NHIL Rate (%)</Label>
              <Input 
                id="nhil" 
                type="number" 
                step="0.001" 
                placeholder="e.g., 0.025 for 2.5%" 
                {...register("nhil", { valueAsNumber: true })} 
                className={errors.nhil ? "border-destructive" : ""}
              />
              {errors.nhil && <p className="text-sm text-destructive mt-1">{errors.nhil.message}</p>}
            </div>
            <div>
              <Label htmlFor="getFund">GETFund Rate (%)</Label>
              <Input 
                id="getFund" 
                type="number" 
                step="0.001" 
                placeholder="e.g., 0.025 for 2.5%" 
                {...register("getFund", { valueAsNumber: true })}
                className={errors.getFund ? "border-destructive" : ""}
              />
              {errors.getFund && <p className="text-sm text-destructive mt-1">{errors.getFund.message}</p>}
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium font-headline">Custom Taxes (Optional)</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border p-3 rounded-md bg-secondary/30">
                <div className="md:col-span-5">
                  <Label htmlFor={`customTaxes.${index}.name`} className="sr-only md:not-sr-only">Tax Name</Label>
                  <Input 
                    id={`customTaxes.${index}.name`}
                    placeholder="Tax Name" 
                    {...register(`customTaxes.${index}.name`)}
                    className={errors.customTaxes?.[index]?.name ? "border-destructive" : ""} 
                  />
                   {errors.customTaxes?.[index]?.name && <p className="text-sm text-destructive mt-1">{errors.customTaxes[index]?.name?.message}</p>}
                </div>
                <div className="md:col-span-3">
                   <Label htmlFor={`customTaxes.${index}.rate`} className="sr-only md:not-sr-only">Rate</Label>
                  <Input 
                    id={`customTaxes.${index}.rate`}
                    type="number" 
                    step="0.001" 
                    placeholder="Rate (e.g. 0.05)" 
                    {...register(`customTaxes.${index}.rate`, { valueAsNumber: true })} 
                    className={errors.customTaxes?.[index]?.rate ? "border-destructive" : ""}
                  />
                   {errors.customTaxes?.[index]?.rate && <p className="text-sm text-destructive mt-1">{errors.customTaxes[index]?.rate?.message}</p>}
                </div>
                <div className="md:col-span-3">
                   <Label htmlFor={`customTaxes.${index}.description`} className="sr-only md:not-sr-only">Description</Label>
                  <Input 
                    id={`customTaxes.${index}.description`}
                    placeholder="Description (optional)" 
                    {...register(`customTaxes.${index}.description`)} 
                  />
                </div>
                <div className="md:col-span-1 flex justify-end md:justify-center">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove custom tax">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ name: "", rate: 0, description: "" })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Tax
            </Button>
          </div>

        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button type="submit" disabled={loading} className="w-full md:w-auto ml-auto">
            {loading ? <LoadingSpinner size={16} className="mr-2" /> : null}
            Save Tax Settings
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
