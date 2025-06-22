
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, FolderKanban, Search } from "lucide-react";
import type { Expense, ExpenseCategory } from "@/types";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  const { currentUser, currentBusiness } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const currency = currentBusiness?.currency || 'GHS';

  useEffect(() => {
    if (!currentUser?.businessId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const expensesQuery = query(
      collection(db, "expenses"),
      where("businessId", "==", currentUser.businessId),
      orderBy("date", "desc")
    );
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
      } as Expense));
      setExpenses(fetchedExpenses);
      if (isLoading) setIsLoading(false);
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      toast({ title: "Error", description: "Could not fetch expenses.", variant: "destructive" });
      setIsLoading(false);
    });

    const categoriesQuery = query(
      collection(db, "expenseCategories"),
      where("businessId", "==", currentUser.businessId),
      orderBy("name", "asc")
    );
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const fetchedCategories = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      } as ExpenseCategory));
      setCategories(fetchedCategories);
    }, (error) => {
      console.error("Error fetching expense categories: ", error);
      toast({ title: "Error", description: "Could not fetch expense categories.", variant: "destructive" });
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
    };
  }, [currentUser?.businessId, toast, isLoading]);

  const handleAddExpense = () => {
    setSelectedExpense(null);
    setIsFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };
  
  const handleDeleteExpense = async (expenseId: string) => {
      setIsDeleting(true);
      try {
          await deleteDoc(doc(db, "expenses", expenseId));
          toast({ title: "Expense Deleted", description: "The expense record has been deleted." });
      } catch (error) {
          console.error("Error deleting expense:", error);
          toast({ title: "Error", description: "Could not delete expense.", variant: "destructive" });
      } finally {
          setIsDeleting(false);
      }
  };

  const handleSaveExpense = async (data: Omit<Expense, "id" | "businessId" | "recordedBy" | "createdAt" | "updatedAt">) => {
    if (!currentUser?.businessId || !currentUser.id) {
        toast({ title: "Error", description: "Business context is missing.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    
    const sanitizedAmount = parseFloat(data.amount.toFixed(2));
    if (isNaN(sanitizedAmount)) {
        toast({ title: "Invalid Amount", description: "The amount entered is not a valid number.", variant: "destructive" });
        setIsSaving(false);
        return;
    }
    
    const expenseData = { 
      ...data, 
      amount: sanitizedAmount,
      businessId: currentUser.businessId, 
      recordedBy: currentUser.id 
    };

    try {
        if (selectedExpense) {
            const expenseDocRef = doc(db, "expenses", selectedExpense.id);
            await updateDoc(expenseDocRef, { ...expenseData, updatedAt: serverTimestamp() });
            toast({ title: "Expense Updated", description: "The expense record has been updated." });
        } else {
            await addDoc(collection(db, "expenses"), { ...expenseData, createdAt: serverTimestamp() });
            toast({ title: "Expense Recorded", description: "A new expense has been recorded." });
        }
        setIsFormOpen(false);
        setSelectedExpense(null);
    } catch (error) {
        console.error("Error saving expense:", error);
        toast({ title: "Save Failed", description: "Could not save expense data.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
  const displayedExpenses = expenses
    .map(exp => ({ ...exp, categoryName: categoryMap.get(exp.categoryId) || "Uncategorized" }))
    .filter(exp => 
        exp.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Expenses"
          description="Record and manage your business's operational expenses."
          actions={
             <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => router.push('/settings/expense-categories')} variant="outline">
                    <FolderKanban className="mr-2 h-5 w-5" /> Manage Categories
                </Button>
                <Button onClick={handleAddExpense} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <PlusCircle className="mr-2 h-5 w-5" /> Record New Expense
                </Button>
            </div>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by vendor, category, or description..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {isLoading && <LoadingSpinner fullPage />}
        
        {!isLoading && (
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Expense List</CardTitle>
                    <CardDescription>Overview of all recorded business expenses.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount ({currency})</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {displayedExpenses.length > 0 ? (
                            displayedExpenses.map((expense) => (
                            <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell>{format(expense.date, "dd MMM, yyyy")}</TableCell>
                                <TableCell className="font-medium">{expense.vendor}</TableCell>
                                <TableCell>{expense.categoryName}</TableCell>
                                <TableCell>{expense.description || "-"}</TableCell>
                                <TableCell className="text-right">{expense.amount.toFixed(2)}</TableCell>
                                <TableCell>{expense.paymentMethod}</TableCell>
                                <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" title="Edit Expense" onClick={() => handleEditExpense(expense)} disabled={isDeleting}>
                                    <Edit className="h-4 w-4 text-blue-600" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" title="Delete Expense" disabled={isDeleting}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this expense record.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                            onClick={() => handleDeleteExpense(expense.id)}
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
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match your search."}
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
                <ExpenseForm
                    expense={selectedExpense}
                    categories={categories}
                    onSave={handleSaveExpense}
                    setOpen={setIsFormOpen}
                    isSaving={isSaving}
                />
            )}
        </Dialog>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
