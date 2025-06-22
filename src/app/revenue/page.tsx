
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import type { RevenueRecord } from "@/types";
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

export default function RevenuePage() {
  const [revenueRecords, setRevenueRecords] = useState<RevenueRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { currentUser, currentBusiness } = useAuth();
  const router = useRouter();

  const currency = currentBusiness?.currency || 'GHS';

  useEffect(() => {
    if (!currentUser || !currentUser.businessId) {
      setRevenueRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const revenueCollectionRef = collection(db, "revenueRecords");
    const q = query(
      revenueCollectionRef,
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
        } as RevenueRecord;
      });
      setRevenueRecords(recordsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching revenue records: ", error);
      toast({ title: "Error", description: "Could not fetch revenue records.", variant: "destructive" });
      setRevenueRecords([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleAddRevenue = () => {
    router.push("/revenue/new");
  };

  const handleEditRevenue = (recordId: string) => {
    router.push(`/revenue/${recordId}/edit`);
  };

  const handleDeleteRevenue = async (recordId: string) => {
    setIsDeleting(true);
    try {
      const recordDocRef = doc(db, "revenueRecords", recordId);
      await deleteDoc(recordDocRef);
      toast({ title: "Revenue Record Deleted", description: "The revenue record has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting revenue record: ", error);
      toast({ title: "Error", description: "Could not delete revenue record.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = revenueRecords.filter(record =>
    record.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Other Revenue"
          description="Manage income records from sources other than invoices."
          actions={
            <Button onClick={handleAddRevenue} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              <PlusCircle className="mr-2 h-5 w-5" /> Record New Revenue
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
                    <TableHead className="text-right">Amount ({currency})</TableHead>
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
                          <Button variant="ghost" size="icon" onClick={() => handleEditRevenue(record.id)} title="Edit Record">
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
                                  onClick={() => handleDeleteRevenue(record.id)}
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
                          {revenueRecords.length === 0 ? "No other income recorded yet." : "No records match your search."}
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
