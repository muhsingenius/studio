
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import type { OtherIncomeRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  where
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function OtherIncomePage() {
  const [incomeRecords, setIncomeRecords] = useState<OtherIncomeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser || !currentUser.businessId) {
      setIncomeRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const incomeCollectionRef = collection(db, "otherIncome");
    const q = query(
      incomeCollectionRef,
      where("businessId", "==", currentUser.businessId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const recordsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          dateReceived: (data.dateReceived as Timestamp)?.toDate ? (data.dateReceived as Timestamp).toDate() : new Date(),
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as OtherIncomeRecord;
      });
      setIncomeRecords(recordsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching other income records: ", error);
      toast({ title: "Error", description: "Could not fetch income records.", variant: "destructive" });
      setIncomeRecords([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleAddIncome = () => {
    router.push("/other-income/new");
  };

  const handleEditIncome = (recordId: string) => {
    router.push(`/other-income/${recordId}/edit`);
  };

  const handleDeleteIncome = async (recordId: string) => {
    setIsDeleting(true);
    try {
      const recordDocRef = doc(db, "otherIncome", recordId);
      await deleteDoc(recordDocRef);
      toast({ title: "Income Record Deleted", description: "The income record has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting income record: ", error);
      toast({ title: "Error", description: "Could not delete income record.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = incomeRecords.filter(record =>
    record.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Other Income"
          description="Manage income records from sources other than invoices."
          actions={
            <Button onClick={handleAddIncome} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              <PlusCircle className="mr-2 h-5 w-5" /> Record New Income
            </Button>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by source, description, or payment method..."
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Received</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (GHS)</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <TableRow 
                        key={record.id} 
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>{format(new Date(record.dateReceived), "dd MMM, yyyy")}</TableCell>
                        <TableCell className="font-medium">{record.source}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="text-right">{record.amount.toFixed(2)}</TableCell>
                        <TableCell>{record.paymentMethod}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditIncome(record.id)} title="Edit Record">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete Record" disabled={isDeleting}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this income record from "{record.source}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteIncome(record.id)}
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
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          {incomeRecords.length === 0 ? "No other income recorded yet." : "No records match your search."}
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
