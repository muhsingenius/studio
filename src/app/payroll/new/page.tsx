
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import type { Employee, PayrollSettings, Expense, Business } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import PayrollRunForm from "@/components/payroll/PayrollRunForm";
import { useRouter } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


const defaultPayrollSettings: PayrollSettings = {
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
    const [filterType, setFilterType] = useState<'all' | 'salary' | 'wage'>('all');

    const fetchData = useCallback(async () => {
        if (!currentUser?.businessId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const businessDocRef = doc(db, "businesses", currentUser.businessId);
            const businessSnap = await getDoc(businessDocRef);
            if (businessSnap.exists()) {
                const businessData = businessSnap.data() as Business;
                if (businessData.settings?.payroll) {
                    setSettings(businessData.settings.payroll);
                } else {
                    toast({ title: "Using Default Settings", description: "No custom payroll settings found. Please configure them.", variant: "default" });
                    setSettings(defaultPayrollSettings);
                }
            } else {
                toast({ title: "Error", description: "Business details not found.", variant: "destructive" });
                setSettings(defaultPayrollSettings);
            }

            const employeesQuery = query(collection(db, "employees"), where("businessId", "==", currentUser.businessId));
            const employeesSnap = await getDocs(employeesQuery);
            const allEmployees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
            const activeEmployees = allEmployees.filter(e => e.isActive !== false);
            setEmployees(activeEmployees);

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
    
    const filteredEmployees = useMemo(() => {
        if (filterType === 'all') {
            return employees;
        }
        const compensationType = filterType.charAt(0).toUpperCase() + filterType.slice(1);
        return employees.filter(e => e.compensationType === compensationType);
    }, [employees, filterType]);
    
    const handleFinalize = async (payrollRunData: any) => {
        if (!currentUser?.businessId) return;

        try {
            let salaryCategoryId = expenseCategories.find(c => c.name.toLowerCase() === 'salaries & wages')?.id;
            if (!salaryCategoryId) {
                const newCategoryRef = await addDoc(collection(db, "expenseCategories"), {
                    name: "Salaries & Wages",
                    businessId: currentUser.businessId,
                    createdAt: serverTimestamp(),
                });
                salaryCategoryId = newCategoryRef.id;
            }

            const expenseRecord: Omit<Expense, "id" | "createdAt"> = {
                businessId: currentUser.businessId,
                date: payrollRunData.paymentDate,
                vendor: "Company Payroll",
                categoryId: salaryCategoryId,
                description: `Payroll for ${format(payrollRunData.periodStartDate, 'MMM dd')} - ${format(payrollRunData.periodEndDate, 'dd, yyyy')}`,
                amount: payrollRunData.totalCostToBusiness,
                paymentMethod: 'Bank Transfer',
                recordedBy: currentUser.id,
            };
            const expenseDocRef = await addDoc(collection(db, "expenses"), expenseRecord);

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
                <PageHeader title="New Payroll Run" description="Select a group and process payroll for your employees." />

                <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                        <TabsTrigger value="all">All Employees</TabsTrigger>
                        <TabsTrigger value="salary">Salary Only</TabsTrigger>
                        <TabsTrigger value="wage">Wage Only</TabsTrigger>
                    </TabsList>
                </Tabs>
                
                <div className="mt-4">
                    {isLoading && <LoadingSpinner fullPage />}
                    {!isLoading && settings && employees.length > 0 && (
                        <PayrollRunForm 
                            employees={filteredEmployees}
                            settings={settings}
                            onFinalize={handleFinalize}
                            filterType={filterType}
                        />
                    )}
                    {!isLoading && employees.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 border rounded-lg mt-4">
                            <p>You have no active employees. Please add employees first.</p>
                        </div>
                    )}
                    {!isLoading && !settings && !employees.length && (
                        <div className="text-center text-muted-foreground p-8 border rounded-lg mt-4">
                        <p>Payroll settings are not configured.</p>
                        </div>
                    )}
                </div>
            </AuthenticatedLayout>
        </AuthGuard>
    );
}
