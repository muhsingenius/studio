
"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import UserForm, { type UserFormInputs } from "@/components/admin/users/UserForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "@/types";

export default function NewUserPage() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleCreateUser = async (data: UserFormInputs) => {
    if (!currentUser || currentUser.role !== "Admin" || !currentUser.businessId) {
      toast({ title: "Permission Denied", description: "You cannot perform this action.", variant: "destructive" });
      return;
    }
    if (!data.password) { // Should be caught by form validation, but defensive check
        toast({ title: "Error", description: "Password is required.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newFirebaseUser = userCredential.user;

      // 2. Update Firebase Auth profile (optional, but good for display name)
      await updateProfile(newFirebaseUser, { displayName: data.name });

      // 3. Create user document in Firestore
      const newUserDoc: User = {
        id: newFirebaseUser.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        businessId: currentUser.businessId,
      };
      await setDoc(doc(db, "users", newFirebaseUser.uid), newUserDoc);
      
      // 4. (Optional) Create businessUsers entry
      // const businessUserDocRef = doc(db, "businessUsers", `${currentUser.businessId}_${newFirebaseUser.uid}`);
      // await setDoc(businessUserDocRef, {
      //   userId: newFirebaseUser.uid,
      //   businessId: currentUser.businessId,
      //   role: data.role,
      //   isActive: true,
      //   joinedAt: serverTimestamp(),
      // });

      toast({ title: "User Created", description: `${data.name} has been added to your business.` });
      router.push("/admin/users");
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Handle Firebase specific errors like 'auth/email-already-in-use'
      let errorMessage = "Could not create user.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use by another account.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      }
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (currentUser?.role !== "Admin") {
     // This should ideally be caught by AuthGuard or page level checks,
     // but as a fallback or if AuthGuard is not specific enough for roles.
    return (
      <AuthGuard>
        <AuthenticatedLayout>
            <PageHeader title="Access Denied" description="You do not have permission to access this page."/>
            {/* Can add a more prominent access denied message here */}
        </AuthenticatedLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Add New User"
          description="Create a new user account for your business."
        />
        <UserForm
          mode="create"
          onSubmit={handleCreateUser}
          isSaving={isSaving}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
