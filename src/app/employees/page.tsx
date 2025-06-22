
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search } from "lucide-react";
import type { Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { collection, doc, deleteDoc, onSnapshot, query, orderBy, Timestamp, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser?.businessId) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const employeesCollectionRef = collection(db, "employees");
    const q = query(
      employeesCollectionRef,
      where("businessId", "==", currentUser.businessId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const employeesData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          startDate: (data.startDate as Timestamp)?.toDate ? (data.startDate as Timestamp).toDate() : new Date(),
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as Employee;
      });
      setEmployees(employeesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching employees: ", error);
      toast({ title: "Error", description: "Could not fetch employees.", variant: "destructive" });
      setEmployees([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleAddEmployee = () => {
    router.push("/employees/new");
  };

  const handleEditEmployee = (employeeId: string) => {
    router.push(`/employees/${employeeId}/edit`);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    setIsDeleting(true);
    try {
      // TODO: Add check to prevent deletion if employee is part of a completed payroll run.
      await deleteDoc(doc(db, "employees", employeeId));
      toast({ title: "Employee Deleted", description: "The employee record has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting employee: ", error);
      toast({ title: "Error", description: "Could not delete employee data.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.email && employee.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Employee Management"
          description="Manage employee profiles and compensation details."
          actions={
            <Button onClick={handleAddEmployee} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New Employee
            </Button>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, role, or email..."
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
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Compensation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.role}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {employee.compensationType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                             <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                                {employee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditEmployee(employee.id)} title="Edit Employee">
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete Employee" disabled={isDeleting}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the employee record for "{employee.name}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEmployee(employee.id)}
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
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            {employees.length === 0 ? "No employees added yet." : "No employees match your search."}
                          </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
