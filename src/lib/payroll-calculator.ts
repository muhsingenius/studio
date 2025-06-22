
'use server';

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
    let paye = 0;
    let remainingIncome = taxableIncome;

    // Sort brackets by the 'from' value to ensure correct order
    const sortedBrackets = [...brackets].sort((a, b) => a.from - b.from);

    for (const bracket of sortedBrackets) {
        if (remainingIncome <= 0) break;

        // The 'from' is cumulative, so we need to find the taxable amount in this specific band.
        const bracketMin = bracket.from;
        const bracketMax = bracket.to ?? Infinity;

        if (taxableIncome > bracketMin) {
            const incomeInThisBand = Math.min(taxableIncome - bracketMin, bracketMax - bracketMin);
            paye += incomeInThisBand * bracket.rate;
        }
    }
    
    // A simpler, more direct approach for Ghana's cumulative tax system
    let cumulativePaye = 0;
    let lastBracketMax = 0;

    for (const bracket of sortedBrackets) {
        if (taxableIncome > bracket.from) {
             const taxableInBand = Math.min(taxableIncome, bracket.to ?? taxableIncome) - bracket.from;
             if (taxableInBand > 0) {
                 cumulativePaye += taxableInBand * bracket.rate;
             }
        }
    }

    // Let's use an even clearer, non-cumulative band calculation which is easier to reason about.
    let totalTax = 0;
    let incomeLeft = taxableIncome;
    let previousLimit = 0;

    for (const bracket of sortedBrackets) {
        const bracketLimit = bracket.to ?? Infinity;
        if (incomeLeft <= 0) break;

        const bandWidth = bracketLimit - previousLimit;
        const taxableInBand = Math.min(incomeLeft, bandWidth);
        
        totalTax += taxableInBand * bracket.rate;
        incomeLeft -= taxableInBand;
        previousLimit = bracketLimit;
    }


    return totalTax;
}
