
"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import UserForm, { type UserFormInputs } from "@/components/admin/users/UserForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db, firebaseConfig } from "@/lib/firebase"; // Import main db and firebaseConfig
import { getAuth as getAuthInstance, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"; // Renamed getAuth to avoid conflict
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app"; // Import for temp app management
import { doc, setDoc } from "firebase/firestore";
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
    let tempApp: FirebaseApp | null = null;

    try {
      // Create a unique name for the temporary app to avoid conflicts
      const tempAppName = `tempUserCreation-${Date.now()}`;
      tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuthInstance(tempApp); // Get auth from the temporary app

      // 1. Create Firebase Auth user using the temporary auth instance
      const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
      const newFirebaseUser = userCredential.user; // This user is from tempAuth

      // 2. Update Firebase Auth profile (using the newFirebaseUser from tempAuth)
      await updateProfile(newFirebaseUser, { displayName: data.name });

      // 3. Create user document in Firestore (uses the main `db` instance)
      const newUserDoc: User = {
        id: newFirebaseUser.uid, // UID is universal
        name: data.name,
        email: data.email,
        role: data.role,
        businessId: currentUser.businessId,
      };
      await setDoc(doc(db, "users", newFirebaseUser.uid), newUserDoc);
      
      // 4. (Optional) Create businessUsers entry (using main `db` instance)
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
      let errorMessage = "Could not create user.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use by another account.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      }
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
      if (tempApp) {
        try {
          await deleteApp(tempApp); // Clean up the temporary app
          console.log("Temporary Firebase app for user creation deleted successfully.");
        } catch (deleteError) {
          console.error("Error deleting temporary Firebase app:", deleteError);
        }
      }
    }
  };

  if (currentUser?.role !== "Admin") {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
            <PageHeader title="Access Denied" description="You do not have permission to access this page."/>
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
