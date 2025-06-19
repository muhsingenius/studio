
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import CustomerForm from "@/components/customers/CustomerForm";
import type { Customer } from "@/types";
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
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

// Define the type for data coming from CustomerForm
type CustomerFormInputs = Omit<Customer, "id" | "createdAt" | "businessId" | "createdBy">;


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Get currentUser from AuthContext

  useEffect(() => {
    if (!currentUser || !currentUser.businessId) {
      setCustomers([]); // Clear customers if no business context
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const customersCollectionRef = collection(db, "customers");
    const q = query(
      customersCollectionRef,
      where("businessId", "==", currentUser.businessId), // Filter by businessId
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const customersData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          location: data.location,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
          businessId: data.businessId,
          createdBy: data.createdBy,
        } as Customer;
      });
      setCustomers(customersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching customers: ", error);
      toast({ title: "Error", description: "Could not fetch customers.", variant: "destructive" });
      setCustomers([]); // Clear customers on error
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]); // Corrected dependencies: only currentUser and toast

  const handleAddCustomer = () => {
    if (!currentUser?.businessId) {
      toast({ title: "Action Denied", description: "Business context is missing. Cannot add customer.", variant: "destructive" });
      return;
    }
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = async (data: CustomerFormInputs) => {
    setIsLoading(true); // Consider setting a more specific saving loader if needed
    if (!currentUser || !currentUser.businessId || !currentUser.id) {
      toast({ title: "Error", description: "User or business context is missing. Cannot save customer.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      if (selectedCustomer) {
        const customerDocRef = doc(db, "customers", selectedCustomer.id);
        await updateDoc(customerDocRef, { ...data }); // data only contains form fields
        toast({ title: "Customer Updated", description: `${data.name} has been updated successfully.` });
      } else {
        await addDoc(collection(db, "customers"), {
          ...data,
          businessId: currentUser.businessId,
          createdBy: currentUser.id,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Customer Added", description: `${data.name} has been added successfully.` });
      }
      setIsFormOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Error saving customer: ", error);
      toast({ title: "Error", description: "Could not save customer data to Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false); // Ensure main page loading is false if it was set
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    // Consider a specific deleting loader, not the main page setIsLoading
    // For now, this is okay as it's a quick operation.
    // setIsLoading(true); 
    try {
      const customerDocRef = doc(db, "customers", customerId);
      await deleteDoc(customerDocRef);
      toast({ title: "Customer Deleted", description: "The customer has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting customer: ", error);
      toast({ title: "Error", description: "Could not delete customer from Firestore.", variant: "destructive" });
    } finally {
      // setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Customer Management"
          description="View, add, and manage your customer records."
          actions={
            <Button onClick={handleAddCustomer} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!currentUser?.businessId || isLoading}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Customer
            </Button>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers by name, phone, or email..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!currentUser?.businessId || isLoading}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.email || "N/A"}</TableCell>
                        <TableCell>{customer.location}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCustomer(customer)} title="Edit Customer">
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete Customer">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the customer "{customer.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          {!currentUser?.businessId ? "Business context not loaded. Please ensure business setup is complete." :
                          customers.length === 0 ? "No customers yet. Add your first customer!" : "No customers match your search."}
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {isFormOpen && (
            <CustomerForm
              customer={selectedCustomer}
              onSave={handleSaveCustomer}
              setOpen={setIsFormOpen}
            />
          )}
        </Dialog>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}

