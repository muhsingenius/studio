"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Expense } from "@/types";
import { format } from "date-fns";

// Placeholder data
const sampleExpenses: Expense[] = [
  { id: "exp1", vendor: "MTN Ghana", category: "Utilities", description: "Monthly internet bill", amount: 250, date: new Date("2024-07-15"), paymentMethod: "Mobile Money", createdAt: new Date() },
  { id: "exp2", vendor: "Stationery Plus", category: "Office Supplies", amount: 85.50, date: new Date("2024-07-20"), paymentMethod: "Cash", createdAt: new Date() },
  { id: "exp3", vendor: "Goil Fuel Station", category: "Transportation", amount: 150, date: new Date("2024-07-22"), paymentMethod: "Cash", createdAt: new Date() },
];


export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>(sampleExpenses);
  // TODO: Add state for form dialog, selected expense for editing, etc.

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Expenses"
          description="Record and manage your business expenses."
          actions={
            <Button /* onClick={handleAddExpense} */ className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-5 w-5" /> Record New Expense
            </Button>
          }
        />
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Expense List</CardTitle>
            <CardDescription>Overview of all recorded business expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Add search/filter controls here */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (GHS)</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>{format(new Date(expense.date), "dd MMM, yyyy")}</TableCell>
                        <TableCell className="font-medium">{expense.vendor}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description || "-"}</TableCell>
                        <TableCell className="text-right">{expense.amount.toFixed(2)}</TableCell>
                        <TableCell>{expense.paymentMethod}</TableCell>
                        <TableCell className="text-right space-x-1">
                           <Button variant="ghost" size="icon" title="Edit Expense" /* onClick={() => handleEditExpense(expense)} */ >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete Expense" /* onClick={() => handleDeleteExpense(expense.id)} */>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No expenses recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* TODO: Add Dialog for ExpenseForm component here */}

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
