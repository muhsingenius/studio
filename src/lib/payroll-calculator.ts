
import type { PAYEBracket, SSNITRates } from "@/types";

export function calculateSSNIT(grossPay: number, rates: SSNITRates) {
    const employeeContribution = grossPay * rates.employeeContribution;
    const employerContribution = grossPay * rates.employerContribution;
    
    return {
        employeeSSNIT: employeeContribution,
        employerSSNIT: employerContribution,
    };
}

export function calculatePAYE(taxableIncome: number, brackets: PAYEBracket[]) {
    // Sort brackets by the 'from' value to ensure correct order
    const sortedBrackets = [...brackets].sort((a, b) => a.from - b.from);

    let totalTax = 0;
    let incomeLeft = taxableIncome;
    let previousLimit = 0;

    for (const bracket of sortedBrackets) {
        const bracketLimit = bracket.to ?? Infinity;
        if (incomeLeft <= 0) break;

        // Calculate the width of the current tax band
        const bandWidth = bracketLimit - previousLimit;

        // Determine how much of the remaining income falls into this band
        const taxableInBand = Math.min(incomeLeft, bandWidth);
        
        // Calculate tax for this portion of the income and add to total
        totalTax += taxableInBand * bracket.rate;
        
        // Reduce the remaining income
        incomeLeft -= taxableInBand;
        
        // Update the limit for the next iteration
        previousLimit = bracketLimit;
    }

    return totalTax;
}
