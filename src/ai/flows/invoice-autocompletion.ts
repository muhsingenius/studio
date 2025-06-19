'use server';

/**
 * @fileOverview AI agent to generate invoice descriptions based on provided data.
 *
 * - generateInvoiceText - A function that generates invoice text using AI.
 * - GenerateInvoiceTextInput - The input type for the generateInvoiceText function.
 * - GenerateInvoiceTextOutput - The return type for the generateInvoiceText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInvoiceTextInputSchema = z.object({
  companyDetails: z.string().describe('Details of the company issuing the invoice.'),
  customerInformation: z.string().describe('Information about the customer receiving the invoice.'),
  purchasedProducts: z.string().describe('List of purchased products or services with quantity and price.'),
  optionalData: z.string().optional().describe('Any optional additional data to include in the invoice description.'),
});
export type GenerateInvoiceTextInput = z.infer<typeof GenerateInvoiceTextInputSchema>;

const GenerateInvoiceTextOutputSchema = z.object({
  invoiceText: z.string().describe('The generated invoice text.'),
});
export type GenerateInvoiceTextOutput = z.infer<typeof GenerateInvoiceTextOutputSchema>;

export async function generateInvoiceText(input: GenerateInvoiceTextInput): Promise<GenerateInvoiceTextOutput> {
  return generateInvoiceTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvoiceTextPrompt',
  input: {schema: GenerateInvoiceTextInputSchema},
  output: {schema: GenerateInvoiceTextOutputSchema},
  prompt: `You are an expert in generating professional and legally sound VAT invoice texts for SMEs in Ghana.

  Given the following information, generate a comprehensive and accurate invoice description:

  Company Details: {{{companyDetails}}}
  Customer Information: {{{customerInformation}}}
  Purchased Products/Services: {{{purchasedProducts}}}
  Optional Data: {{{optionalData}}}

  Ensure the generated text is clear, concise, and includes all necessary details for a valid VAT invoice in Ghana.
  The invoice should include line items, descriptions, quantities, unit prices, subtotal, tax (VAT, NHIL, GETFund), and total.
  The generated invoice should have a professional tone and be ready for use without further editing.
  Remember to output the invoice in Ghana cedi (GHS).
  `,
});

const generateInvoiceTextFlow = ai.defineFlow(
  {
    name: 'generateInvoiceTextFlow',
    inputSchema: GenerateInvoiceTextInputSchema,
    outputSchema: GenerateInvoiceTextOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
