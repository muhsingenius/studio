"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Role } from "@/types"; // Assuming User and Role types are defined
import { Button } from "@/components/ui/button";
import { ShieldAlert, Edit, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext"; // To check if current user is Admin
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// Placeholder data - replace with Firestore integration
const sampleUsers: User[] = [
  { id: "user1", email: "admin@example.com", name: "Admin User", role: "Admin" },
  { id: "user2", email: "accountant@example.com", name: "Accountant One", role: "Accountant" },
  { id: "user3", email: "staff@example.com", name: "Staff Member", role: "Staff" },
];

export default function AdminUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching users - In a real app, fetch from Firestore
    // and ensure only Admins can access this data via Firestore rules.
    setIsLoading(true);
    setTimeout(() => {
      if (currentUser?.role === "Admin") {
        setUsers(sampleUsers);
      }
      setIsLoading(false);
    }, 1000);
  }, [currentUser]);


  if (isLoading) {
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
          description="View and manage user accounts and permissions."
          actions={
             <Button disabled> {/* Placeholder for Add User functionality */}
              <UserPlus className="mr-2 h-5 w-5" /> Add New User (Coming Soon)
            </Button>
          }
        />
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>List of all registered users in the system.</CardDescription>
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
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "Admin" ? "destructive" : (user.role === "Accountant" ? "default" : "secondary")}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Edit User Permissions" disabled> {/* Placeholder */}
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
