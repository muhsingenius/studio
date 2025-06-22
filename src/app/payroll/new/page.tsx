
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import type { Employee, PayrollSettings, Expense } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import PayrollRunForm from "@/components/payroll/PayrollRunForm";
import { useRouter } from "next/navigation";

// Default settings if nothing is found in Firestore
const defaultPayrollSettings: Omit<PayrollSettings, "id" | "businessId"> = {
  ssnitRates: {
    employeeContribution: 0.055,
    employerContribution: 0.13,
  },
  payeBrackets: [
    { id: "1", from: 0, to: 490, rate: 0 },
    { id: "2", from: 490, to: 600, rate: 0.05 },
    { id: "3", from: 600, to: 730, rate: 0.10 },
    { id: "4", from: 730, to: 3730, rate: 0.175 },
    { id: "5", from: 3730, to: 20730, rate: 0.25 },
    { id: "6", from: 20730, to: 50730, rate: 0.30 },
    { id: "7", from: 50730, to: null, rate: 0.35 },
  ],
};

export default function NewPayrollPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [settings, setSettings] = useState<PayrollSettings | null>(null);
    const [expenseCategories, setExpenseCategories] = useState<{id: string, name: string}[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!currentUser?.businessId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const settingsDocRef = doc(db, "businesses", currentUser.businessId, "settings", "payroll");
            const settingsSnap = await getDoc(settingsDocRef);
            if (settingsSnap.exists()) {
                setSettings({ id: 'payroll', businessId: currentUser.businessId, ...settingsSnap.data() } as PayrollSettings);
            } else {
                toast({ title: "Using Default Settings", description: "No custom payroll settings found. Please configure them.", variant: "default" });
                setSettings({ id: 'payroll', businessId: currentUser.businessId, ...defaultPayrollSettings });
            }

            const employeesQuery = query(collection(db, "employees"), where("businessId", "==", currentUser.businessId), where("isActive", "==", true));
            const employeesSnap = await getDocs(employeesQuery);
            setEmployees(employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));

            const categoriesQuery = query(collection(db, "expenseCategories"), where("businessId", "==", currentUser.businessId));
            const categoriesSnap = await getDocs(categoriesQuery);
            setExpenseCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name as string })));

        } catch (error) {
            console.error("Error fetching data for payroll run:", error);
            toast({ title: "Error", description: "Could not load necessary data for payroll.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [currentUser?.businessId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleFinalize = async (payrollRunData: any) => {
        if (!currentUser?.businessId) return;

        try {
            // Find or create 'Salaries & Wages' expense category
            let salaryCategoryId = expenseCategories.find(c => c.name.toLowerCase() === 'salaries & wages')?.id;
            if (!salaryCategoryId) {
                const newCategoryRef = await addDoc(collection(db, "expenseCategories"), {
                    name: "Salaries & Wages",
                    businessId: currentUser.businessId,
                    createdAt: serverTimestamp(),
                });
                salaryCategoryId = newCategoryRef.id;
            }

            // Create expense record
            const expenseRecord: Omit<Expense, "id" | "createdAt"> = {
                businessId: currentUser.businessId,
                date: payrollRunData.paymentDate,
                vendor: "Company Payroll",
                categoryId: salaryCategoryId,
                description: `Payroll for ${format(payrollRunData.periodStartDate, 'MMM yyyy')}`,
                amount: payrollRunData.totalCostToBusiness,
                paymentMethod: 'Bank Transfer', // Default for payroll
                recordedBy: currentUser.id,
            };
            const expenseDocRef = await addDoc(collection(db, "expenses"), expenseRecord);

            // Create payroll run record
            const payrollRunRecord = {
                ...payrollRunData,
                businessId: currentUser.businessId,
                status: 'Completed',
                completedBy: currentUser.id,
                completedAt: serverTimestamp(),
                expenseId: expenseDocRef.id,
            };
            await addDoc(collection(db, "payrollRuns"), payrollRunRecord);

            toast({ title: "Payroll Finalized", description: "Payroll run has been completed and expense recorded." });
            router.push('/payroll');

        } catch (error) {
            console.error("Error finalizing payroll:", error);
            toast({ title: "Finalization Failed", description: "Could not finalize the payroll run.", variant: "destructive" });
        }
    };

    return (
        <AuthGuard>
            <AuthenticatedLayout>
                <PageHeader title="New Payroll Run" description="Calculate and process payroll for your employees." />
                {isLoading && <LoadingSpinner fullPage />}
                {!isLoading && settings && employees.length > 0 && (
                    <PayrollRunForm 
                        employees={employees}
                        settings={settings}
                        onFinalize={handleFinalize}
                    />
                )}
                 {!isLoading && (employees.length === 0 || !settings) && (
                    <div className="text-center text-muted-foreground p-8 border rounded-lg">
                        <p>Cannot start a payroll run.</p>
                        {employees.length === 0 && <p>You have no active employees. Please add employees first.</p>}
                        {!settings && <p>Payroll settings are not configured.</p>}
                    </div>
                 )}
            </AuthenticatedLayout>
        </AuthGuard>
    );
}
