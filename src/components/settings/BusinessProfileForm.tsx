
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Business } from "@/types";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Image from "next/image"; // For displaying the logo
import { UploadCloud, Image as ImageIcon } from "lucide-react";

const businessProfileSchema = z.object({
  name: z.string().min(2, { message: "Business name must be at least 2 characters" }),
  industry: z.string().optional(),
  location: z.string().optional(),
  currency: z.string().length(3, "Currency must be a 3-letter code (e.g., GHS)").toUpperCase().optional().or(z.literal("")),
  logoUrl: z.string().url({ message: "Please enter a valid URL for the logo" }).optional().or(z.literal("")),
});

type BusinessProfileFormInputs = z.infer<typeof businessProfileSchema>;

interface BusinessProfileFormProps {
  initialData: Business;
  onSave: (data: BusinessProfileFormInputs) => Promise<void>;
  isSaving: boolean;
  isEditable: boolean;
}

export default function BusinessProfileForm({ initialData, onSave, isSaving, isEditable }: BusinessProfileFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BusinessProfileFormInputs>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      name: initialData.name || "",
      industry: initialData.industry || "",
      location: initialData.location || "",
      currency: initialData.currency || "GHS",
      logoUrl: initialData.logoUrl || "",
    },
  });

  const watchedLogoUrl = watch("logoUrl");

  const onSubmit: SubmitHandler<BusinessProfileFormInputs> = async (data) => {
    if (!isEditable) return;
    await onSave(data);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Company Details</CardTitle>
          {!isEditable && <CardDescription>You are viewing the business profile. Only admins can make changes.</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Display and Input */}
            <div className="space-y-2 md:col-span-2 flex flex-col items-center">
              <Label htmlFor="logoUrl" className="self-start">Business Logo (URL)</Label>
              <div className="w-40 h-40 rounded-lg border border-dashed bg-muted/30 flex items-center justify-center overflow-hidden mb-2">
                {watchedLogoUrl ? (
                  <Image
                    src={watchedLogoUrl}
                    alt={`${initialData.name || 'Business'} Logo`}
                    width={160}
                    height={160}
                    className="object-contain"
                    data-ai-hint="logo company"
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      (e.target as HTMLImageElement).srcset = "https://placehold.co/160x160.png";
                      (e.target as HTMLImageElement).src = "https://placehold.co/160x160.png";
                    }}
                  />
                ) : (
                  <Image
                    src="https://placehold.co/160x160.png"
                    alt="Placeholder Business Logo"
                    width={160}
                    height={160}
                    className="object-contain opacity-50"
                    data-ai-hint="logo company"
                  />
                )}
              </div>
              <Input
                id="logoUrl"
                placeholder="https://example.com/logo.png"
                {...register("logoUrl")}
                disabled={!isEditable || isSaving}
                className={errors.logoUrl ? "border-destructive" : ""}
              />
              {errors.logoUrl && <p className="text-sm text-destructive mt-1">{errors.logoUrl.message}</p>}
               {isEditable && (
                 <p className="text-xs text-muted-foreground text-center mt-1">
                   Enter the full URL for your business logo. Actual file upload coming soon!
                 </p>
               )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">Business Name*</Label>
              <Input
                id="name"
                {...register("name")}
                disabled={!isEditable || isSaving}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="industry">Industry / Category</Label>
              <Input
                id="industry"
                placeholder="e.g., Retail, Software"
                {...register("industry")}
                disabled={!isEditable || isSaving}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="location">Business Location</Label>
              <Input
                id="location"
                placeholder="e.g., Accra, Ghana"
                {...register("location")}
                disabled={!isEditable || isSaving}
              />
            </div>
            <div>
              <Label htmlFor="currency">Default Currency</Label>
              <Input
                id="currency"
                placeholder="e.g., GHS"
                maxLength={3}
                {...register("currency")}
                disabled={!isEditable || isSaving}
                className={errors.currency ? "border-destructive" : ""}
              />
              {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
            </div>
          </div>
          
        </CardContent>
        {isEditable && (
          <CardFooter className="border-t pt-6">
            <Button type="submit" disabled={isSaving} className="w-full md:w-auto ml-auto">
              {isSaving ? <LoadingSpinner size={16} className="mr-2" /> : null}
              Save Changes
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
