
"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const createBusinessSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters" }),
  industry: z.string().min(2, { message: "Industry must be at least 2 characters" }).optional().or(z.literal("")),
  location: z.string().optional(),
  currency: z.string().length(3, { message: "Currency should be a 3-letter code (e.g., GHS, USD)" }).toUpperCase().optional().or(z.literal("")),
});

type CreateBusinessFormInputs = z.infer<typeof createBusinessSchema>;

export default function CreateBusinessForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firebaseUser, currentUser } = useAuth(); // firebaseUser for UID, currentUser for existing profile data

  const { register, handleSubmit, formState: { errors } } = useForm<CreateBusinessFormInputs>({
    resolver: zodResolver(createBusinessSchema),
    defaultValues: {
      currency: "GHS", // Default to GHS
    }
  });

  const onSubmit: SubmitHandler<CreateBusinessFormInputs> = async (data) => {
    if (!firebaseUser) {
      toast({ title: "Error", description: "You must be logged in to create a business.", variant: "destructive" });
      return;
    }
    if (currentUser?.businessId) {
        toast({ title: "Info", description: "You are already associated with a business.", variant: "default" });
        router.push("/dashboard");
        return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the business document
      const businessData: any = {
        name: data.businessName,
        createdBy: firebaseUser.uid,
        adminUids: [firebaseUser.uid], // Current user becomes the first admin
        createdAt: serverTimestamp(),
      };
      if (data.industry) businessData.industry = data.industry;
      if (data.location) businessData.location = data.location;
      if (data.currency) businessData.currency = data.currency;

      const businessDocRef = await addDoc(collection(db, "businesses"), businessData);
      const newBusinessId = businessDocRef.id;

      // 2. Update the user document
      const userDocRef = doc(db, "users", firebaseUser.uid);
      await updateDoc(userDocRef, {
        businessId: newBusinessId,
        role: "Admin", // Elevate user to Admin
      });

      // 3. (Optional) Create a document in businessUsers
      // Using composite key {businessId}_{userId} as per prompt.
      const businessUserDocRef = doc(db, "businessUsers", `${newBusinessId}_${firebaseUser.uid}`);
      await setDoc(businessUserDocRef, {
        userId: firebaseUser.uid,
        businessId: newBusinessId,
        role: "Admin",
        isActive: true,
        joinedAt: serverTimestamp(),
      });

      toast({
        title: "Business Created!",
        description: `${data.businessName} has been successfully set up.`,
      });
      router.push("/dashboard"); // Redirect to dashboard

    } catch (error: any) {
      console.error("Error creating business:", error);
      toast({
        title: "Business Creation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="businessName">Business Name*</Label>
        <Input
          id="businessName"
          {...register("businessName")}
          className={errors.businessName ? "border-destructive" : ""}
          aria-invalid={errors.businessName ? "true" : "false"}
        />
        {errors.businessName && <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>}
      </div>

      <div>
        <Label htmlFor="industry">Industry / Category</Label>
        <Input
          id="industry"
          placeholder="e.g., Retail, Software, Consulting"
          {...register("industry")}
          className={errors.industry ? "border-destructive" : ""}
          aria-invalid={errors.industry ? "true" : "false"}
        />
        {errors.industry && <p className="text-sm text-destructive mt-1">{errors.industry.message}</p>}
      </div>

      <div>
        <Label htmlFor="location">Business Location</Label>
        <Input
          id="location"
          placeholder="e.g., Accra, Ghana"
          {...register("location")}
          className={errors.location ? "border-destructive" : ""}
          aria-invalid={errors.location ? "true" : "false"}
        />
        {errors.location && <p className="text-sm text-destructive mt-1">{errors.location.message}</p>}
      </div>
      
      <div>
        <Label htmlFor="currency">Default Currency</Label>
        <Input
          id="currency"
          placeholder="e.g., GHS, USD"
          {...register("currency")}
          className={errors.currency ? "border-destructive" : ""}
          aria-invalid={errors.currency ? "true" : "false"}
        />
        {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <LoadingSpinner size={18} className="mr-2" />}
        {isSubmitting ? "Setting Up..." : "Create Business & Proceed"}
      </Button>
    </form>
  );
}
