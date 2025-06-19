
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CustomerForm from "@/components/customers/CustomerForm";
import type { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card"; // Added import
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

// Placeholder data - replace with Firestore integration
const initialCustomers: Customer[] = [
  { id: "1", name: "Kwame Enterprise", phone: "+233 24 400 0001", email: "kwame@example.com", location: "Accra Central", createdAt: new Date() },
  { id: "2", name: "Adoma Services Ltd", phone: "+233 55 500 0002", email: "adoma@example.com", location: "Kumasi City Mall", createdAt: new Date() },
  { id: "3", name: "Tech Solutions Ghana", phone: "+233 20 600 0003", email: "tech@example.com", location: "Tema Community 1", createdAt: new Date() },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false); // For simulated async operations
  const { toast } = useToast();

  // Simulate fetching customers (e.g., from Firestore)
  useEffect(() => {
    // In a real app, you would fetch data here.
    // e.g., const unsubscribe = onSnapshot(collection(db, "customers"), ...);
    // return () => unsubscribe();
  }, []);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = async (data: Omit<Customer, "id" | "createdAt">) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (selectedCustomer) {
      // Update existing customer
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...selectedCustomer, ...data } : c));
      toast({ title: "Customer Updated", description: `${data.name} has been updated successfully.` });
    } else {
      // Add new customer
      const newCustomer: Customer = { ...data, id: Date.now().toString(), createdAt: new Date() };
      setCustomers([newCustomer, ...customers]);
      toast({ title: "Customer Added", description: `${data.name} has been added successfully.` });
    }
    setIsFormOpen(false);
    setSelectedCustomer(null);
    setIsLoading(false);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCustomers(customers.filter(c => c.id !== customerId));
    toast({ title: "Customer Deleted", description: "The customer has been deleted.", variant: "destructive" });
    setIsLoading(false);
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
            <Button onClick={handleAddCustomer} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
            />
          </div>
        </div>

        {isLoading && customers.length === 0 && <LoadingSpinner />}

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
                                {isLoading ? <LoadingSpinner size={16} /> : "Delete"}
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
                      {customers.length === 0 ? "No customers yet. Add your first customer!" : "No customers match your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          {/* DialogTrigger is handled by button clicks */}
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
