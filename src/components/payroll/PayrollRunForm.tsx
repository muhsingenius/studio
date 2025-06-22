
"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import type { Employee, PayrollSettings, PayrollItem } from "@/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { calculateSSNIT, calculatePAYE } from "@/lib/payroll-calculator";
import LoadingSpinner from "../shared/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import type { DateRange } from "react-day-picker";

interface PayrollRunFormProps {
    employees: Employee[];
    settings: PayrollSettings;
    onFinalize: (data: any) => Promise<void>;
    filterType: 'all' | 'salary' | 'wage';
}

type FormValues = {
    periodRange: DateRange | undefined;
    paymentDate: Date;
    items: Array<{
        employeeId: string;
        name: string;
        compensationType: 'Salary' | 'Wage';
        grossSalary?: number;
        wageRate?: number;
        wagePeriod?: 'Hour' | 'Day';
        unitsWorked: string;
    }>;
};

export default function PayrollRunForm({ employees, settings, onFinalize, filterType }: PayrollRunFormProps) {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const getDefaultDateRange = useCallback(() => {
        const today = new Date();
        if (filterType === 'wage') {
            return { from: startOfMonth(today), to: addDays(startOfMonth(today), 14) };
        }
        return { from: today, to: today };
    }, [filterType]);

    const { control, register, watch, handleSubmit, formState: { errors }, setValue, reset } = useForm<FormValues>({
        defaultValues: {
            periodRange: getDefaultDateRange(),
            paymentDate: new Date(),
            items: [],
        }
    });

    const { fields, replace } = useFieldArray({ control, name: "items" });

    useEffect(() => {
        const employeeItems = employees.map(e => ({
            employeeId: e.id,
            name: e.name,
            compensationType: e.compensationType,
            grossSalary: e.grossSalary || 0,
            wageRate: e.wageRate || 0,
            wagePeriod: e.wagePeriod,
            unitsWorked: "",
        }));
        replace(employeeItems);
    }, [employees, replace]);

    useEffect(() => {
        reset({
            periodRange: getDefaultDateRange(),
            paymentDate: new Date(),
            items: [],
        });
    }, [filterType, getDefaultDateRange, reset]);

    const watchedItems = watch("items");
    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    const payrollData = useMemo(() => {
        const results: (PayrollItem & { unitsWorked: string })[] = [];
        const totals = {
            totalGrossPay: 0,
            totalEmployeeSSNIT: 0,
            totalEmployerSSNIT: 0,
            totalPAYE: 0,
            totalNetPay: 0,
            totalCostToBusiness: 0,
        };

        if (!watchedItems || watchedItems.length === 0 || !employeeMap.size) {
            return { items: [], totals };
        }

        watchedItems.forEach((formItem) => {
            const originalEmployee = employeeMap.get(formItem.employeeId);
            if (!originalEmployee) return;

            let grossPay = 0;
            if (formItem.compensationType === 'Salary') {
                grossPay = originalEmployee.grossSalary || 0;
            } else {
                const rate = originalEmployee.wageRate || 0;
                const units = parseFloat(formItem.unitsWorked) || 0;
                grossPay = rate * units;
            }

            const { employeeSSNIT, employerSSNIT } = calculateSSNIT(grossPay, settings.ssnitRates);
            const taxableIncome = grossPay - employeeSSNIT;
            const paye = calculatePAYE(taxableIncome, settings.payeBrackets);
            const netPay = taxableIncome - paye;
            
            results.push({
                employeeId: formItem.employeeId,
                employeeName: formItem.name,
                grossPay, employeeSSNIT, taxableIncome, paye, netPay,
                unitsWorked: formItem.unitsWorked,
            });

            totals.totalGrossPay += grossPay;
            totals.totalEmployeeSSNIT += employeeSSNIT;
            totals.totalEmployerSSNIT += employerSSNIT;
            totals.totalPAYE += paye;
            totals.totalNetPay += netPay;
            totals.totalCostToBusiness += grossPay + employerSSNIT;
        });

        return { items: results, totals };
    }, [watchedItems, settings, employeeMap]);

    const handleFormSubmit = (data: FormValues) => {
        setIsSaving(true);
        
        let periodStartDate: Date | undefined;
        let periodEndDate: Date | undefined;

        if (filterType === 'wage') {
            periodStartDate = data.periodRange?.from;
            periodEndDate = data.periodRange?.to;
        } else {
            periodStartDate = data.periodRange?.from ? startOfMonth(data.periodRange.from) : undefined;
            periodEndDate = data.periodRange?.from ? endOfMonth(data.periodRange.from) : undefined;
        }
        
        if (!periodStartDate || !periodEndDate) {
            toast({ title: "Invalid Period", description: "Please select a valid pay period.", variant: "destructive" });
            setIsSaving(false);
            return;
        }

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
    
    const isWageMode = filterType === 'wage';
    
    if (employees.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">No employees found for the '{filterType}' filter.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)}>
            <Card>
                <CardHeader>
                    <CardTitle>Run Payroll: <span className="capitalize text-primary">{filterType}</span></CardTitle>
                    <CardDescription>
                        {isWageMode ? "Select a date range for this wage period." : "Select a month for this salary period."}
                    </CardDescription>
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                        <div>
                             <Label>Pay Period</Label>
                             <Controller name="periodRange" control={control} render={({ field }) => (
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value?.from ? (
                                                isWageMode ? (
                                                    field.value.to ? `${format(field.value.from, "LLL dd, y")} - ${format(field.value.to, "LLL dd, y")}` : format(field.value.from, "LLL dd, y")
                                                ) : format(field.value.from, "MMMM yyyy")
                                            ) : <span>Pick a period</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode={isWageMode ? "range" : "single"}
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            numberOfMonths={isWageMode ? 2 : 1}
                                            defaultMonth={field.value?.from}
                                        />
                                    </PopoverContent>
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
                                    <TableCell>{(payrollData.items[index]?.grossPay || 0).toFixed(2)}</TableCell>
                                    <TableCell>{(payrollData.items[index]?.employeeSSNIT || 0).toFixed(2)}</TableCell>
                                    <TableCell>{(payrollData.items[index]?.paye || 0).toFixed(2)}</TableCell>
                                    <TableCell className="font-bold">{(payrollData.items[index]?.netPay || 0).toFixed(2)}</TableCell>
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
