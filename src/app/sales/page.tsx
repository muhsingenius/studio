
"use client";

import { useState, useEffect, useMemo } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search, Eye as ViewIcon } from "lucide-react";
import Link from "next/link";
import type { DirectSale } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added AlertDialogTrigger here
} from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  where,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { useRouter } from "next/navigation"; 
import { useAuth } from "@/contexts/AuthContext";

export default function DirectSalesPage() {
  const [sales, setSales] = useState<DirectSale[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<DirectSale | null>(null);
  const { toast } = useToast();
  const router = useRouter(); 
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || !currentUser.businessId) {
      setSales([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const salesCollectionRef = collection(db, "directSales");
    const q = query(
      salesCollectionRef, 
      where("businessId", "==", currentUser.businessId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(data.date),
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as DirectSale;
      });
      setSales(salesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching direct sales: ", error);
      toast({ title: "Error", description: "Could not fetch direct sales.", variant: "destructive" });
      setSales([]); 
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const confirmDeleteSale = (sale: DirectSale) => {
    setSaleToDelete(sale);
  };

  const handleDeleteSale = async () => {
    if (!saleToDelete || !currentUser?.businessId) {
      toast({ title: "Error", description: "Cannot delete sale. Invalid conditions.", variant: "destructive" });
      setSaleToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      // IMPORTANT: Deleting a sale should ideally reverse inventory changes.
      // This is complex and requires knowing the original item quantities.
      // For this iteration, we will just delete the sale record.
      // A more robust solution would involve a transaction to:
      // 1. Read the sale items.
      // 2. For each item, increment inventory.
      // 3. Delete the sale document.

      await runTransaction(db, async (transaction) => {
        const saleDocRef = doc(db, "directSales", saleToDelete.id);
        const saleSnapshot = await transaction.get(saleDocRef);
        if (!saleSnapshot.exists()) {
            throw new Error("Sale document not found.");
        }
        const saleData = saleSnapshot.data() as DirectSale;

        // Reverse inventory changes
        for (const saleItem of saleData.items) {
            if (saleItem.itemId) {
                // Assuming items collection exists and items have 'trackInventory' and 'quantityOnHand'
                const itemRef = doc(db, "items", saleItem.itemId);
                const itemSnap = await transaction.get(itemRef);
                if (itemSnap.exists()) {
                    const itemData = itemSnap.data();
                    if (itemData.trackInventory) {
                        const currentQuantity = itemData.quantityOnHand || 0;
                        transaction.update(itemRef, { quantityOnHand: currentQuantity + saleItem.quantity });
                    }
                } else {
                    console.warn(`Item with ID ${saleItem.itemId} not found during sale deletion. Inventory not adjusted.`);
                }
            }
        }
        transaction.delete(saleDocRef);
      });


      toast({ title: "Sale Deleted", description: `Sale ${saleToDelete.saleNumber} has been deleted and inventory adjusted.` });
      setSaleToDelete(null);
    } catch (error) {
      console.error("Error deleting sale: ", error);
      toast({ title: "Error", description: "Could not delete sale. " + (error instanceof Error ? error.message : ""), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewSale = (saleId: string) => {
    router.push(`/sales/${saleId}`);
  };
  
  const handleEditSale = (saleId: string) => {
    // Editing sales might be restricted, especially if they impact inventory.
    // For now, direct to an edit page which might have limited functionality.
    router.push(`/sales/${saleId}/edit`);
  };

  const filteredSales = sales.filter(sale =>
    sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    sale.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Direct Sales"
          description="Manage all your direct sale transactions."
          actions={
            <Link href="/sales/new" passHref>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!currentUser?.businessId || isLoading}>
                <PlusCircle className="mr-2 h-5 w-5" /> Record New Sale
              </Button>
            </Link>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Sale #, Customer, or Payment Method..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!currentUser?.businessId || isLoading}
            />
          </div>
        </div>

        {isLoading && sales.length === 0 && <LoadingSpinner fullPage />}

        <Card className="shadow-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount (GHS)</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isLoading && filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <TableRow 
                      key={sale.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleViewSale(sale.id)}
                    >
                      <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                      <TableCell>{format(new Date(sale.date), "dd MMM, yyyy")}</TableCell>
                      <TableCell>{sale.customerName || "N/A"}</TableCell>
                      <TableCell>GHS {sale.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{sale.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="View Sale"
                          onClick={(e) => { e.stopPropagation(); handleViewSale(sale.id); }}
                        >
                           <ViewIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Edit Sale" 
                          onClick={(e) => { e.stopPropagation(); handleEditSale(sale.id); }}
                        >
                            <Edit className="h-4 w-4 text-yellow-600" />
                        </Button>
                        <AlertDialog open={!!saleToDelete && saleToDelete.id === sale.id} onOpenChange={(open) => !open && setSaleToDelete(null)}>
                            <AlertDialogTrigger asChild>
                                <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Delete Sale" 
                                disabled={isDeleting}
                                onClick={(e) => { e.stopPropagation(); confirmDeleteSale(sale);}} 
                                >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete sale {sale.saleNumber} and attempt to adjust inventory.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteSale}
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
                   !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                       {!currentUser?.businessId ? "Business context not loaded." :
                       sales.length === 0 ? "No direct sales recorded yet." : "No sales match your search."}
                      </TableCell>
                    </TableRow>
                   )
                )}
              </TableBody>
            </Table>
            {isLoading && sales.length > 0 && <div className="p-4 text-center"><LoadingSpinner /></div>}
          </div>
        </Card>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}

