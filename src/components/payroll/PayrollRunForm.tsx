
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { Employee, PayrollSettings, PayrollItem } from "@/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { calculateSSNIT, calculatePAYE } from "@/lib/payroll-calculator";
import LoadingSpinner from "../shared/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface PayrollRunFormProps {
    employees: Employee[];
    settings: PayrollSettings;
    onFinalize: (data: any) => Promise<void>;
}

type FormValues = {
    period: Date;
    paymentDate: Date;
    items: Array<{
        employeeId: string;
        name: string;
        compensationType: 'Salary' | 'Wage';
        grossSalary?: number;
        wageRate?: number;
        wagePeriod?: 'Hour' | 'Day';
        unitsWorked: string; // for waged employees
    }>;
};

export default function PayrollRunForm({ employees, settings, onFinalize }: PayrollRunFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const { control, register, watch, handleSubmit, formState: { errors } } = useForm<FormValues>({
        defaultValues: {
            period: new Date(),
            paymentDate: new Date(),
            items: employees.map(e => ({
                employeeId: e.id,
                name: e.name,
                compensationType: e.compensationType,
                grossSalary: e.grossSalary,
                wageRate: e.wageRate,
                wagePeriod: e.wagePeriod,
                unitsWorked: "",
            })),
        }
    });

    const { fields } = useFieldArray({ control, name: "items" });
    const watchedItems = watch("items");

    const payrollData = useMemo(() => {
        const results: (PayrollItem & { unitsWorked: string })[] = [];
        let totalGrossPay = 0, totalEmployeeSSNIT = 0, totalEmployerSSNIT = 0, totalPAYE = 0, totalNetPay = 0;

        watchedItems.forEach(item => {
            let grossPay = 0;
            if (item.compensationType === 'Salary') {
                grossPay = item.grossSalary || 0;
            } else {
                grossPay = (item.wageRate || 0) * (parseFloat(item.unitsWorked) || 0);
            }

            const { employeeSSNIT, employerSSNIT } = calculateSSNIT(grossPay, settings.ssnitRates);
            const taxableIncome = grossPay - employeeSSNIT;
            const paye = calculatePAYE(taxableIncome, settings.payeBrackets);
            const netPay = taxableIncome - paye;
            
            results.push({
                employeeId: item.employeeId,
                employeeName: item.name,
                grossPay, employeeSSNIT, taxableIncome, paye, netPay,
                unitsWorked: item.unitsWorked,
            });

            totalGrossPay += grossPay;
            totalEmployeeSSNIT += employeeSSNIT;
            totalEmployerSSNIT += employerSSNIT;
            totalPAYE += paye;
            totalNetPay += netPay;
        });

        return {
            items: results,
            totals: {
                totalGrossPay, totalEmployeeSSNIT, totalEmployerSSNIT, totalPAYE, totalNetPay,
                totalCostToBusiness: totalGrossPay + totalEmployerSSNIT,
            }
        };
    }, [watchedItems, settings]);

    const handleFormSubmit = (data: FormValues) => {
        setIsSaving(true);
        
        const periodStartDate = startOfMonth(data.period);
        const periodEndDate = endOfMonth(data.period);

        if (payrollData.totals.totalGrossPay <= 0) {
            toast({title: "Cannot Finalize", description: "Total payroll amount is zero. Please input hours/days for waged employees.", variant: "destructive"});
            setIsSaving(false);
            return;
        }

        const finalData = {
            periodStartDate,
            periodEndDate,
            paymentDate: data.paymentDate,
            items: payrollData.items.map(({ unitsWorked, ...rest }) => rest), // Exclude transient form data
            ...payrollData.totals,
        };
        onFinalize(finalData).finally(() => setIsSaving(false));
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Run Payroll</CardTitle>
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                        <div>
                             <Label>For Pay Period</Label>
                             <Controller name="period" control={control} render={({ field }) => (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "MMMM yyyy") : <span>Pick a month</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                </Popover>
                             )} />
                        </div>
                        <div>
                            <Label>Payment Date</Label>
                             <Controller name="paymentDate" control={control} render={({ field }) => (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                </Popover>
                             )} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Input</TableHead>
                                <TableHead>Gross Pay</TableHead>
                                <TableHead>Employee SSNIT</TableHead>
                                <TableHead>PAYE</TableHead>
                                <TableHead>Net Pay</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell>{field.name}</TableCell>
                                    <TableCell>
                                        {field.compensationType === 'Wage' ? (
                                            <Input placeholder={`Units (per ${field.wagePeriod})`} type="number" {...register(`items.${index}.unitsWorked`)} />
                                        ) : (
                                            <span className="text-muted-foreground">Salary</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{payrollData.items[index]?.grossPay.toFixed(2)}</TableCell>
                                    <TableCell>{payrollData.items[index]?.employeeSSNIT.toFixed(2)}</TableCell>
                                    <TableCell>{payrollData.items[index]?.paye.toFixed(2)}</TableCell>
                                    <TableCell className="font-bold">{payrollData.items[index]?.netPay.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-end space-y-2 pt-4 border-t">
                    <div className="w-full md:w-1/3 space-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Gross Pay:</span> <span>{payrollData.totals.totalGrossPay.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Net Pay:</span> <span>{payrollData.totals.totalNetPay.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold"><span className="">Total Cost to Business:</span> <span>GHS {payrollData.totals.totalCostToBusiness.toFixed(2)}</span></div>
                    </div>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <LoadingSpinner className="mr-2"/>}
                        Finalize & Record Payroll
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
