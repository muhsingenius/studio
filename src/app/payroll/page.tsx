
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import type { PayrollRun } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, Timestamp, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser?.businessId) {
      setRuns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const runsCollectionRef = collection(db, "payrollRuns");
    const q = query(
      runsCollectionRef,
      where("businessId", "==", currentUser.businessId),
      orderBy("completedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const runsData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          periodStartDate: (data.periodStartDate as Timestamp).toDate(),
          periodEndDate: (data.periodEndDate as Timestamp).toDate(),
          paymentDate: (data.paymentDate as Timestamp).toDate(),
          completedAt: (data.completedAt as Timestamp).toDate(),
        } as PayrollRun;
      });
      setRuns(runsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching payroll runs: ", error);
      toast({ title: "Error", description: "Could not fetch payroll runs.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);
  
  const filteredRuns = runs.filter(run => 
    format(run.periodEndDate, "MMMM yyyy").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Payroll History"
          description="View past payroll runs and start new ones."
          actions={
            <Button onClick={() => router.push('/payroll/new')} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <PlusCircle className="mr-2 h-5 w-5" /> Start New Payroll Run
            </Button>
          }
        />
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by month and year (e.g., May 2024)..."
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
                      <TableHead>Pay Period</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Total Cost (GHS)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRuns.length > 0 ? (
                      filteredRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">
                            {format(run.periodStartDate, "d MMM")} - {format(run.periodEndDate, "d MMM, yyyy")}
                          </TableCell>
                          <TableCell>{format(run.paymentDate, "PPP")}</TableCell>
                          <TableCell>{run.totalCostToBusiness.toFixed(2)}</TableCell>
                          <TableCell><Badge>{run.status}</Badge></TableCell>
                           <TableCell>
                             <Button variant="outline" size="sm">View Details</Button>
                           </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                           No payroll runs found.
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
