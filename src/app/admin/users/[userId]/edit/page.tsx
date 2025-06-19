
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import UserForm, { type UserFormInputs } from "@/components/admin/users/UserForm";
import type { User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db, auth } from "@/lib/firebase"; // Import auth
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth"; // Import for updating Auth profile
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser: adminUser } = useAuth(); // Renamed to avoid conflict

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = typeof params.userId === 'string' ? params.userId : null;

  useEffect(() => {
    if (!userId) {
      setError("Invalid user ID.");
      setIsLoading(false);
      router.push("/admin/users");
      return;
    }
    if (!adminUser || adminUser.role !== "Admin" || !adminUser.businessId) {
      setError("Permission denied or business context missing.");
      setIsLoading(false);
      return;
    }

    const fetchUser = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userDocRef = doc(db, "users", userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const fetchedUser = { id: docSnap.id, ...docSnap.data() } as User;
          // Ensure the user belongs to the admin's business
          if (fetchedUser.businessId !== adminUser.businessId) {
            setError("Access Denied. This user does not belong to your business.");
            toast({ title: "Access Denied", description: "User not part of your business.", variant: "destructive" });
            setUserToEdit(null);
          } else {
            setUserToEdit(fetchedUser);
          }
        } else {
          setError("User not found.");
          toast({ title: "Not Found", description: `User with ID ${userId} does not exist.`, variant: "destructive" });
        }
      } catch (err: any) {
        console.error("Error fetching user for edit: ", err);
        setError("Failed to fetch user data.");
        toast({ title: "Error", description: "Could not retrieve user details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId, router, toast, adminUser]);

  const handleUpdateUser = async (data: UserFormInputs) => {
    if (!userToEdit || !adminUser || adminUser.role !== "Admin" || userToEdit.businessId !== adminUser.businessId) {
      toast({ title: "Error", description: "Cannot update user. Invalid conditions.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const userDocRef = doc(db, "users", userToEdit.id);
      const updates: Partial<User> = { name: data.name };
      // Role is not updated here per requirement to "leave role management for later" in edit mode
      // If role were to be updated: updates.role = data.role;

      await updateDoc(userDocRef, updates);

      // Update Firebase Auth display name if it exists
      const authUser = auth.currentUser; // This is the admin, we need to find the target user in auth if possible.
                                        // Direct update of other users' Auth profiles from client-side is complex and generally not done.
                                        // This part might be better handled by a backend function for security.
                                        // For now, we'll focus on Firestore update.
      // A simple client-side update for displayName if the edited user IS the current auth user (e.g. self-edit)
      // but here, an admin is editing another user. This is more complex.
      // Firebase Admin SDK on a backend function would be needed to update arbitrary user's Auth profile.
      // For now, we'll just update Firestore and assume displayName might get out of sync or be updated by user themselves.

      toast({ title: "User Updated", description: `${data.name} has been updated.` });
      router.push("/admin/users");
    } catch (error) {
      console.error("Error updating user: ", error);
      toast({ title: "Update Failed", description: "Could not update user data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  if (error || !userToEdit) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit User" />
          <Card>
            <CardContent className="py-10 text-center text-destructive">
              <p>{error || "User data could not be loaded."}</p>
            </CardContent>
          </Card>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (adminUser?.role !== "Admin") {
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
          title={`Edit User: ${userToEdit.name || userToEdit.email}`}
          description="Update the user's details."
        />
        <UserForm
          mode="edit"
          existingUser={userToEdit}
          onSubmit={handleUpdateUser}
          isSaving={isSaving}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
