
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Edit, UserPlus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // No longer needed here if buttons set state directly
} from "@/components/ui/alert-dialog";

export default function AdminUsersPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "Admin" || !currentUser.businessId) {
      setIsLoading(false);
      setUsers([]);
      return;
    }

    setIsLoading(true);
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, where("businessId", "==", currentUser.businessId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(fetchedUsers.filter(user => user.id !== currentUser.id)); // Exclude current admin from list
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleAddUser = () => {
    router.push("/admin/users/new");
  };

  const handleEditUser = (userId: string) => {
    router.push(`/admin/users/${userId}/edit`);
  };

  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !currentUser?.businessId || currentUser?.role !== "Admin") {
      toast({ title: "Error", description: "Cannot delete user. Invalid conditions.", variant: "destructive" });
      setUserToDelete(null);
      return;
    }
    if (userToDelete.id === currentUser.id) {
        toast({ title: "Error", description: "Admin users cannot delete themselves.", variant: "destructive"});
        setUserToDelete(null);
        return;
    }


    setIsDeleting(true);
    try {
      const userDocRef = doc(db, "users", userToDelete.id);
      await updateDoc(userDocRef, {
        businessId: null, 
        role: "Staff" 
      });
      

      toast({ title: "User Removed", description: `${userToDelete.name || userToDelete.email} has been removed from the business.` });
      setUserToDelete(null); 
    } catch (error) {
      console.error("Error removing user from business: ", error);
      toast({ title: "Error", description: "Could not remove user from business.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };


  if (isLoading && currentUser?.role === "Admin") {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  if (currentUser?.role !== "Admin") {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Access Denied" />
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <ShieldAlert className="mr-2 h-6 w-6" />
                Permission Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>You do not have the necessary permissions to view this page. Please contact an administrator if you believe this is an error.</p>
            </CardContent>
          </Card>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="User Management"
          description="View and manage user accounts and permissions for your business."
          actions={
             <Button onClick={handleAddUser}>
              <UserPlus className="mr-2 h-5 w-5" /> Add New User
            </Button>
          }
        />
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Business Users</CardTitle>
            <CardDescription>List of users associated with your business.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                            variant={
                                user.role === "Admin" ? "destructive" :
                                user.role === "Accountant" ? "default" :
                                user.role === "Sales" ? "secondary" : 
                                "outline"
                            }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit User" onClick={() => handleEditUser(user.id)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Remove User" 
                          onClick={() => confirmDeleteUser(user)} 
                          disabled={isDeleting || user.id === currentUser.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No other users in this business yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => {if (!open) setUserToDelete(null)}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {userToDelete?.name || userToDelete?.email} from your business. Their account will still exist, but they will lose access to this business's data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeleting}
              >
                {isDeleting ? <LoadingSpinner size={16} /> : "Confirm Removal"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
