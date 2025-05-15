'use server';

/**
 * @fileOverview Summarizes product information from detailed descriptions and specifications.
 *
 * - summarizeProductInformation - A function that summarizes product information.
 * - SummarizeProductInformationInput - The input type for the summarizeProductInformation function.
 * - SummarizeProductInformationOutput - The return type for the summarizeProductInformation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProductInformationInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  productDescription: z.string().describe('A detailed description of the product.'),
  productSpecifications: z.string().describe('Technical specifications of the product.'),
});

export type SummarizeProductInformationInput = z.infer<typeof SummarizeProductInformationInputSchema>;

const SummarizeProductInformationOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the product information.'),
});

export type SummarizeProductInformationOutput = z.infer<typeof SummarizeProductInformationOutputSchema>;

export async function summarizeProductInformation(
  input: SummarizeProductInformationInput
): Promise<SummarizeProductInformationOutput> {
  return summarizeProductInformationFlow(input);
}

const summarizeProductInformationPrompt = ai.definePrompt({
  name: 'summarizeProductInformationPrompt',
  input: {schema: SummarizeProductInformationInputSchema},
  output: {schema: SummarizeProductInformationOutputSchema},
  prompt: `Summarize the key features and benefits of the following product for a product overview:

Product Name: {{{productName}}}
Description: {{{productDescription}}}
Specifications: {{{productSpecifications}}}`,
});

const summarizeProductInformationFlow = ai.defineFlow(
  {
    name: 'summarizeProductInformationFlow',
    inputSchema: SummarizeProductInformationInputSchema,
    outputSchema: SummarizeProductInformationOutputSchema,
  },
  async input => {
    const {output} = await summarizeProductInformationPrompt(input);
    return output!;
  }
);
