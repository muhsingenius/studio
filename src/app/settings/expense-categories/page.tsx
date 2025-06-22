
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import type { ExpenseCategory } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Dialog } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  where
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import ExpenseCategoryForm from "@/components/settings/ExpenseCategoryForm";


export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || !currentUser.businessId) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const categoriesCollectionRef = collection(db, "expenseCategories");
    const q = query(
        categoriesCollectionRef, 
        where("businessId", "==", currentUser.businessId), 
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as ExpenseCategory;
      });
      setCategories(categoriesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching expense categories: ", error);
      toast({ title: "Error", description: "Could not fetch expense categories.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleSaveCategory = async (data: { name: string }) => {
    if (!currentUser || !currentUser.businessId) {
        toast({ title: "Error", description: "User or business context is missing.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
      if (selectedCategory) {
        const categoryDocRef = doc(db, "expenseCategories", selectedCategory.id);
        await updateDoc(categoryDocRef, { name: data.name });
        toast({ title: "Category Updated", description: `"${data.name}" has been updated.` });
      } else {
        await addDoc(collection(db, "expenseCategories"), {
          name: data.name,
          businessId: currentUser.businessId,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Category Added", description: `"${data.name}" has been added.` });
      }
      setIsFormOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error("Error saving expense category: ", error);
      toast({ title: "Error", description: "Could not save category data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setIsDeleting(true);
    try {
      // TODO: Add check to see if category is in use by any expenses before deleting.
      const categoryDocRef = doc(db, "expenseCategories", categoryId);
      await deleteDoc(categoryDocRef);
      toast({ title: "Category Deleted", description: "The expense category has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting category: ", error);
      toast({ title: "Error", description: "Could not delete category.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Expense Categories"
          description="Manage categories for your business expenses."
          actions={
            <Button onClick={handleAddCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Category
            </Button>
          }
        />

        {isLoading && <LoadingSpinner fullPage />}

        {!isLoading && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Category List</CardTitle>
              <CardDescription>All available expense categories for your business.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <TableRow key={category.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{format(new Date(category.createdAt), "PPP")}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} title="Edit Category" disabled={isSaving || isDeleting}>
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete Category" disabled={isSaving || isDeleting}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the category "{category.name}". Expenses in this category will no longer be classified.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteCategory(category.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? <LoadingSpinner size={16} /> : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                          No expense categories created yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {isFormOpen && (
            <ExpenseCategoryForm
              category={selectedCategory}
              onSave={handleSaveCategory}
              setOpen={setIsFormOpen}
              isSaving={isSaving}
            />
          )}
        </Dialog>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
